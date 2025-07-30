# 系统设计模式

## 状态提升 (Lifting State Up)

**定义:**
这是一种在React中常用的模式，当多个组件需要共享和操作同一个状态时，我们会将这个状态移动到它们最近的共同父组件中。然后，父组件通过props将状态和修改状态的函数传递给子组件。

**使用场景:**
- 当一个状态的改变需要影响到多个兄弟组件时。
- 当子组件需要修改父组件或其他兄弟组件的状态时。

**优点:**
- **单一数据源 (Single Source of Truth):** 确保了所有相关的UI都由同一个状态驱动，避免了数据不一致的问题。
- **更好的可维护性:** 状态逻辑集中在一个地方，使得代码更容易理解、调试和重构。

**在本项目的应用 (2025-07-27):**
- **场景:** 在将“查找/替换”功能从主编辑区迁移到侧边栏时，我们需要让侧边栏的搜索操作能够影响到主编辑区的字幕表格。
- **实现:**
  1.  我们将`useFindReplace` Hook（包含`searchQuery`、`filteredSubtitles`等状态和逻辑）从`SubtitleEditorPage`组件**提升**到了它们共同的父组件`MainLayout`中。
  2.  `MainLayout`现在拥有了所有与查找/替换相关的状态。
  3.  `MainLayout`将`filteredSubtitles`（筛选后的字幕）作为prop传递给`SubtitleEditorPage`，用于更新字幕表格的显示。
  4.  同时，`MainLayout`将`searchQuery`、`handleSearchChange`等状态和函数作为props传递给侧边栏中的`FindReplace`组件，驱动其UI和交互。
- **结果:** 通过状态提升，我们成功地解耦了UI布局和状态逻辑，实现了跨组件的复杂交互，同时保持了代码结构的清晰和可维护性。

---

## 全局状态管理 (Global State Management with Zustand)

**定义:**
这是一种使用 `zustand` 库来管理全局应用状态的模式。它通过创建多个专门的 "stores" 来替代传统的 "状态提升" 和 props drilling，从而实现更高效、更解耦的状态管理。

**使用场景:**
- 当应用中存在跨越多个层级、多个分支的共享状态时。
- 当 "状态提升" 导致顶层组件变得臃肿，props drilling 问题严重时。
- 当需要对状态进行持久化、与 Redux DevTools 集成等高级操作时。

**优点:**
- **消除 Props Drilling:** 组件可以直接从 store 中订阅所需的状态，无需通过 props 层层传递。
- **高度解耦:** 状态逻辑与 UI 组件分离，组件只关心自己的渲染，不关心数据从何而来。
- **性能优化:** `zustand` 的 selector 机制确保只有在订阅的状态发生变化时，组件才会重新渲染。
- **代码组织清晰:** 通过 "Slices Pattern"（将 store 拆分为多个逻辑切片），可以清晰地组织和维护状态。

**在本项目的应用 (2025-07-29):**
- **场景:** `MainLayout.tsx` 组件中存在大量的 `useState`，并通过 props 将状态和回调函数传递给 `FileExplorer`, `SubtitleTable`, `StatusBar` 等多个子组件，导致了严重的 props drilling。
- **实现:**
  1.  **创建 `useUIStore`:** 用于管理与 UI 布局和交互相关的状态（如 `activeView`, `sidebarWidth`）。
  2.  **创建 `useDataStore`:** 用于管理核心业务数据（如 `subtitles`, `projectInfo`, `connectionStatus`）。
  3.  **重构 `MainLayout`:** 移除了内部的状态管理逻辑，改为直接从 `useUIStore` 和 `useDataStore` 中获取数据和 actions。
  4.  **重构子组件:** `FileExplorer`, `SubtitleTable`, `StatusBar`, `SubtitleEditorPage` 等组件不再通过 props 接收状态，而是直接调用 `useUIStore` 和 `useDataStore` 来订阅它们所需的数据。
- **结果:** 成功地用 `zustand` 替代了原有的状态管理方式，极大地简化了组件的 props，降低了组件间的耦合度，提升了代码的可读性和可维护性。
- **进一步优化 (2025-07-29):**
  - **场景:** 在完成初步重构后，发现 `MainLayout` 中仍存在 `activeTrackIndex` 和 `selectedSubtitleId` 等状态的 props drilling 问题。
  - **实现:**
    1.  将 `activeTrackIndex` 和 `selectedSubtitleId` 状态及其 setter 函数迁移到 `useUIStore` 中。
    2.  重构 `MainLayout`，使其不再管理这些状态。
    3.  重构 `FileExplorer` 和 `StatusBar`，让它们直接从 `useUIStore` 中消费所需的状态。
  - **结果:** 进一步消除了 props drilling，使 `useUIStore` 成为 UI 状态的唯一数据源，增强了代码的一致性和可维护性。