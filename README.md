<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1odN85dWJLnzH8dnt4lbflwNgcKWqXXwG

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Run as a macOS App

1. 启动桌面调试: `npm run desktop:dev`，该命令会并行启动 Vite 与 Electron。
2. 生成可分发的 `.dmg`: `npm run desktop:build`，输出位于 `release/` 目录。
3. 若使用 Apple Developer ID 进行签名/公证，请在运行 `desktop:build` 前配置好相关证书与密钥链。
