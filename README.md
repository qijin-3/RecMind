# RecMind

<div align="center">

**面向中文用户的极简录音笔记前端伙伴，只需专注录音与笔记，剩下的交给你最熟悉的 AI 模型。**

[![macOS](https://img.shields.io/badge/macOS-10.15+-blue.svg)](https://www.apple.com/macos/)
[![Windows](https://img.shields.io/badge/Windows-10+-blue.svg)](https://www.microsoft.com/windows)
[![Electron](https://img.shields.io/badge/Electron-39.2.3-47848F.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6.svg)](https://www.typescriptlang.org/)

</div>

## 📝 RecMind 产品说明

### 一句话介绍

一款专为中文用户设计的轻量级录音笔记工具，让你用最简单的方式记录，再交给 AI 生成你想要的任何内容。

### 🎯 它是什么？

RecMind 是一个纯音频录制 + 实时笔记的小工具。它不录屏、不转写、不生成 AI 摘要，只专注于帮你完整记录会议、播客或任何值得保存的声音，并配上你的笔记和截图。随后，你可以把这些素材交给任意大语言模型（Gemini、千问、ChatGPT、Claude 等），让 AI 生成会议纪要、逐字稿、播客笔记或任何你需要的内容。

### 💡 为什么做它？

**灵感来源**  
项目灵感来自 Granola。

**痛点**  
- Granola不支持中文场景，没法完成中文场景下的录音和会议纪要  
- mac没有纯粹的录音app，只有录屏app或者播放器携带录音功能

### 🎨 产品定位

RecMind是极简录音笔记前端工具 + AI 大模型的最佳拍档。

**设计哲学**
- 专注录制：把录音和笔记做到最简单、最流畅
- 不做 AI（目前）：不内置转写或摘要，充分利用你最熟悉的大模型
- 开放生态：与所有 AI 模型天然兼容

**典型工作流**
1. RecMind 录音 + 实时笔记 + 截图  
2. 导出音频（M4A/WAV）与 PDF 笔记  
3. 上传到任意大模型（Gemini / 千问 / ChatGPT / Claude）  
4. 生成会议纪要、逐字稿、播客笔记等自定义内容

## ✨ 功能特性

### 🎙️ 录音功能
- **双音源录制**：支持麦克风（MIC）和系统音频（SYS）同时录制
- **实时可视化**：复古风格的音频频谱可视化器
- **录音控制**：支持暂停/继续、停止录音
- **录音时长显示**：实时显示录音时长

### 📝 笔记功能
- **实时笔记**：录音过程中可随时添加文字笔记
- **时间戳记录**：每条笔记自动记录相对时间戳
- **图片附件**：支持上传图片和屏幕截图
- **笔记编辑**：支持编辑和删除已有笔记
- **PDF 导出**：将笔记导出为 PDF 文档

### 📸 屏幕截图
- **一键截图**：快速捕获当前屏幕内容
- **自动添加**：截图自动添加到笔记中
- **多显示器支持**：智能识别当前窗口所在显示器

### 💾 导出功能
- **音频导出**：录音导出为 m4a 格式
- **PDF 导出**：笔记导出为 PDF 文档
- **打包下载**：自动打包音频和 PDF 为 ZIP 文件

### 🎨 界面设计
- **复古 Mac 风格**：经典的 Mac 窗口设计
- **迷你悬浮模式**：录音时可切换到迷你悬浮窗口
- **响应式布局**：根据功能自动调整窗口大小
- **多语言切换**：支持中英文界面

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

#### Web 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

#### 桌面应用开发模式

```bash
npm run desktop:dev
```

该命令会并行启动 Vite 开发服务器和 Electron 桌面应用。

### 构建生产版本

#### 构建 Web 版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

#### 构建桌面应用

**构建 Mac 版本：**
```bash
npm run desktop:build:mac
```

**构建 Windows 版本：**
```bash
npm run desktop:build:win
```

**构建所有平台：**
```bash
npm run desktop:build
```

构建产物将输出到 `release/` 目录：
- **Mac**: `RecMind-0.1.1-arm64.dmg` (Apple Silicon) 和 `RecMind-0.1.1.dmg` (Intel)
- **Windows**: `RecMind Setup 0.1.1.exe` (包含 x64 和 ia32)

## macOS 安装

1. 下载并打开 `RecMind.dmg`
2. 将 RecMind 拖动到 `应用程序` 文件夹
3. **首次启动需右键** RecMind 图标，选择“打开”，才能绕过 Gatekeeper
4. 完成一次上述步骤后，后续可直接双击运行

**遇到“已损坏”提示？**

在终端执行以下命令，再重新打开应用：

```bash
xattr -cr /Applications/RecMind.app
```

## 📦 项目结构

```
RecMind/
├── components/          # React 组件
│   ├── MacWindow.tsx    # Mac 风格窗口组件
│   └── Visualizer.tsx  # 音频可视化组件
├── electron/            # Electron 主进程
│   ├── main.js         # 主进程入口
│   └── preload.js      # 预加载脚本
├── hooks/               # React Hooks
│   └── useAudioRecorder.ts  # 音频录制 Hook
├── services/            # 业务服务
│   └── pdfService.ts       # PDF 导出服务
├── types/               # TypeScript 类型定义
├── App.tsx              # 主应用组件
├── index.tsx            # 应用入口
├── vite.config.ts       # Vite 配置
└── package.json         # 项目配置
```

## 🛠️ 技术栈

### 核心框架
- **React 19.2.0** - UI 框架
- **TypeScript 5.8.2** - 类型系统
- **Electron 39.2.3** - 桌面应用框架
- **Vite 6.2.0** - 构建工具

### 主要依赖
- **html2canvas** - HTML 转 Canvas
- **jspdf** - PDF 生成
- **jszip** - ZIP 文件处理
- **lucide-react** - 图标库

### 开发工具
- **electron-builder** - 应用打包
- **concurrently** - 并行执行命令
- **wait-on** - 等待服务就绪

## 🎯 使用指南

### 开始录音

1. 选择音源：点击 **MIC** 或 **SYS** 开关选择录音源
2. 开始录音：点击 **REC** 按钮开始录音
3. 控制录音：使用暂停/继续和停止按钮控制录音

### 添加笔记

1. 在录音过程中，点击笔记面板或使用快捷键打开笔记面板
2. 在输入框中输入笔记内容
3. 点击 **+** 按钮或按 Enter 键添加笔记

### 屏幕截图

1. 在录音过程中，点击相机图标按钮
2. 选择要截图的屏幕（Electron 环境）或使用浏览器 API（Web 环境）
3. 截图会自动添加到笔记中

### 导出内容

1. **导出音频**：录音结束后，点击 **SAVE** 按钮
   - 如果只有录音，直接下载 WAV 文件
   - 如果有笔记，自动打包为 ZIP 文件（包含音频和 PDF）

2. **导出 PDF**：在笔记面板中点击 **PDF** 按钮导出笔记为 PDF

## 🔧 配置说明

### 环境变量

创建 `.env.local` 文件（可选）：


### Electron 配置

桌面应用的配置在 `package.json` 的 `build` 字段中：

- **appId**: `com.recmind.desktop`
- **productName**: `RecMind`
- **输出目录**: `release/`

## 📈 性能优化计划

想了解正在进行和计划中的性能优化项，可查看 `docs/performance-optimization-plan.md`，里面记录了可视化渲染管线、内存占用以及打包体积等方面的优化路线图。

## 🐛 故障排除

### 录音权限问题

**macOS:**
- 系统设置 > 安全性与隐私 > 麦克风 > 允许 RecMind 访问

**Windows:**
- 设置 > 隐私 > 麦克风 > 允许应用访问麦克风

### 系统音频录制

- 在 Web 环境中，系统音频录制需要用户手动选择要共享的屏幕/窗口
- 在 Electron 环境中，会自动请求屏幕共享权限

### 构建问题

如果遇到 Electron 下载超时，可以使用国内镜像：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run desktop:build:mac
```

## 📄 许可证

本项目为私有项目。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📝 更新日志

### v0.1.1
- 🌐 引入 LanguageSwitcher，支持中英文界面即时切换
- 📈 新增性能优化计划文档并在 README 中提供链接
- 📝 文档与构建产物版本信息更新至 0.1.1

### v0.0.0
- ✨ 初始版本发布
- 🎙️ 支持麦克风和系统音频录制
- 📝 实时笔记功能
- 📸 屏幕截图功能
- 💾 PDF 和音频导出功能
- 🎨 复古 Mac 风格界面
- 🖥️ Mac 和 Windows 双平台支持

---

<div align="center">

**RecMind** - 让录音和笔记更简单

Made with ❤️ using React & Electron

</div>
