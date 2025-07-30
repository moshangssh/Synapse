# 决策日志

## 2025-07-29: 决定引入 Zustand 作为前端状态管理库

**决策背景:**

当前项目前端状态管理混乱，主要依赖 `useState` 和 props drilling，导致 `MainLayout` 组件臃肿，代码难以维护。

**决策过程:**

1.  **现状分析 (NexusCore):**
    *   分析了项目代码，识别出状态管理是当前的主要痛点。
    *   将初步分析结论记录于 `memory_bank/activeContext.md`。

2.  **技术调研 (knowledge-researcher):**
    *   委派 `knowledge-researcher` 对 `zustand` 进行了深入调研。
    *   `knowledge-researcher` 产出了详细的调研报告 `zustand_research_report.md` 和知识库摘要 `memory_bank/knowledge/zustand_summary.md`。

**最终决策:**

**批准引入 `zustand`** 作为项目官方的状态管理解决方案。

**决策理由:**

*   **解决痛点:** `zustand` 能有效解决 props drilling 问题，简化组件逻辑。
*   **低成本高收益:** API 简洁，学习成本低，能快速提升开发效率。
*   **高性能:** 基于 selector 的渲染优化机制能避免不必要的组件重渲染。
*   **易于集成:** 无需 `<Provider>` 包裹，可以渐进式地引入现有项目。

**后续行动:**

遵循 `zustand_research_report.md` 中制定的**集成计划**，分阶段在项目中引入和推广 `zustand`。

---

## 2025-07-29: 决定优化 props drilling

**决策背景:**

在完成了初步的 Zustand 集成后，我们发现 `MainLayout` 组件中仍然存在一些跨组件的状态传递（props drilling），例如 `activeTrackIndex` 和 `selectedSubtitleId`。

**决策过程:**

1.  **代码审查 (NexusCore):**
    *   分析了 `MainLayout.tsx` 及其子组件，识别出剩余的 props drilling 问题。
    *   评估了将这些状态迁移到 Zustand 的优缺点。

**最终决策:**

**批准将跨组件共享的状态（如 `activeTrackIndex`, `selectedSubtitleId`）迁移到 `useUIStore` 中，以进一步消除 props drilling。**

**决策理由:**

*   **提升可维护性:** 减少组件之间的耦合，使代码更易于理解和重构。
*   **遵循单一数据源原则:** 将所有全局 UI 状态集中到 `useUIStore` 中，使状态管理更加一致。
*   **代码更整洁:** 简化了 `MainLayout` 的 props，使其职责更清晰。

**后续行动:**

立即执行重构，修改 `useUIStore`, `MainLayout`, `FileExplorer`, `StatusBar` 等相关文件。
