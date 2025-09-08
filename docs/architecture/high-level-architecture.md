# 高层架构

### 技术摘要

本项目是一个基于 **Tauri** 的跨平台桌面应用。其前端采用 **React** 和 **MUI** 构建，后端是一个通过 **Sidecar** 模式运行的 **Python FastAPI** 服务。应用的核心功能是作为 **DaVinci Resolve** 的外部字幕编辑器，通过其脚本API进行实时交互，同时支持独立的SRT文件工作流。

### 当前技术栈 (根据代码分析)

| 类别 | 技术 | 版本 (约) | 备注 |
| :--- | :--- | :--- | :--- |
| 运行时 | Node.js, Python | 20+, 3.x | 前端开发环境为Node.js，后端为Python |
| 桌面框架 | Tauri | 2.x | 核心应用框架 |
| 前端框架 | React | 18.3.1 | UI构建库 |
| 后端框架 | FastAPI | latest | 提供本地API服务 |
| UI库 | MUI (Material-UI) | 7.2.0 | 前端组件库 |
| 状态管理 | Zustand | 5.0.6 | 前端全局状态管理 |
| 前端测试 | Vitest, Testing Library | 1.6.0, 16.3.0 | 单元/组件测试 |
| 外部依赖 | DaVinci Resolve Scripting API | N/A | 核心集成点 |

### 仓库结构现状

* **类型**: Polyrepo（多仓库）结构，前端和后端代码位于独立的目录中，但通过Tauri配置进行统一构建和管理。
