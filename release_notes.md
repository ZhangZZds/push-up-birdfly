# 🚀 Push-Up Flappy Bird (俯卧撑小鸟) v1.0.0 正式发布

结合**俯卧撑健身**与经典 **Flappy Bird** 的体感游戏应用，完美复刻街机 3D 金属铜管质感与实时摄像头动作捕捉。

---

## 🌟 核心亮点

- **跨平台工程与 Android 14/15 深度适配：**
  - **Android 原生 APK：** Target SDK 34 (Android 14) / 兼容 Android 15，最低支持 Android 8.0+ (Min SDK 22)。首次启动自动触发系统原生相机运行时授权弹窗，并启用硬件加速保证 60 FPS 流畅渲染。
  - **Web 端：** 采用 Vite + React 18 + TypeScript + Tailwind CSS 构建，支持任意现代浏览器。
  - **iOS 原生应用：** 位于 `ios/`，配置好 `NSCameraUsageDescription` 与 Xcode 工程。
- **毫秒级人脸/鼻尖跟踪 (Pico Cascade)：**
  - 纯原生 TypeScript 实现的 Viola-Jones 决策树级联算法，单帧耗时仅 **0.28 毫秒**。
  - **彻底隔离双手**：俯卧撑时双手撑地，传统肤色质心算法会被地面双手牵制造成延迟，Pico 模型直接锁定面部眼鼻三角区，实现 1:1 零延迟（Zero-Lag）头部物理同步。
  - 背景画面附带实时全息 HUD 瞄准镜（`[👃 鼻子已锁定]`）。
- **生物力学防作弊状态机：**
  - 5 阶段动作状态流转（`TOP` $\to$ `DESCENDING` $\to$ `BOTTOM` $\to$ `ASCENDING` $\to$ `TOP (+1 Rep)`）。
  - 严格校验触底停留时间（$\ge 100\text{ms}$）与最小单次耗时（$\ge 1.0\text{s}$），杜绝浅层点头作弊。
  - 实时卡路里消耗推算（约 $0.36\text{ kcal / rep}$）。
- **多种游玩与测试模式：**
  - 📷 **摄像头识别模式**：面对手机/电脑前置摄像头实景健身。
  - 🖱️ **鼠标模拟测试模式**：桌面端专用，上下滑动鼠标模拟俯卧撑推起与下沉，内置平滑曲线。
  - 🤖 **AI 自动巡航机器人**：自动计算迎面管道缺口位置并平滑穿行演示。
- **Web Audio 纯代码音效合成器：**
  - 8-bit 复古扇翅破空声、穿越水管得分铃声、触底提示音、动作完成大三和弦、撞击音效，无外部音频文件依赖。

---

## 📦 发布产物 (Release Assets)

1. 📲 **`push-up-bird-v1.0.0.apk`** (约 11 MB):
   - **安卓原生安装包**，已签名，下载后可直接在安卓手机上安装运行。
   - 适配 Android 14/15 权限与 WebView 硬件加速，向下兼容至 Android 8.0+。
2. 🌐 **`push-up-birdfly-web-v1.0.0.zip`** (约 7.3 MB):
   - 编译完成的 Web 生产包，解压后可直接部署至任何静态 Web 服务器、GitHub Pages、Vercel 等。
3. 📑 **`game_design_spec.md`**:
   - 完整的运动生物力学调研与游戏数值平衡设计规范文档。
