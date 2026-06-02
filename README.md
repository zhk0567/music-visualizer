# 音乐可视化

基于 **Vite + TypeScript + Three.js + Web Audio API** 的浏览器端音乐可视化应用。

## 功能

- 本地音频文件 / 拖拽上传 / 内置示例 / 麦克风输入
- 三种可视化：频谱 / 波形 / 粒子
- 三套主题：霓虹 / 日落 / 极简
- Bloom 后处理、节拍驱动动画、频谱柱体（实例颜色 + 光照）
- 循环开关、画质档位（低/中/高）、截图、**视频录制**、全屏
- **命名预设**（保存/切换/删除模式+主题+画质+灵敏度）
- 设置与 URL 参数持久化（`?mode=spectrum&theme=neon&quality=high&loop=true&sensitivity=1.5`）
- **PWA**：可安装到桌面，静态资源离线缓存
- 快捷键帮助（按 `?` 或 `Esc` 关闭）

## 界面布局

控制栏分为三层常驻区 + 折叠抽屉：

1. **顶栏**：当前音源、更换、帮助 `?`
2. **播放区**：文件 / 麦克风 / 播放 / 循环 / 静音 + 进度条
3. **视觉区**：频谱 / 波形 / 粒子 + 主题分段按钮
4. **更多设置**（默认折叠）：音量、灵敏度、画质、分析器、截图、录制、全屏、链接、预设

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

## 第五轮更新摘要

- **频谱修复**：恢复 `MeshStandardMaterial` + `instanceColor`（修复第四轮自定义 Shader 导致柱体不可见）
- **待机动画**：无音频时柱体轻微起伏；最小柱高与亮度下限
- **渲染逻辑**：idle 仍绘制画面；有音源时暂停也更新可视化
- **底环参考**：频谱模式增加半透明圆环，便于辨认布局
- **控制栏重组**：极简主栏 +「更多设置」折叠抽屉，减少按钮堆叠

## 示例音频

可选：将 `demo.mp3` 放入 `public/`；若无此文件，「试听示例」将使用内置合成音并提示。

## 浏览器兼容

- 推荐 Chrome / Edge / Firefox 最新版（需 WebGL + Web Audio）
- 视频录制需支持 `MediaRecorder` 与 `HTMLCanvasElement.captureStream`
