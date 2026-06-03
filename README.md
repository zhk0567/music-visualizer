# 音乐可视化

基于 **Vite + TypeScript + Three.js + Web Audio API** 的浏览器端音乐可视化应用。

## 功能

- 本地音频文件 / 拖拽上传 / 内置示例 / 麦克风输入
- 四种可视化：频谱 / 波形 / 粒子 / 圆盘（极坐标频谱）
- 三套主题：霓虹 / 日落 / 极简
- Additive 霓虹发光、Bloom 后处理、节拍驱动动画
- 循环开关、画质档位（低/中/高）、截图、**视频录制**、全屏
- **命名预设**（含循环、分析器预设）
- 设置与 URL 参数持久化（`?mode=polar&theme=neon&quality=high&loop=true&sensitivity=1.5&beat=1.2`）
- **PWA**：可安装到桌面，静态资源离线缓存
- 快捷键帮助（按 `?` 或 `Esc` 关闭）

## 在线演示

推送 `master` 后，GitHub Actions 会自动部署到 GitHub Pages：

**https://zhk0567.github.io/music-visualizer/**

首次启用需在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions** 作为来源。

## 快速开始

```powershell
cd F:\commercial\music-visualizer
npm install
npm run dev
```

浏览器访问开发服务器地址（默认 http://localhost:5173）。

## 构建与测试

```powershell
npm run generate-demo   # 生成 public/demo.wav
npm run build
npm run typecheck
npm run test
npm run preview
```

构建时会自动生成 `public/demo.wav`；也可放置 `public/demo.mp3` 优先加载。

### GitHub Pages 本地预览

```powershell
$env:BASE_PATH='/music-visualizer/'; npm run build; npm run preview
```

## 最终验收清单

发布前请逐项确认：

- [ ] `npm run typecheck` / `npm run test` / `npm run build` 全部通过
- [ ] 在线 demo 可打开，默认频谱模式有待机动画
- [ ] 「试听示例」播放后四种模式（`1–4`）均随音乐响应
- [ ] 节拍强度、灵敏度刷新页面后仍保留
- [ ] 复制链接 URL 含 `mode` / `theme` / `beat` 等参数
- [ ] 截图与录制功能正常（Chrome / Edge 推荐）
- [ ] PWA 可安装（可选）
- [ ] 麦克风在 HTTPS 或 localhost 下可用

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
| 频谱 | 竖柱环 + 底环呼吸 | 柱高快攻慢释、低频/节拍明显、底环随 bass 脉冲 |
| 波形 | 细内环 + 轻呼吸 | 双层 shader 线径向起伏（幅度适中） |
| 粒子 | 几乎不可见 | 点云随频段扩张 + 节拍爆发径向 kick |
| 圆盘 | 径向瓣 + hub 待机 | 瓣体伸缩 + hub/ripple 强脉冲 |

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

## 项目结构

```
music-visualizer/
├── index.html              # 入口页面
├── public/                 # 静态资源（favicon、demo.wav、PWA manifest）
├── scripts/
│   └── generate-demo.mjs   # 生成试听示例音频
├── src/
│   ├── main.ts             # 应用入口
│   ├── audio/
│   │   ├── AudioEngine.ts  # 解码、播放、FFT/时域分析
│   │   └── BeatDetector.ts # 低频节拍检测
│   ├── render/
│   │   ├── Renderer.ts     # Three.js 渲染循环与模式切换
│   │   ├── modeProfiles.ts # 相机/Bloom/动态参数配置
│   │   ├── themes.ts       # 三套主题色
│   │   └── visualizers/    # 频谱、波形、粒子、圆盘
│   ├── ui/
│   │   └── Controls.ts     # 控制栏与快捷键
│   └── utils/
│       ├── settings.ts     # 设置持久化与 URL 同步
│       ├── presets.ts      # 命名预设
│       ├── quality.ts      # 画质档位
│       └── recorder.ts     # 画布录制
└── tests/
    ├── settings.test.ts
    ├── freqMapping.test.ts
    ├── modeProfiles.test.ts
    └── presets.test.ts
```

## 浏览器兼容

- 推荐 Chrome / Edge / Firefox 最新版（需 WebGL + Web Audio）
- 视频录制需支持 `MediaRecorder` 与 `HTMLCanvasElement.captureStream`

## 更新日志

版本历史与各轮优化详情见 [CHANGELOG.md](CHANGELOG.md)。

## License

[MIT](LICENSE) © 2026 zhk0567
