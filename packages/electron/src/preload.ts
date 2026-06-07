import { contextBridge, ipcRenderer } from 'electron';

/**
 * 通过 contextBridge 暴露安全的窗口控制 API 到渲染进程
 * 所有值必须可被结构化克隆（基本类型、普通对象、数组、void函数）
 * 不能有返回函数的方法，不能跨边界传递函数参数
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /** 最小化窗口 */
  minimize: () => { ipcRenderer.send('window:minimize'); },
  /** 最大化 / 还原窗口 */
  maximize: () => { ipcRenderer.send('window:maximize'); },
  /** 关闭窗口 */
  close: () => { ipcRenderer.send('window:close'); },
  /** 异步查询窗口是否已最大化 */
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
  /** 是否在 Electron 环境中运行 */
  isElectron: true,
});
