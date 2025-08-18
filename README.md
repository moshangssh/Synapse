# Synapse: DaVinci Resolve 字幕增强工具

Synapse 是一款功能强大的桌面应用程序，旨在简化和加速 DaVinci Resolve (达芬奇) 中的字幕编辑和优化工作流程。它通过一个现代化的、类似 VS Code 的界面，将字幕提取、批量编辑、口水词清理和无缝回导等功能集于一身，是视频剪辑师、后期制作人员和字幕创作者的得力助手。

本应用采用 [Tauri](https://tauri.app/) 构建，结合了 React、TypeScript 的现代化前端与 Python、FastAPI 的强大后端，以 sidecar 模式运行，确保了高性能和原生桌面体验。

---

## ✨ 核心功能

-   **与 DaVinci Resolve 直接集成**:
    *   自动连接到正在运行的 DaVinci Resolve 实例。
    *   实时获取当前项目和时间线信息。
    *   一键加载时间线上所有字幕轨道的列表。
    *   从指定轨道中精确提取所有字幕条目，包括时间码和文本。

-   **高效的字幕编辑体验**:
    *   采用 **虚拟化列表 (Virtualized List)** 技术，即使处理包含数千条字幕的长视频也能保持界面流畅。
    *   双击即可直接在表格中编辑字幕文本。
    *   **差异高亮显示**：所有修改都会与原始文本进行对比，高亮显示新增和删除的内容，让修改痕迹一目了然。
    *   点击任意字幕行，可将 DaVinci Resolve 的播放头**精确定位**到该字幕的入点、出点或中间点，方便核对画面。

-   **强大的批量处理能力**:
    *   **高级查找与替换**：支持大小写匹配、全词匹配和正则表达式，轻松应对复杂的批量修改需求。
    *   **一键移除口水词**：内置可定制的口水词词典，一键即可清理字幕中的“嗯”、“啊”、“那个”、“就是”等填充词，并自动处理多余的标点和空格。
    *   **撤销操作**：移除 Filler Word 后提供撤销选项，防止误操作。

-   **灵活的导入与导出**:
    *   **导入 SRT 文件**：可从本地导入 `.srt` 格式的字幕文件进行编辑和处理。
    *   **导出为 SRT 文件**：将编辑好的字幕导出为标准的 `.srt` 文件，兼容各种视频播放器和平台。
    *   **直接导出至 DaVinci Resolve**：将修改后的字幕一键回传到达芬奇，在时间线上自动创建一个新的字幕轨道，实现无缝的工作流程闭环。

-   **现代化的用户界面**:
    *   受 VS Code 启发的布局，包含活动栏、侧边栏和主编辑区，清晰直观。
    *   可拖拽调整宽度的侧边栏，适应不同工作习惯。
    *   详尽的状态栏，实时显示连接状态、项目信息、字幕统计和播放头跳转模式。
    *   原生窗口控件，支持窗口置顶、最小化、最大化和关闭。

---

## 🛠️ 技术栈

-   **桌面框架**: [Tauri](https://tauri.app/) (Rust)
-   **前端**:
    *   [React](https://reactjs.org/)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   [Vite](https://vitejs.dev/)
    *   [Material-UI (MUI)](https://mui.com/)
    *   [Zustand](https://zustand-demo.pmnd.rs/) (状态管理)
    *   [React Virtuoso](https://virtuoso.dev/) (虚拟列表)
-   **后端 (Sidecar)**:
    *   [Python 3](https://www.python.org/)
    *   [FastAPI](https://fastapi.tiangolo.com/) (本地 API 服务器)
    *   [Uvicorn](https://www.uvicorn.org/)
-   **DaVinci Resolve 通信**:
    *   Blackmagic Design `DaVinciResolveScript.py` API

---

## 📂 项目结构

```
.
├── backend/                  # Python 后端 (FastAPI Sidecar)
│   ├── davinci_api.py        # 封装与 DaVinci Resolve 交互的核心功能 (提取/设置字幕、时间码等)
│   ├── davinci_connector.py  # 处理与 Resolve 的动态连接和会话管理
│   ├── diagnose_resolve.py   # 用于调试 Resolve 连接和字幕属性的诊断脚本
│   ├── main.py               # FastAPI 应用入口，定义所有 API 端点
│   ├── requirements.txt      # Python 依赖列表 (fastapi, uvicorn, etc.)
│   ├── resolve_utils.py      # (已部分重构) 包含一些早期的 Resolve 辅助功能
│   ├── schemas.py            # Pydantic 数据模型，用于 API 请求/响应的验证
│   ├── srt_utils.py          # SRT 文件内容生成工具
│   ├── timecode_utils.py     # 时间码与帧数转换工具
│   ├── __init__.py           # 包初始化文件
│   └── tests/                # 后端单元测试
│       ├── test_davinci_api.py
│       ├── test_davinci_connector.py
│       ├── test_main.py
│       ├── test_resolve_utils.py
│       ├── test_srt_utils.py
│       ├── test_timecode_utils.py
│       └── __init__.py
│
├── frontend/synapse/         # React 前端
│   ├── public/               # 静态资源
│   │   └── filler_words.json # 可配置的口水词词典
│   ├── src/                  # 前端源码
│   │   ├── components/       # 可复用 UI 组件
│   │   │   ├── layout/       # 布局组件 (主布局, 侧边栏, 状态栏等)
│   │   │   ├── FillerWordRemover.tsx  # “一键去口水词”功能组件
│   │   │   ├── SubtitleTable.tsx      # 核心的虚拟化字幕表格组件
│   │   │   ├── FindReplace.tsx        # 查找替换 UI 组件
│   │   │   └── ...
│   │   ├── hooks/            # 自定义 React Hooks
│   │   │   ├── useFindReplace.ts      # 封装查找与替换逻辑
│   │   │   ├── useSrtImporter.ts      # 封装 SRT 文件导入逻辑
│   │   │   ├── useNotifier.ts         # 封装全局通知逻辑
│   │   │   └── ...
│   │   ├── pages/            # 页面级组件
│   │   │   └── SubtitleEditorPage.tsx
│   │   ├── stores/           # Zustand 状态管理
│   │   │   ├── useDataStore.ts        # 管理字幕、项目等核心业务数据
│   │   │   ├── useUIStore.ts          # 管理侧边栏、活动视图等 UI 状态
│   │   │   └── useSettingsStore.ts    # 管理应用设置 (如口水词列表)
│   │   ├── utils/            # 通用工具函数 (diff计算, srt解析, 格式转换等)
│   │   ├── App.tsx           # 应用根组件
│   │   └── main.tsx          # 应用入口点
│   ├── src-tauri/            # Tauri 核心 (Rust)
│   │   ├── capabilities/     # Tauri 权限配置文件
│   │   ├── icons/            # 应用图标资源
│   │   ├── src/              # Rust 源码
│   │   │   ├── lib.rs
│   │   │   └── main.rs
│   │   ├── build.rs          # Rust 构建脚本
│   │   ├── Cargo.toml        # Rust 依赖 (crates)
│   │   └── tauri.conf.json   # Tauri 核心配置，包括 sidecar 设置
│   ├── package.json          # 前端依赖和脚本 (npm)
│   └── vite.config.ts        # Vite 配置文件
│
└── ... (其他项目根目录下的配置文件如 .gitignore)
```

---

## 🚀 开始使用

### 先决条件

1.  **DaVinci Resolve**: 确保已安装 DaVinci Resolve 或 DaVinci Resolve Studio。
    *   **启用脚本访问**: 在 `DaVinci Resolve -> 偏好设置 -> 系统 -> General` 中，确保 "External scripting using" 已设置为 "Local"。
2.  **Python**: 需要 Python 3.8 或更高版本。
3.  **Node.js**: 需要 Node.js (建议使用 LTS 版本) 和 npm。
4.  **Rust**: 如果需要从源码构建或进行 Tauri 开发，需要安装 Rust 工具链。

### 安装与运行

1.  **克隆仓库**
    ```bash
    git clone https://your-repository-url/synapse.git
    cd synapse
    ```

2.  **安装后端依赖**
    ```bash
    cd backend
    pip install -r requirements.txt
    cd ..
    ```

3.  **安装前端依赖**
    ```bash
    cd frontend/synapse
    npm install
    ```

4.  **以开发模式运行**
    *确保 DaVinci Resolve 正在运行，并已打开一个项目。*
    ```bash
    # 在 frontend/synapse 目录下运行
    npm run tauri dev
    ```
    此命令将同时启动 Vite 开发服务器和 Tauri 应用窗口，并自动启动 Python 后端 sidecar。

### 构建应用

你可以将应用打包为适用于你当前操作系统的独立可执行文件。

```bash
# 在 frontend/synapse 目录下运行
npm run tauri build
```

构建完成后，可执行文件和安装包将位于 `frontend/synapse/src-tauri/target/release/` 目录下。

---

## 🤝 贡献

我们欢迎各种形式的贡献！无论是提交 Bug 报告、功能建议还是代码 Pull Request。

1.  Fork 本仓库
2.  创建你的功能分支 (`git checkout -b feature/AmazingFeature`)
3.  提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  将你的分支推送到远程 (`git push origin feature/AmazingFeature`)
5.  打开一个 Pull Request

---

## 📜 许可证

本项目采用 [MIT](https://choosealicense.com/licenses/mit/) 许可证。更多信息请查看 `LICENSE` 文件。

---

## 🙏 致谢

-   [Tauri Team](https://github.com/tauri-apps)
-   [Blackmagic Design](https://www.blackmagicdesign.com/) 提供的强大脚本 API
-   所有本项目使用的开源库的作者们