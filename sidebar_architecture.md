# Sidebar 收纳/展示功能架构设计

## 1. 概述

本文档旨在为实现 `Sidebar` 的收纳和展示功能提供一个清晰、可行的架构方案。该方案遵循项目现有的技术栈和设计模式，特别是 `Zustand` 的全局状态管理。

## 2. 状态管理 (`useUIStore.ts`)

为了管理 `Sidebar` 的状态，我们将在 `frontend/synapse/src/stores/useUIStore.ts` 中进行以下修改：

- **新增状态**:
  - `isSidebarOpen: boolean`: 记录 `Sidebar` 的展开/收起状态，默认为 `true`。
  - `previousSidebarWidth: number`: 用于存储用户拖拽调整后的 `Sidebar` 宽度，默认为 `250`。

- **新增 Action**:
  - `toggleSidebar: () => void`: 一个切换 `isSidebarOpen` 状态的 action。

- **状态持久化**:
  - 使用 `Zustand` 的 `persist` 中间件将 `isSidebarOpen` 和 `sidebarWidth` 状态持久化到 `localStorage`，以在刷新或重启后保持用户设置。

## 3. 组件交互

### 3.1. `ActivityBar.tsx`

`ActivityBar` 将成为交互的主要触发点，其修改如下：

- **移除 Props**:
  - 移除 `activeView` 和 `onViewChange` props，使其与 `MainLayout` 解耦。

- **直接使用 Store**:
  - 从 `useUIStore` 中直接获取 `activeView`, `setActiveView`, `isSidebarOpen`, 和 `toggleSidebar`。

- **更新点击逻辑**:
  - **点击不同图标**: 调用 `setActiveView` 切换视图，并确保 `Sidebar` 是展开状态（如果之前是收起的，则调用 `toggleSidebar`）。
  - **点击相同图标**: 调用 `toggleSidebar` 来收起或展开 `Sidebar`。

### 3.2. `MainLayout.tsx`

`MainLayout` 将根据 `useUIStore` 中的状态来动态调整 UI：

- **获取状态**:
  - 从 `useUIStore` 中获取 `isSidebarOpen` 和 `sidebarWidth`。

- **动态宽度**:
  - `Sidebar` 的容器 `Box` 的 `width` 属性将根据 `isSidebarOpen` 动态设置：
    - `isSidebarOpen` 为 `true` 时，宽度为 `sidebarWidth`。
    - `isSidebarOpen` 为 `false` 时，宽度为 `0`。

## 4. UI 变化与用户体验

- **平滑过渡**:
  - 为 `Sidebar` 的 `width` 属性添加 `CSS transition`，以实现流畅的展开/收起动画。

- **拖拽功能**:
  - 侧边栏的拖拽条（Resizer）将在 `isSidebarOpen` 为 `false` 时被隐藏，以防止用户在 `Sidebar` 收起时进行操作。
  - 拖拽调整宽度时，更新 `sidebarWidth` 的值，并由 `persist` 中间件自动保存。

## 5. 实施步骤

1.  **更新 `useUIStore.ts`**:
    - 添加 `isSidebarOpen` 和 `toggleSidebar`。
    - 集成 `persist` 中间件。

2.  **重构 `ActivityBar.tsx`**:
    - 移除 props，直接与 `useUIStore` 交互。
    - 实现新的点击逻辑。

3.  **重构 `MainLayout.tsx`**:
    - 移除传递给 `ActivityBar` 的 props。
    - 根据 `isSidebarOpen` 动态设置 `Sidebar` 宽度。
    - 条件渲染拖拽条。
