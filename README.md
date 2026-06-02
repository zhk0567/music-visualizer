# 音乐可视化

基于 **Vite + TypeScript + Three.js + Web Audio API** 的浏览器端音乐可视化应用。

## 功能

- 本地音频文件 / 拖拽上传 / 内置示例 / 麦克风输入
- 三种可视化：频谱 / 波形 / 粒子
- 三套主题：霓虹 / 日落 / 极简
- Bloom 后处理、节拍驱动动画、频谱柱体（`MeshBasicMaterial` + `setColorAt`）
- 循环开关、画质档位（低/中/高）、截图、**视频录制**、全屏
- **命名预设**（含循环、分析器预设）
- 设置与 URL 参数持久化（`?mode=spectrum&theme=neon&quality=high&loop=true&sensitivity=1.5`）
- **PWA**：可安装到桌面，静态资源离线缓存
- 快捷键帮助（按 `?` 或 `Esc` 关闭）

## 界面布局

控制栏分为三层常驻区 + 折叠抽屉：

1. **顶栏**：当前音源、更换、帮助 `?`
2. **播放区**：文件 / 麦克风 / 播放 / 循环 / 静音 + 进度条
3. **视觉区**：频谱 / 波形 / 粒子 + 主题分段按钮
4. **更多设置**（默认折叠）：音量、灵敏度、节拍强度、画质、分析器、截图、录制、预设等

## 冒烟验证（频谱）

打开应用后默认应为 **频谱** 模式，无需播放即可看到：

- 一圈彩色柱体（轻微待机动画）
- 底部半透明圆环

点击「试听示例」或加载本地文件并播放后，柱体应随低频与节拍明显起伏。

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

## 构建与测试

```powershell
npm run generate-demo   # 生成 public/demo.wav
npm run build
npm run typecheck
npm run test
npm run preview
```

构建时会自动生成 `public/demo.wav`；也可放置 `public/demo.mp3` 优先加载。

## 第六轮更新摘要

- **频谱视觉**：加宽柱体、顶帽高光、对数低频映射、节拍亮度脉冲；频谱模式固定相机
- **控制栏**：毛玻璃、最大宽度居中、空状态底部留白、录制红点指示
- **产品**：`demo.wav` 生成脚本、录制前刷帧、节拍强度滑块、预设含 loop/分析器
- **测试**：Vitest 覆盖 `normalizeSettings` 白名单

## 浏览器兼容

- 推荐 Chrome / Edge / Firefox 最新版（需 WebGL + Web Audio）
- 视频录制需支持 `MediaRecorder` 与 `HTMLCanvasElement.captureStream`
