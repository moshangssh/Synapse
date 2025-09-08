# Synapse Subtitle Editor 棕地架构文档

## 引言

本文档捕获了 **Synapse Subtitle Editor** 代码库的**当前状态**，包括其真实的技术模式和结构。它将作为AI开发代理进行“AI字幕优化”功能增强时的核心技术参考。

### 文档范围

本文档的分析将**专注于与PRD中定义的“AI字幕优化”功能相关的领域**，包括后端的API服务、文本处理逻辑，以及前端的状态管理和UI组件。

### 变更日志

| 日期 | 版本 | 描述 | 作者 |
| :--- | :--- | :--- | :--- |
| 2025-09-07 | 1.0 | 基于现有代码和新功能PRD的初始分析 | Winston (Architect) |

## 快速参考 - 关键文件与入口点

### 理解系统的关键文件

* **前端入口**: `frontend/synapse/src/main.tsx`
* **后端入口**: `backend/main.py`
* **核心配置**: `frontend/synapse/tauri.conf.json` (定义了Tauri应用和后端sidecar)
* **核心后端业务逻辑**: `backend/davinci_api.py`, `backend/davinci_connector.py`
* **核心前端业务逻辑**: `frontend/synapse/src/stores/` (Zustand状态管理), `frontend/synapse/src/hooks/`
* **API定义**: `backend/routers/` 目录
* **数据模型/类型**: `frontend/synapse/src/types.ts`, `backend/schemas.py`

### 新功能增强的影响区域

根据PRD，新功能将主要影响以下区域：

* **后端**:
    * 需要创建新的路由文件 `backend/routers/optimizer.py`。
    * 需要创建新的业务逻辑文件 `backend/llm_optimizer.py`，用于处理缓存、调用LLM API和结果对齐。
* **前端**:
    * 需要修改 `frontend/synapse/src/components/layout/OptimizerSidebar.tsx` 以添加新的UI控件。
    * 需要创建新的UI组件，如 `SettingsModal.tsx` 和 `ResultReviewModal.tsx`。
    * 需要更新 `frontend/synapse/src/stores/` 中的状态管理逻辑，以处理API密钥和优化结果。

## 高层架构

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

## 源码树与模块组织

### 项目结构 (现状)

```plaintext
/
├── backend/                  # 后端FastAPI服务
│   ├── routers/              # API路由
│   ├── tests/                # 后端测试
│   ├── davinci_api.py        # Resolve API核心逻辑
│   ├── davinci_connector.py  # Resolve连接逻辑
│   ├── main.py               # FastAPI应用入口
│   └── text_utils.py         # 文本处理工具
└── frontend/synapse/         # 前端Tauri/React应用
    ├── src/
    │   ├── components/       # React组件
    │   ├── hooks/            # 自定义Hooks
    │   ├── pages/            # 页面组件
    │   ├── services/         # API服务调用
    │   ├── stores/           # Zustand状态
    │   ├── utils/            # 前端工具函数
    │   ├── App.tsx           # 应用主组件
    │   └── main.tsx          # 应用入口
    ├── tauri.conf.json       # Tauri应用配置
    └── package.json          # 前端依赖
````

### 关键模块及其用途

  * **`backend/davinci_connector.py`**: 负责建立和管理与DaVinci Resolve的连接，是整个系统与Resolve通信的基础。
  * **`backend/text_utils.py`**: 包含现有的文本处理逻辑（如去口水词、查找替换、差异计算），新功能将扩展或利用此模块。
  * **`frontend/synapse/src/stores/`**: 使用Zustand管理所有全局状态，如字幕列表、连接状态等。新功能的状态也将在此处管理。
  * **`frontend/synapse/src/components/layout/OptimizerSidebar.tsx`**: 现有的优化器侧边栏，新功能的触发点将集成于此。

## 技术债与已知问题

### 关键技术债

1.  **文档缺失**: `README.md` 是模板默认内容，缺少针对本项目的详细开发、构建和部署指南。
2.  **配置硬编码**: 部分配置（如后端端口 `8000`）硬编码在代码中（例如 `tauri.conf.json` 和 `services/apiConfig.ts`），缺乏灵活性。
3.  **测试覆盖率未知**: 项目包含测试文件，但没有配置覆盖率报告，无法评估测试的完整性。

## 集成点与外部依赖

### 外部服务

| 服务 | 用途 | 集成类型 | 关键文件 |
| :--- | :--- | :--- | :--- |
| DaVinci Resolve | 核心功能 | 脚本API | `davinci_connector.py` |
| **OpenAI兼容API (新增)** | **AI字幕优化** | **REST API** | **`llm_optimizer.py` (待创建)** |

## 开发与部署

### 本地开发设置

1.  根据 `frontend/synapse/package.json` 安装npm依赖。
2.  根据 `backend/requirements.txt` 安装Python依赖。
3.  在 `frontend/synapse` 目录下运行 `npm run dev`，Tauri会自动启动前端开发服务器和后端sidecar服务。

### 构建与部署流程

  * **构建命令**: `npm run tauri build` 将前端和后端打包成一个独立的桌面应用安装包。

## 新功能增强的影响分析

### 需要修改的文件

  * `frontend/synapse/src/components/layout/OptimizerSidebar.tsx`: 添加新的UI控件。
  * `frontend/synapse/src/stores/*.ts`: 增加用于管理API配置和优化结果的状态。
  * `backend/main.py`: 注册新的API路由。

### 需要新增的文件/模块

  * **后端**:
      * `backend/routers/optimizer.py`: 用于处理AI优化请求的新API路由。
      * `backend/llm_optimizer.py`: 实现缓存、调用LLM API、调用 `SubtitleAligner` 的核心逻辑。
  * **前端**:
      * `frontend/synapse/src/components/AIOptimizer.tsx`: 新的AI优化UI组件。
      * `frontend/synapse/src/components/SettingsModal.tsx`: 用于API配置的模态框。
      * `frontend/synapse/src/components/ResultReviewModal.tsx`: 用于展示和确认优化结果的模态框。

### 集成考量

  * **API密钥管理**: 需要在前端实现一个安全的存储机制来保存用户的API密钥。Tauri的store插件是一个可行的方案。
  * **异步处理**: AI优化过程可能是耗时的。前端UI必须提供清晰的加载和等待状态，后端需要采用异步任务处理以避免阻塞。
  * **错误处理**: 必须对外部API的调用进行全面的错误处理，并在UI上向用户提供清晰的错误信息。