import { app, BrowserWindow, ipcMain, desktopCapturer, screen } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IS_DEV = process.env.NODE_ENV === 'development' || !app.isPackaged;
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:3000';
const WINDOW_WIDTH = 420;
const WINDOW_HEIGHT = 420;
const WINDOW_MIN_WIDTH = 420;
const WINDOW_MIN_HEIGHT = 320;
const APP_NAME = 'RecMind';

app.setName(APP_NAME);
let mainWindow = null;

/**
 * 创建并返回主窗口实例，同时根据当前主题设置背景色。
 * @returns {BrowserWindow}
 */
function createMainWindow() {
  /**
   * 获取应用图标路径。
   * 开发环境和生产环境都使用 public/ico.png
   */
  const iconPath = join(__dirname, '..', 'public', 'ico.png');
  
  const window = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    useContentSize: true,
    resizable: true,
    frame: false,
    transparent: true,
    fullscreenable: true,
    maximizable: true,
    minimizable: true,
    hasShadow: false,
    title: APP_NAME,
    icon: iconPath,
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
/**
 * 平滑调整窗口大小，使用动画过渡
 * @param {BrowserWindow} window - 目标窗口
 * @param {number} targetWidth - 目标宽度
 * @param {number} targetHeight - 目标高度
 * @param {number} duration - 动画持续时间（毫秒）
 */
function animateWindowSize(window, targetWidth, targetHeight, duration = 300) {
  if (!window || window.isDestroyed()) {
    return;
  }

  const [currentWidth, currentHeight] = window.getContentSize();
  const startTime = Date.now();
  const startWidth = currentWidth;
  const startHeight = currentHeight;
  const deltaWidth = targetWidth - startWidth;
  const deltaHeight = targetHeight - startHeight;

  // 如果尺寸没有变化，直接返回
  if (deltaWidth === 0 && deltaHeight === 0) {
    return;
  }

  /**
   * 缓动函数：ease-in-out
   * @param {number} t - 时间进度 (0-1)
   * @returns {number} - 缓动后的进度
   */
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  const frameInterval = 16; // 约 60fps
  let animationId = null;

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOut(progress);

    const newWidth = Math.round(startWidth + deltaWidth * easedProgress);
    const newHeight = Math.round(startHeight + deltaHeight * easedProgress);

    if (!window.isDestroyed()) {
      window.setContentSize(newWidth, newHeight);
    }

    if (progress < 1) {
      animationId = setTimeout(animate, frameInterval);
    } else {
      // 确保最终尺寸精确
      if (!window.isDestroyed()) {
        window.setContentSize(targetWidth, targetHeight);
      }
      animationId = null;
    }
  }

  animate();

  // 返回清理函数（如果需要提前停止动画）
  return () => {
    if (animationId !== null) {
      clearTimeout(animationId);
      animationId = null;
    }
  };
}

function registerIpcHandlers() {
  ipcMain.on('renderer-window-layout', (_event, payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    const requestedMinWidth = Math.round(payload?.minWidth ?? WINDOW_MIN_WIDTH);
    const requestedMinHeight = Math.round(payload?.minHeight ?? WINDOW_MIN_HEIGHT);
    const minWidth = Math.max(WINDOW_MIN_WIDTH, requestedMinWidth);
    const minHeight = Math.max(WINDOW_MIN_HEIGHT, requestedMinHeight);
    mainWindow.setMinimumSize(minWidth, minHeight);

    const targetWidth = payload?.width;
    const targetHeight = payload?.height;
    const animate = payload?.animate === true;
    const animationDuration = payload?.animationDuration ?? 300;

    if (typeof targetWidth === 'number' && typeof targetHeight === 'number') {
      const safeWidth = Math.max(minWidth, Math.round(targetWidth));
      const safeHeight = Math.max(minHeight, Math.round(targetHeight));
      
      // 检查屏幕边界
      const display = screen.getDisplayMatching(mainWindow.getBounds());
      const maxWidth = display.workAreaSize.width;
      const maxHeight = display.workAreaSize.height;
      const finalWidth = Math.min(safeWidth, maxWidth);
      const finalHeight = Math.min(safeHeight, maxHeight);

      if (animate) {
        animateWindowSize(mainWindow, finalWidth, finalHeight, animationDuration);
      } else {
        mainWindow.setContentSize(finalWidth, finalHeight);
      }
    }

    if (typeof payload?.resizable === 'boolean') {
      mainWindow.setResizable(payload.resizable);
      mainWindow.setMaximizable(payload.resizable);
    }

    if (typeof payload?.fullscreenable === 'boolean') {
      mainWindow.setFullScreenable(payload.fullscreenable);
      if (!payload.fullscreenable && mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
      }
    }
  });

  ipcMain.on('window-control', (_event, payload) => {
    handleRendererWindowControl(payload?.action);
  });

  /**
   * 设置窗口是否始终置顶。
   */
  ipcMain.on('set-always-on-top', (_event, payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    const alwaysOnTop = payload?.alwaysOnTop === true;
    mainWindow.setAlwaysOnTop(alwaysOnTop, 'floating', 1);
  });

  /**
   * 获取可用的屏幕源列表，供渲染进程使用 getUserMedia 捕获。
   * 只返回整个屏幕的源（screen 类型），不包含窗口。
   * 会返回当前窗口所在显示器的 ID，帮助渲染进程选择正确的屏幕。
   */
  ipcMain.handle('get-screen-sources', async () => {
    try {
      // 获取当前窗口所在的显示器（而不是主显示器）
      const allDisplays = screen.getAllDisplays();
      let targetDisplay = screen.getPrimaryDisplay();
      
      // 如果主窗口存在，获取窗口所在的显示器
      if (mainWindow && !mainWindow.isDestroyed()) {
        const windowBounds = mainWindow.getBounds();
        targetDisplay = screen.getDisplayMatching(windowBounds);
      }
      
      // 获取最大分辨率用于缩略图
      const maxWidth = Math.max(...allDisplays.map(d => d.size.width));
      const maxHeight = Math.max(...allDisplays.map(d => d.size.height));
      
      // 只获取屏幕源，不包含窗口
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: maxWidth, height: maxHeight },
        fetchWindowIcons: false
      });
      
      // 返回源列表，包含 id、name、类型和 display_id
      // display_id 用于匹配当前窗口所在的显示器
      const screenSources = sources.map(source => {
        // source.display_id 对应 screen.getAllDisplays() 中的 display.id
        const displayId = source.display_id;
        const isCurrentDisplay = displayId === String(targetDisplay.id);
        
        return {
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail.toDataURL(),
          type: 'screen',
          displayId: displayId,
          isCurrentDisplay: isCurrentDisplay,
          displayBounds: isCurrentDisplay ? targetDisplay.bounds : null
        };
      });
      
      // 优先排序：当前窗口所在显示器 > "Entire Screen" > 其他
      screenSources.sort((a, b) => {
        // 当前显示器优先
        if (a.isCurrentDisplay && !b.isCurrentDisplay) return -1;
        if (!a.isCurrentDisplay && b.isCurrentDisplay) return 1;
        
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName.includes('entire screen')) return -1;
        if (bName.includes('entire screen')) return 1;
        return aName.localeCompare(bName);
      });
      
      console.log('Screen sources found:', screenSources.map(s => ({
        name: s.name,
        displayId: s.displayId,
        isCurrentDisplay: s.isCurrentDisplay
      })));
      
      return screenSources;
    } catch (error) {
      console.error('Failed to get screen sources:', error);
      throw error;
    }
  });
}

/**
 * 根据渲染进程请求执行窗口控制动作。
 * @param {'close' | 'minimize' | 'toggle-fullscreen'} action
 */
function handleRendererWindowControl(action) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  switch (action) {
    case 'close':
      mainWindow.close();
      break;
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'toggle-fullscreen':
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      break;
    default:
      break;
  }
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

