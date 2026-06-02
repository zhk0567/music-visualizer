# 音乐可视化

基于 **Vite + TypeScript + Three.js + Web Audio API** 的浏览器端音乐可视化应用。

## 功能

- 本地音频文件 / 拖拽上传 / 内置示例 / 麦克风输入
- 三种可视化：频谱 / 波形 / 粒子
- 三套主题：霓虹 / 日落 / 极简
- Bloom 后处理、节拍驱动动画、频谱独立 ShaderMaterial
- 循环开关、画质档位（低/中/高）、截图、**视频录制**、全屏
- **命名预设**（保存/切换/删除模式+主题+画质+灵敏度）
- 设置与 URL 参数持久化（`?mode=spectrum&theme=neon&quality=high&loop=true&sensitivity=1.5`）
- **PWA**：可安装到桌面，静态资源离线缓存
- 快捷键帮助（按 `?` 或 `Esc` 关闭）

## 快捷键

| 按键 | 功能 |
|------|------|
| `Space` | 播放 / 暂停 |
| `1` / `2` / `3` | 频谱 / 波形 / 粒子 |
| `4` / `5` / `6` | 霓虹 / 日落 / 极简主题 |
| `F` | 全屏 |
| `M` | 静音 |
| `?` | 帮助面板 |
| `Esc` | 关闭帮助 |

## 运行

```powershell
cd F:\commercial\music-visualizer
npm install
npm run dev
```

## 构建

```powershell
npm run build
npm run typecheck
npm run preview
```

构建产物会拆分为 `three`、`three-postprocessing` 与主包，降低首屏加载体积。

## 第四轮更新摘要

- **真 idle 节流**：空闲时用 `setTimeout(50ms)` 调度，跳过视觉更新与 tick
- **SpectrumBars**：完整 `ShaderMaterial`，预计算颜色缓存
- **视频录制**：`canvas.captureStream` + MediaRecorder（webm）
- **PWA**：`vite-plugin-pwa` + manifest
- **预设系统**：localStorage 命名预设
- **URL 分享**：扩展 `loop`/`sensitivity`，「复制链接」按钮
- **无障碍**：`aria-pressed`、`aria-live`、帮助层 dialog
- **移动 UX**：更大进度条触摸区；麦克风模式禁用循环/进度
- **分析器控件**：灵敏 / 平滑独立切换
- **播放结束** toast 提示

## 示例音频

可选：将 `demo.mp3` 放入 `public/`；若无此文件，「试听示例」将使用内置合成音并提示。

## 浏览器兼容

- 推荐 Chrome / Edge / Firefox 最新版（需 WebGL + Web Audio）
- 视频录制需支持 `MediaRecorder` 与 `HTMLCanvasElement.captureStream`
