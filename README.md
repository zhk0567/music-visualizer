# 音乐可视化

基于 **Vite + TypeScript + Three.js + Web Audio API** 的浏览器端音乐可视化应用。支持本地音频文件与麦克风实时输入，提供频谱柱、波形环、粒子场三种 GPU 加速效果。

## 功能

- 本地音频文件上传与播放（循环）
- 麦克风实时输入
- 三种可视化模式：频谱 / 波形 / 粒子
- 播放 / 暂停、进度条、音量、灵敏度调节

## 环境要求

- Node.js 18+
- Chrome / Edge / Firefox 最新版（需 WebGL + Web Audio API）
- 麦克风功能需在 `localhost` 或 HTTPS 环境下使用

## 安装与运行

```powershell
cd F:\commercial\music-visualizer
npm install
npm run dev
```

浏览器访问 http://localhost:5173

## 构建

```powershell
npm run build
npm run preview
```

构建产物输出到 `dist/` 目录。

## 项目结构

```
├── index.html              # 入口页面
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/                 # 静态资源
└── src/
    ├── main.ts             # 应用入口
    ├── audio/
    │   └── AudioEngine.ts  # 音频解码、播放、分析
    ├── render/
    │   ├── Renderer.ts     # Three.js 渲染循环
    │   └── visualizers/    # 频谱 / 波形 / 粒子
    ├── ui/
    │   └── Controls.ts     # 控制面板
    └── styles/
        └── main.css
```

## 使用说明

1. 点击「选择文件」加载本地音频，或点击「麦克风」使用实时输入
2. 使用 ▶ / ⏸ 控制播放
3. 底部切换「频谱」「波形」「粒子」效果
4. 调节音量与灵敏度以获得最佳视觉反馈
