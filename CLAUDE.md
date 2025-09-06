# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Synapse 是一个专为 DaVinci Resolve 设计的字幕增强工具，采用前后端分离的桌面应用架构。前端使用 React + Tauri，后端使用 Python FastAPI 作为 sidecar 进程。

## 常用开发命令

### 前端开发
```bash
cd frontend/synapse

# 安装依赖
npm install

# 启动开发模式（会自动启动后端 sidecar）
npm run tauri dev

# 构建生产版本
npm run tauri build

# 运行前端测试
npm test

# 运行单个测试文件
npm test -- SubtitleTable.test.tsx

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

### 后端开发
```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动后端服务器（独立运行时）
python main.py

# 运行后端测试
pytest

# 运行特定测试
pytest tests/test_davinci_connector.py -v
```

## 项目架构

### 整体架构
- **前端**: React 18 + TypeScript + Tauri 2.x 桌面应用
- **后端**: Python FastAPI 作为 Tauri sidecar 进程
- **通信**: 前端通过 HTTP API 与后端通信
- **端口**: 前端 1420，后端 8000

### 核心模块

#### 1. 状态管理 (Zustand)
- `useDataStore`: 核心业务数据（字幕、项目信息、连接状态）
- `useUIStore`: UI 状态（侧边栏、活动视图）
- `useSettingsStore`: 应用设置（口水词列表等）

#### 2. 服务层 (Services)
- `services/`: 所有API调用和业务逻辑的集中管理
- 通过服务层实现关注点分离，提高代码可维护性和可测试性
- 详情请参见 `src/services/README.md`

#### 3. 组件架构
- **布局组件**: `ActivityBar`, `StatusBar`, `MainLayout`
- **核心功能**: `SubtitleTable`, `FindReplace`, `FillerWordRemover`
- **通用组件**: `DiffHighlighter`, `EditableSubtitleCell`

#### 4. DaVinci Resolve 集成
- `davinci_api.py`: DaVinci Resolve API 封装
- `davinci_connector.py`: 连接管理和状态同步
- 通过 `DaVinciResolveScript.py` 与 Resolve 通信

## 开发注意事项

### 1. Tauri Sidecar 配置
- 后端 Python 服务器配置在 `src-tauri/tauri.conf.json` 的 `plugins > sidecar` 部分
- 开发模式下会自动启动后端，生产模式下会打包

### 2. 虚拟列表性能优化
- 使用 React Virtuoso 处理大量字幕数据
- 避免在表格中使用内联函数定义

### 3. 差异高亮实现
- 使用 `diff` 库计算文本差异
- 差异高亮组件支持行内和整行模式

### 4. DaVinci Resolve 连接
- 连接状态由 `useDataStore` 管理
- 自动检测 Resolve 是否运行
- 支持手动刷新连接状态

### 5. 时间码处理
- 使用 `timecode_utils.py` 进行时间码转换
- 支持 SMPTE 格式和帧数格式

## 测试策略

### 前端测试
- 使用 Vitest + React Testing Library
- 组件测试在 `src/components/__tests__/`
- Hook 测试在 `src/hooks/__tests__/`

### 后端测试
- 使用 pytest
- 测试文件在 `backend/tests/`
- 需要 DaVinci Resolve 环境的测试会自动跳过

## 构建和部署

### 开发构建
```bash
npm run tauri dev
```

### 生产构建
```bash
npm run tauri build
```
构建产物位于 `frontend/synapse/src-tauri/target/release/bundle/`

## 调试技巧

### 1. 前后端通信调试
- 后端日志在控制台输出
- 前端网络请求使用浏览器开发者工具查看

### 2. Tauri 调试
- 开发模式下使用 `npm run tauri dev -- --log debug` 查看详细日志
- Rust 代码调试需要安装 Rust 工具链

### 3. DaVinci Resolve 集成调试
- 确保 DaVinci Resolve 正在运行
- 检查 Resolve 脚本 API 是否启用
- 查看 `davinci_connector.py` 的连接状态日志