# 音乐可视化

基于 **Vite + TypeScript + Three.js + Web Audio API** 的浏览器端音乐可视化应用。

## 功能

- 本地音频文件 / 拖拽上传 / 内置示例 / 麦克风输入
- 四种可视化：频谱 / 波形 / 粒子 / 圆盘（极坐标频谱）
- 三套主题：霓虹 / 日落 / 极简
- Additive 霓虹发光、Bloom 后处理、节拍驱动动画
- 循环开关、画质档位（低/中/高）、截图、**视频录制**、全屏
- **命名预设**（含循环、分析器预设）
- 设置与 URL 参数持久化（`?mode=polar&theme=neon&quality=high&loop=true&sensitivity=1.5`）
- **PWA**：可安装到桌面，静态资源离线缓存
- 快捷键帮助（按 `?` 或 `Esc` 关闭）

## 界面布局

控制栏分为三层常驻区 + 折叠抽屉：

1. **顶栏**：当前音源、更换、帮助 `?`
2. **播放区**：文件 / 麦克风 / 播放 / 循环 / 静音 + 进度条
3. **视觉区**：频谱 / 波形 / 粒子 / 圆盘 + 主题分段按钮
4. **更多设置**（默认折叠）：音量、灵敏度、节拍强度、画质、分析器、截图、录制、预设等

## 冒烟验证

打开应用后默认应为 **频谱** 模式，无需播放即可看到彩色柱环与待机动画。

| 模式 | 未播放时 | 播放后 |
|------|----------|--------|
| 频谱 | 竖柱环 + 底环呼吸 | 柱体随低频/节拍起伏 |
| 波形 | 发光环形波形 + 底环 | 波形径向脉动 |
| 粒子 | 星尘 + 中心光晕漂移 | 粒子随频段扩散 |
| 圆盘 | 俯视瓣状频谱待机 | 径向柱体向外延伸 |

点击「试听示例」或加载本地文件并播放后，各模式应随音乐明显响应。

## 快捷键

| 按键 | 功能 |
|------|------|
| `Space` | 播放 / 暂停 |
| `1` / `2` / `3` / `4` | 频谱 / 波形 / 粒子 / 圆盘 |
| `Shift+4` / `Shift+5` / `Shift+6` | 霓虹 / 日落 / 极简主题 |
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

## 第七轮更新摘要

- **视觉统一**：波形 Additive 双层线 + 光晕环 + 待机呼吸；粒子提亮 + 中心/地面光晕 + idle 漂移
- **渲染编排**：[`modeProfiles.ts`](src/render/modeProfiles.ts) 按模式分档雾效、Bloom、相机 preset
- **圆盘模式**：俯视极坐标频谱（`PolarSpectrum`），瓣状径向柱体
- **快捷键**：`1–4` 切换可视化，`Shift+4/5/6` 切换主题

## 第六轮更新摘要

- **频谱视觉**：顶帽高光、对数低频映射、节拍亮度脉冲
- **控制栏**：毛玻璃、最大宽度居中、空状态底部留白、录制红点指示
- **产品**：`demo.wav` 生成脚本、节拍强度滑块、预设含 loop/分析器
- **测试**：Vitest 覆盖 `normalizeSettings` 白名单

## 浏览器兼容

- 推荐 Chrome / Edge / Firefox 最新版（需 WebGL + Web Audio）
- 视频录制需支持 `MediaRecorder` 与 `HTMLCanvasElement.captureStream`
