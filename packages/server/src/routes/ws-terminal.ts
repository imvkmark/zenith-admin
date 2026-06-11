import { Hono } from 'hono';
import type { UpgradeWebSocket } from 'hono/ws';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as inspector from 'node:inspector';
import * as pty from 'node-pty';
import { verifyToken } from '../lib/jwt';
import type { JwtPayload } from '../middleware/auth';
import { isTokenBlacklisted } from '../lib/session-manager';
import { isSuperAdmin, getUserPermissions } from '../lib/permissions';

/** 终端 shell 类型 */
type ShellType = 'powershell' | 'cmd' | 'bash';

/**
 * 根据前端选择的 shell 类型解析实际可执行文件与启动参数。
 * - Windows：powershell.exe / cmd.exe / Git Bash（自动探测安装路径）
 * - 其他平台：bash 或 $SHELL
 */
function resolveShell(type: string | undefined): { file: string; args: string[] } {
  if (os.platform() === 'win32') {
    switch (type as ShellType) {
      case 'cmd':
        return { file: process.env.COMSPEC ?? 'cmd.exe', args: [] };
      case 'bash': {
        const candidates = [
          process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Git', 'bin', 'bash.exe'),
          process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Git', 'bin', 'bash.exe'),
          process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'bin', 'bash.exe'),
        ].filter((p): p is string => Boolean(p));
        const bash = candidates.find((p) => {
          try { return fs.existsSync(p); } catch { return false; }
        });
        // 找到 Git Bash 用 login + interactive；否则回退 PowerShell
        if (bash) return { file: bash, args: ['--login', '-i'] };
        return { file: 'powershell.exe', args: [] };
      }
      case 'powershell':
      default:
        return { file: 'powershell.exe', args: [] };
    }
  }
  if (type === 'bash') return { file: '/bin/bash', args: [] };
  return { file: process.env.SHELL ?? '/bin/bash', args: [] };
}

/**
 * Web 终端 WebSocket 路由
 *
 * 端点：GET /api/ws/terminal?token=<accessToken>
 * 每个连接启动一个独立 pty 进程，连接断开时自动 kill，防止进程泄漏。
 * 权限：需要 `system:terminal:execute`（超级管理员自动拥有）。
 */
export function createWsTerminalRoute(upgradeWebSocket: UpgradeWebSocket) {
  const wsApp = new Hono();

  wsApp.get(
    '/',
    upgradeWebSocket(async (c) => {
      const token = c.req.query('token');
      const shellType = c.req.query('shell');
      let payload: JwtPayload | null = null;

      if (token) {
        try {
          payload = await verifyToken<JwtPayload>(token);
        } catch {
          payload = null;
        }
      }

      let ptyProcess: pty.IPty | null = null;

      return {
        async onOpen(_evt, ws) {
          if (!payload) {
            ws.close(4001, 'Unauthorized');
            return;
          }

          // 检查 token 黑名单
          if (payload.jti) {
            try {
              const blacklisted = await isTokenBlacklisted(payload.jti);
              if (blacklisted) {
                ws.close(4001, 'Session revoked');
                return;
              }
            } catch { /* Redis 不可用时放行 */ }
          }

          // 权限校验：超管 或 拥有 system:terminal:execute
          const isSA = isSuperAdmin(payload.roles);
          if (!isSA) {
            try {
              const perms = await getUserPermissions(payload.userId);
              if (!perms.includes('system:terminal:execute')) {
                ws.close(4003, 'Forbidden');
                return;
              }
            } catch {
              ws.close(4003, 'Forbidden');
              return;
            }
          }

          // ⚠️ node-pty 在 Windows 上与 Node Inspector（调试器）附加存在已知死锁：
          // 当 inspector 激活时调用 pty.spawn() 会同步阻塞、冻结整个 Node 事件循环，
          // 导致后端所有请求无响应。检测到调试器时拒绝启动 pty，避免卡死整个服务。
          // 正常开发请用 `npm run dev`（已通过 scripts/dev.mjs 剖离 inspector）。
          if (os.platform() === 'win32' && inspector.url() !== undefined) {
            ws.send(JSON.stringify({
              type: 'terminal:error',
              message:
                '检测到 Node 调试器（Inspector）已附加。Windows 下 node-pty 与调试器冲突会导致后端卡死，' +
                'Web 终端已自动禁用。请改用 `npm run dev` 运行后端（已自动剖离调试器）。',
            }));
            ws.close(1011, 'Inspector attached');
            return;
          }

          // 启动 pty 进程（按前端选择的 shell 类型解析可执行文件）
          const { file: shellFile, args: shellArgs } = resolveShell(shellType);

          try {
            ptyProcess = pty.spawn(shellFile, shellArgs, {
              name: 'xterm-256color',
              cols: 80,
              rows: 24,
              cwd: process.env.HOME ?? process.cwd(),
              env: process.env,
            });

            ptyProcess.onData((data) => {
              try {
                ws.send(JSON.stringify({ type: 'terminal:output', data }));
              } catch { /* ws 可能已关闭 */ }
            });

            ptyProcess.onExit(() => {
              try {
                ws.send(JSON.stringify({ type: 'terminal:exit' }));
                ws.close(1000, 'Process exited');
              } catch { /* ignore */ }
              ptyProcess = null;
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            ws.send(JSON.stringify({ type: 'terminal:error', message: `启动终端失败: ${msg}` }));
            ws.close(1011, 'Failed to start terminal');
          }
        },

        onMessage(evt, _ws) {
          if (!ptyProcess) return;
          try {
            const raw: unknown = typeof evt.data === 'string' ? JSON.parse(evt.data) : null;
            if (!raw || typeof raw !== 'object') return;
            const msg = raw as { type: string; data?: string; cols?: number; rows?: number };

            if (msg.type === 'terminal:input' && typeof msg.data === 'string') {
              ptyProcess.write(msg.data);
            } else if (msg.type === 'terminal:resize' && msg.cols && msg.rows) {
              ptyProcess.resize(
                Math.max(1, msg.cols),
                Math.max(1, msg.rows),
              );
            } else if (msg.type === 'terminal:close') {
              ptyProcess.kill();
              ptyProcess = null;
            }
          } catch { /* ignore malformed */ }
        },

        onClose() {
          if (ptyProcess) {
            ptyProcess.kill();
            ptyProcess = null;
          }
        },
      };
    }),
  );

  return wsApp;
}
