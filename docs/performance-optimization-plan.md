## RecMind 性能与安装包优化方案

本文档汇总现有应用在运行期性能与安装包体积两方面的优化方向，并给出建议的实施步骤与验证方法。整体目标是在**不改变现有页面布局、交互与视觉样式**的前提下，改善首屏体验、交互流畅度以及最终分发包大小。

---

### 1. 前端性能优化

1. **按需加载重型依赖**
   - 对 `Visualizer`, `html2canvas`, `jspdf`, `JSZip` 等仅在特定功能触发时才需要的模块改用 `import()` 懒加载或 `React.lazy` + `Suspense`。
   - 利用 Vite 的 `dynamic import` 自动分包，减少主 bundle 体积，提升首屏加载。

2. **拆分超大组件**
   - 将 `App.tsx` 中的笔记区、录音控制区、导出操作区、语言切换等拆分为独立组件，并通过 `React.memo` / `useMemo` / `useCallback` 限定重渲染范围。
   - 分离后便于针对各子模块做独立性能调优与单元测试。

3. **可视化渲染节流**
   - 将 `AnalyserNode` 的绘制逻辑迁移至独立的 `requestAnimationFrame` 循环，并在录音暂停/停止时终止循环，避免空转。
   - 结合 `useRef` 缓存频谱数据，必要时限制刷新率（例如每隔 2 帧更新一次图形）。

4. **时间与状态更新优化**
   - 使用 `performance.now()` + `requestAnimationFrame` 计算录音时长，移除每秒一次的 `setInterval`，减少定时器压力。
   - 对笔记路径中昂贵的计算（如按照时间排序、筛选图片）使用 `useMemo` 缓存。

5. **列表虚拟化 & 媒体懒加载**
   - 为笔记列表引入 `react-window` 等虚拟列表方案；当笔记条目包含截图或图片时，使用 `loading="lazy"` 与压缩后的缩略图。
   - 确保滚动容器在内容增多的情况下仍保持 60fps。

6. **CPU 密集型任务移至 Worker**
   - 将音频转码、ZIP/PDF 导出等长耗时任务挪到 Web Worker 或 Electron `BrowserWindow` 的独立线程，防止阻塞主线程。
   - 与主线程通过 `postMessage` 传递进度，保持 UI 响应。

---

### 2. 安装包体积优化

1. **Vite 构建分包**
   - 在 `vite.config.ts` 中配置 `build.rollupOptions.output.manualChunks`，把 `jspdf`, `html2canvas`, `jszip`, `i18next` 等拆成独立 chunk。
   - 结合懒加载策略，仅在实际使用场景下载对应代码。

2. **依赖精简与树摇**
   - 对 `lucide-react` 改为路径级引入（`import Icon from 'lucide-react/icons/mic'`），减少无用图标。
   - 为 `i18next`/`react-i18next` 设置 `sideEffects: false` 并确认仅加载所需语言 JSON。

3. **Electron 打包裁剪**
   - 按需构建目标平台：本地调试时只生成对应架构，正式发布时分别运行 `--mac arm64`、`--mac x64`、`--win x64` 等命令，避免在单次构建中打包全部架构。
   - 在 `files`/`extraResources` 配置中排除未使用的 `locales/*.pak`、`swiftshader`、`vk_*`、Windows 专属 DLL（在 macOS 包内）。

4. **资源压缩与 asar 优化**
   - 确保 `electron-builder` 的 `asar` 启用，并通过 `asarUnpack` 仅解压需要原始文件访问的模块。
   - 设定 `compression: "maximum"`，并在 `beforePack` 钩子执行 `npm prune --production` + `npm dedupe` 以剔除 dev 依赖与重复包。


---

### 3. 建议的推进顺序

1. **分析阶段**
   - 运行 `vite build --analyze` 或 `npx source-map-explorer dist/assets/*.js`，确认主 bundle 中的重型模块。
   - 使用 Chrome Performance Profiler / React Profiler 记录关键交互（开始录音、导出、滚动笔记）以确定卡顿点。

2. **实现阶段（建议迭代）**
   1. 引入懒加载 & manualChunks，验证首屏体积变化。
   2. 拆分 `App.tsx` 并 memo 化子组件。
   3. 优化录音定时器、可视化与 Worker 化任务。
   4. 调整 Electron build 配置与资源裁剪。

3. **验证阶段**
   - 对比前后 `dist` 体积、Electron 安装包大小、CPU/内存占用。
   - 在 macOS 与 Windows 上进行功能回归测试，确保布局与交互保持一致。

-

