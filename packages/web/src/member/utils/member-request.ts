import { Toast } from '@douyinfe/semi-ui';
import { MEMBER_TOKEN_KEY, MEMBER_REFRESH_TOKEN_KEY } from '@zenith/shared';
import type { ApiResponse } from '@zenith/shared';
import { config } from '@/config';

/**
 * 会员前台专用 HTTP 客户端（与后台 admin request 完全隔离）。
 * - 携带独立的会员 token（MEMBER_TOKEN_KEY）
 * - 401 自动走 /api/member/auth/refresh 刷新，失败跳转会员登录页
 * - HashRouter 入口：登录页为 /member.html#/login
 */

export interface MemberRequestOptions {
  /** 静默模式：为 true 时不自动弹出错误提示，由调用方自行处理 */
  silent?: boolean;
  /** 跳过 401 自动刷新/跳转：401 直接返回响应体（用于旧密码校验等场景） */
  skipAuth?: boolean;
}

function memberLoginUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') || '';
  return `${base}/member.html#/login`;
}

class MemberRequest {
  private readonly baseUrl: string;
  private refreshing: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(body?: BodyInit | null): HeadersInit {
    const headers: HeadersInit = {};
    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem(MEMBER_TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (this.refreshing) return this.refreshing;

    this.refreshing = (async () => {
      const refreshToken = localStorage.getItem(MEMBER_REFRESH_TOKEN_KEY);
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${this.baseUrl}/api/member/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (data.code === 0 && data.data?.accessToken) {
          localStorage.setItem(MEMBER_TOKEN_KEY, data.data.accessToken);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this.refreshing = null;
      }
    })();

    return this.refreshing;
  }

  private clearAndRedirect(): void {
    localStorage.removeItem(MEMBER_TOKEN_KEY);
    localStorage.removeItem(MEMBER_REFRESH_TOKEN_KEY);
    globalThis.location.href = memberLoginUrl();
  }

  async request<T>(url: string, options: RequestInit & MemberRequestOptions = {}): Promise<ApiResponse<T>> {
    const { silent, skipAuth, ...fetchOptions } = options;
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${url}`, {
        ...fetchOptions,
        headers: { ...this.getHeaders(fetchOptions.body), ...fetchOptions.headers },
      });
    } catch {
      const errResp = { code: -1, message: '网络请求失败，请检查网络连接', data: null as unknown as T };
      if (!silent) Toast.error(errResp.message);
      return errResp;
    }

    if (res.status === 401) {
      if (skipAuth) {
        try {
          return await res.json() as ApiResponse<T>;
        } catch {
          return { code: 401, message: '未授权', data: null as unknown as T };
        }
      }
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        try {
          res = await fetch(`${this.baseUrl}${url}`, {
            ...fetchOptions,
            headers: { ...this.getHeaders(fetchOptions.body), ...fetchOptions.headers },
          });
        } catch {
          const errResp = { code: -1, message: '网络请求失败，请检查网络连接', data: null as unknown as T };
          if (!silent) Toast.error(errResp.message);
          return errResp;
        }
        if (res.status === 401) {
          this.clearAndRedirect();
          throw new Error('Unauthorized');
        }
      } else {
        this.clearAndRedirect();
        throw new Error('Unauthorized');
      }
    }

    if (res.status === 429) {
      try {
        const data = await res.json() as ApiResponse<T>;
        if (!silent) Toast.error(data.message || '请求过于频繁，请稍后再试');
        return data;
      } catch {
        const msg = '请求过于频繁，请稍后再试';
        if (!silent) Toast.error(msg);
        return { code: 429, message: msg, data: null as unknown as T };
      }
    }

    try {
      const data: ApiResponse<T> = await res.json();
      if (data.code !== 0 && !silent) {
        Toast.error(data.message || '操作失败');
      }
      return data;
    } catch {
      const errResp = { code: -1, message: '响应解析失败', data: null as unknown as T };
      if (!silent) Toast.error(errResp.message);
      return errResp;
    }
  }

  get<T>(url: string, opts: MemberRequestOptions = {}) {
    return this.request<T>(url, { method: 'GET', ...opts });
  }

  post<T>(url: string, body?: unknown, opts: MemberRequestOptions = {}) {
    return this.request<T>(url, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), ...opts });
  }

  put<T>(url: string, body?: unknown, opts: MemberRequestOptions = {}) {
    return this.request<T>(url, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body), ...opts });
  }

  delete<T>(url: string, body?: unknown, opts: MemberRequestOptions = {}) {
    const bodyInit = body === undefined ? {} : { body: JSON.stringify(body) };
    return this.request<T>(url, { method: 'DELETE', ...bodyInit, ...opts });
  }
}

export const memberRequest = new MemberRequest(config.apiBaseUrl);
