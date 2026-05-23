/**
 * 历史栈 Hook —— 支持 Undo / Redo。
 *
 * 用法：
 *   const [state, setState, { undo, redo, canUndo, canRedo, reset }] = useHistoryState(initial);
 *
 * 注：状态变更通过深拷贝快照入栈，因此请保证状态体积合理（流程树通常 <100KB 可安全使用）。
 */
import { useCallback, useMemo, useReducer } from 'react';

interface HistoryControls {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (next: unknown) => void;
}

const MAX_HISTORY = 50;

function clone<T>(value: T): T {
  return structuredClone(value);
}

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

type HistoryAction<T> =
  | { type: 'set'; resolver: (prev: T) => T }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; next: T };

function historyReducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
  // 防御性：HMR / 旧版 state 残留时，past / future 可能不存在，统一规整一次
  const safe: HistoryState<T> = {
    past: Array.isArray(state?.past) ? state.past : [],
    present: state?.present,
    future: Array.isArray(state?.future) ? state.future : [],
  };
  switch (action.type) {
    case 'set': {
      const resolved = action.resolver(safe.present);
      if (resolved === safe.present) return safe;
      const past = [...safe.past, clone(safe.present)];
      if (past.length > MAX_HISTORY) past.shift();
      return { past, present: resolved, future: [] };
    }
    case 'undo': {
      if (safe.past.length === 0) return safe;
      const past = safe.past.slice(0, -1);
      const present = safe.past.at(-1) ?? safe.present;
      return { past, present, future: [clone(safe.present), ...safe.future] };
    }
    case 'redo': {
      if (safe.future.length === 0) return safe;
      const [present, ...future] = safe.future;
      return { past: [...safe.past, clone(safe.present)], present, future };
    }
    case 'reset': {
      return { past: [], present: action.next, future: [] };
    }
    default:
      return safe;
  }
}

export function useHistoryState<T>(initial: T): [
  T,
  (next: T | ((prev: T) => T)) => void,
  HistoryControls,
] {
  const [state, dispatch] = useReducer(
    historyReducer as (s: HistoryState<T>, a: HistoryAction<T>) => HistoryState<T>,
    { past: [], present: initial, future: [] },
  );

  const set = useCallback((next: T | ((prev: T) => T)) => {
    const resolver = typeof next === 'function' ? (next as (p: T) => T) : () => next;
    dispatch({ type: 'set', resolver });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const reset = useCallback((next: unknown) => dispatch({ type: 'reset', next: next as T }), []);

  const pastLen = Array.isArray(state?.past) ? state.past.length : 0;
  const futureLen = Array.isArray(state?.future) ? state.future.length : 0;
  const present: T = state?.present ?? initial;

  const controls = useMemo<HistoryControls>(() => ({
    undo,
    redo,
    canUndo: pastLen > 0,
    canRedo: futureLen > 0,
    reset,
  }), [pastLen, futureLen, undo, redo, reset]);

  return [present, set, controls];
}
