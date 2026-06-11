import { useState, useCallback } from 'react';
import { Button, Tabs, Typography, Space, Dropdown } from '@douyinfe/semi-ui';
import { Plus, TerminalSquare, ChevronDown } from 'lucide-react';
import TerminalTab, { type ShellType } from './TerminalTab';
import { useThemeController } from '@/providers/theme-controller';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

const SHELL_LABELS: Record<ShellType, string> = {
  powershell: 'PowerShell',
  cmd: 'Command Prompt',
  bash: 'Git Bash',
};

interface Session {
  id: string;
  title: string;
  shell: ShellType;
}

let sessionCounter = 1;

function DemoNotice() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 12,
        color: 'var(--semi-color-text-2)',
      }}
    >
      <TerminalSquare size={48} strokeWidth={1.2} style={{ opacity: 0.4 }} />
      <Typography.Title heading={5} style={{ margin: 0 }}>Web 终端</Typography.Title>
      <Typography.Text type="tertiary">演示模式下终端功能不可用</Typography.Text>
    </div>
  );
}

export default function TerminalPage() {
  const { isDark } = useThemeController();
  const [sessions, setSessions] = useState<Session[]>([
    { id: String(sessionCounter), title: SHELL_LABELS.powershell, shell: 'powershell' },
  ]);
  const [activeId, setActiveId] = useState(String(sessionCounter));

  const addSession = useCallback((shell: ShellType) => {
    sessionCounter += 1;
    const id = String(sessionCounter);
    setSessions((prev) => [...prev, { id, title: SHELL_LABELS[shell], shell }]);
    setActiveId(id);
  }, []);

  const removeSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        sessionCounter += 1;
        const newId = String(sessionCounter);
        setActiveId(newId);
        return [{ id: newId, title: SHELL_LABELS.powershell, shell: 'powershell' }];
      }
      return next;
    });
    setActiveId((prev) => {
      if (prev !== id) return prev;
      const idx = sessions.findIndex((s) => s.id === id);
      const remaining = sessions.filter((s) => s.id !== id);
      return remaining[Math.max(0, idx - 1)]?.id ?? remaining[0]?.id ?? prev;
    });
  };

  if (IS_DEMO) return <DemoNotice />;

  const shellMenu = (
    <Dropdown.Menu>
      {(Object.keys(SHELL_LABELS) as ShellType[]).map((sh) => (
        <Dropdown.Item key={sh} onClick={() => addSession(sh)}>
          {SHELL_LABELS[sh]}
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  );

  const tabBarExtra = (
    <Space spacing={2} style={{ paddingRight: 8 }}>
      <Button
        icon={<Plus size={13} />}
        size="small"
        theme="borderless"
        type="tertiary"
        onClick={() => addSession('powershell')}
        title="新建终端（PowerShell）"
      />
      <Dropdown trigger="click" position="bottomRight" render={shellMenu}>
        <Button
          icon={<ChevronDown size={13} />}
          size="small"
          theme="borderless"
          type="tertiary"
          title="选择 Shell 类型"
        />
      </Dropdown>
    </Space>
  );

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: isDark ? '#1e1e2e' : '#ffffff',
        overflow: 'hidden',
      }}
    >
      <Tabs
        activeKey={activeId}
        onChange={setActiveId}
        onTabClose={removeSession}
        tabBarExtraContent={tabBarExtra}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        contentStyle={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: 0 }}
        tabBarStyle={{
          background: isDark ? '#181825' : '#f3f3f3',
          borderBottom: `1px solid ${isDark ? '#313244' : '#e0e0e0'}`,
          padding: '0 8px',
          margin: 0,
          flexShrink: 0,
        }}
      >
        {sessions.map((s) => (
          <Tabs.TabPane
            key={s.id}
            itemKey={s.id}
            tab={
              <Space spacing={6}>
                <TerminalSquare size={12} />
                <span>{s.title}</span>
              </Space>
            }
            closable={sessions.length > 1}
          >
            <div style={{ width: '100%', height: '100%', padding: '8px 4px 4px' }}>
              <TerminalTab
                sessionId={s.id}
                active={activeId === s.id}
                shell={s.shell}
              />
            </div>
          </Tabs.TabPane>
        ))}
      </Tabs>
    </div>
  );
}
