/**
 * useMediaQuery / useIsMobile hook 单元测试
 *
 * 覆盖要点：
 *  1. 首次渲染同步读取 matchMedia().matches（无闪烁）
 *  2. media query 的 `change` 事件触发后值更新
 *  3. 卸载时移除监听
 *  4. useIsMobile 使用 md 断点（max-width: 767px）
 *  5. matchMedia 不存在时安全返回 false
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsMobile } from './useMediaQuery';
import { mediaDown } from '@/lib/breakpoints';

type ChangeHandler = (event: MediaQueryListEvent) => void;

function installMatchMedia(initialMatches: boolean) {
  const handlers = new Set<ChangeHandler>();
  let currentMatches = initialMatches;
  let lastQuery = '';

  const matchMedia = vi.fn((query: string) => {
    lastQuery = query;
    return {
      get matches() {
        return currentMatches;
      },
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_event: string, handler: ChangeHandler) => handlers.add(handler),
      removeEventListener: (_event: string, handler: ChangeHandler) => handlers.delete(handler),
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  });

  Object.defineProperty(globalThis, 'matchMedia', { writable: true, configurable: true, value: matchMedia });

  return {
    matchMedia,
    getQuery: () => lastQuery,
    getHandlerCount: () => handlers.size,
    emit(next: boolean) {
      currentMatches = next;
      for (const handler of handlers) handler({ matches: next } as MediaQueryListEvent);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('首次渲染同步返回 matchMedia().matches', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(true);
  });

  it('change 事件触发后值更新', () => {
    const mm = installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(false);

    act(() => mm.emit(true));
    expect(result.current).toBe(true);

    act(() => mm.emit(false));
    expect(result.current).toBe(false);
  });

  it('卸载时移除监听', () => {
    const mm = installMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(mm.getHandlerCount()).toBe(1);
    unmount();
    expect(mm.getHandlerCount()).toBe(0);
  });

  it('matchMedia 不存在时安全返回 false', () => {
    Object.defineProperty(globalThis, 'matchMedia', { writable: true, configurable: true, value: undefined });
    const { result } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(false);
  });
});

describe('useIsMobile', () => {
  it('使用 md 断点 (max-width: 767px)', () => {
    const mm = installMatchMedia(false);
    renderHook(() => useIsMobile());
    expect(mm.getQuery()).toBe(mediaDown('md'));
    expect(mm.getQuery()).toBe('(max-width: 767px)');
  });
});
