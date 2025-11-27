import { contextBridge, ipcRenderer } from 'electron';

/**
 * 暴露经过白名单过滤的API供渲染进程访问，避免直接触达Node能力。
 */
function setupRendererBridge() {
  contextBridge.exposeInMainWorld('desktop', {
    platform: process.platform,
    version: process.env.npm_package_version ?? '0.1.1',
    send: (channel, payload) => ipcRenderer.send(channel, payload),
    on: (channel, listener) => {
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  });
}

setupRendererBridge();

