# 音乐可视化

基于 **Vite + TypeScript + Three.js + Web Audio API** 的浏览器端音乐可视化应用。

## 功能

- 本地音频文件 / 拖拽上传 / 内置示例 / 麦克风输入
- 三种可视化：频谱 / 波形 / 粒子
- 三套主题：霓虹 / 日落 / 极简
- Bloom 后处理、节拍驱动动画、Shader 波形环
- 循环开关、画质档位（低/中/高）、截图、全屏
- 设置与 URL 参数持久化（`?mode=spectrum&theme=neon&quality=high`）
- 快捷键帮助（按 `?`）

## 快捷键

| 按键 | 功能 |
|------|------|
| `Space` | 播放 / 暂停 |
| `1` / `2` / `3` | 频谱 / 波形 / 粒子 |
| `4` / `5` / `6` | 霓虹 / 日落 / 极简主题 |
| `F` | 全屏 |
| `M` | 静音 |
| `?` | 帮助面板 |

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
```

## 第三轮更新摘要

- 修复：循环关闭时进度正确、播放结束 UI 同步、idle 真正 20fps 降帧
- 麦克风软暂停（不再每次暂停都释放权限）
- SpectrumBars `onBeforeCompile` Shader 增强 + 画质关联柱体数量
- 内置示例音（无 demo.mp3 时自动生成）
- 截图含 Bloom、URL 参数分享、快捷键帮助面板
- 画质档位扩展：DPR / 柱数 / 波形段数联动

## 示例音频

可选：将 `demo.mp3` 放入 `public/` 目录；若无此文件，点击「试听示例」将使用内置合成示例。
