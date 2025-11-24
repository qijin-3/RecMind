import { app, BrowserWindow, nativeTheme } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IS_DEV = process.env.NODE_ENV === 'development' || !app.isPackaged;
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:3000';

/**
 * 创建并返回主窗口实例，同时根据当前主题设置背景色。
 * @returns {BrowserWindow}
 */
function createMainWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 832,
    minWidth: 960,
    minHeight: 600,
    title: 'RecMind',
    vibrancy: 'under-window',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#000000' : '#FFFFFF',
    trafficLightPosition: { x: 16, y: 16 },
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  void loadWindowContent(window);
  return window;
}

/**
 * 根据当前运行环境加载对应的渲染进程资源。
 * @param {BrowserWindow} targetWindow
 */
async function loadWindowContent(targetWindow) {
  if (IS_DEV) {
    await targetWindow.loadURL(DEV_SERVER_URL);
    targetWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await targetWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'));
  }
}

/**
 * 统一注册应用生命周期相关事件，确保macOS体验一致。
 */
function registerAppEventHandlers() {
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

app.whenReady()
  .then(() => {
    createMainWindow();
    registerAppEventHandlers();
  })
  .catch((error) => {
    console.error('Electron 启动失败:', error);
  });

