import { useState, useCallback, useContext, createContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { PREFERENCES_KEY } from '@zenith/shared';
import { request } from '@/utils/request';
import type { ThemeMode } from '@/hooks/useTheme';

export type NavLayout = 'vertical' | 'horizontal' | 'mixed';
export type TabAnimation = 'none' | 'fade' | 'slide' | 'scale';

export interface UserPreferences {
  enableTabs: boolean;
  tabsMaxCount: number;
  showTabIcon: boolean;
  navLayout: NavLayout;
  showBreadcrumb: boolean;
  tabAnimation: TabAnimation;
  colorMode: ThemeMode;
  themeColor: string;
  showMenuSearch: boolean;
  showFullscreen: boolean;
  showQuickChat: boolean;
  filesViewMode: 'list' | 'grid';
  sidebarStickyScroll: boolean;
  showTableColumnSettings: boolean;
}

export const defaultPreferences: UserPreferences = {
  enableTabs: true,
  tabsMaxCount: 20,
  showTabIcon: true,
  navLayout: 'vertical',
  showBreadcrumb: false,
  tabAnimation: 'fade',
  colorMode: 'light',
  themeColor: 'blue',
  showMenuSearch: true,
  showFullscreen: true,
  showQuickChat: true,
  filesViewMode: 'list',
  sidebarStickyScroll: true,
  showTableColumnSettings: true,
};

function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (raw) {
      return { ...defaultPreferences, ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return { ...defaultPreferences };
}

function savePreferences(prefs: UserPreferences) {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    const base = raw ? JSON.parse(raw) : {};
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...base, ...prefs }));
  } catch {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  }
}

interface PreferencesContextValue {
  preferences: UserPreferences;
  setPreferences: (partial: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function useOptionalPreferences() {
  return useContext(PreferencesContext);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences);
  // 标记偏好变更是否来自服务器拉取，跳过回写避免 echo
  const skipNextSyncRef = useRef(false);
  // 跳过首次 localStorage 初始加载（不 PUT）
  const initializedRef = useRef(false);

  // 组件挂载时（用户已登录）从服务器拉取偏好，覆盖本地缓存
  useEffect(() => {
    request.get<Record<string, unknown> | null>('/api/auth/preferences', { silent: true })
      .then((res) => {
        if (res.code === 0 && res.data) {
          skipNextSyncRef.current = true;
          const merged = { ...defaultPreferences, ...(res.data as Partial<UserPreferences>) };
          setPrefs(merged);
          savePreferences(merged);
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  // 监听 prefs 变化，防抖写服务器
  useEffect(() => {
    // 跳过初始 localStorage 加载
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    // 跳过服务器拉取触发的变更（避免 echo）
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      request.put('/api/auth/preferences', prefs, { silent: true }).catch(() => { /* ignore */ });
    }, 500);
    return () => clearTimeout(timer);
  }, [prefs]);

  const setPreferences = useCallback((partial: Partial<UserPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePreferences(next);
      return next;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    localStorage.removeItem(PREFERENCES_KEY);
    skipNextSyncRef.current = true; // 跳过 effect，手动直接写服务器
    setPrefs({ ...defaultPreferences });
    request.put('/api/auth/preferences', defaultPreferences, { silent: true }).catch(() => { /* ignore */ });
  }, []);

  const value = useMemo(
    () => ({ preferences: prefs, setPreferences, resetPreferences }),
    [prefs, setPreferences, resetPreferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}
