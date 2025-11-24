import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IS_DEV = process.env.NODE_ENV === 'development' || !app.isPackaged;
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:3000';
const WINDOW_WIDTH = 420;
const WINDOW_HEIGHT = 720;
let mainWindow = null;

/**
 * 创建并返回主窗口实例，同时根据当前主题设置背景色。
 * @returns {BrowserWindow}
 */
function createMainWindow() {
  const window = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: WINDOW_WIDTH,
    minHeight: WINDOW_HEIGHT,
    useContentSize: true,
    resizable: false,
    frame: false,
    transparent: true,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    hasShadow: false,
    title: 'RecMind',
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  window.on('closed', () => {
    mainWindow = null;
  });

  void loadWindowContent(window);
  mainWindow = window;
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

/**
 * 注册渲染进程可用的 IPC 事件，用于根据内容尺寸动态调整窗口。
 */
function registerIpcHandlers() {
  ipcMain.on('renderer-window-size', (_event, payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    const width = Math.max(320, Math.round(payload?.width ?? WINDOW_WIDTH));
    const height = Math.max(400, Math.round(payload?.height ?? WINDOW_HEIGHT));
    mainWindow.setContentSize(width, height);
  });
}

app.whenReady()
  .then(() => {
    createMainWindow();
    registerAppEventHandlers();
    registerIpcHandlers();
  })
  .catch((error) => {
    console.error('Electron 启动失败:', error);
  });

