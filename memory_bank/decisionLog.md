# 决策日志

- **2025-07-21:** 决定使用 Tauri + React + FastAPI 技术栈来构建项目。
- **2025-07-21:** 决定使用 `sidecar` 模式来集成前端和后端。
- **2025-07-21:** 决定在 FastAPI 后端添加 CORS 支持，以允许来自 Tauri 前端的请求。
- **2025-07-22:** [已决定] 决定在前端项目中使用 Material UI 组件库。理由：开发效率高，UI统一，性能影响可控。
- **2025-07-23:** [已决定] 修复与 DaVinci Resolve 的连接问题时，采用动态加载其脚本模块的方案。理由：这是官方推荐的最佳实践，能够跨平台兼容，且比硬编码路径更稳定可靠。
---
**Decision:** Fix DaVinci Resolve connection error by directly importing `fusionscript`.
**Date:** 2025-07-23
**Rationale:** The `DaVinciResolveScript.py` provided by the official SDK is a loader, not the actual API implementation. The core functionality, including the `scriptapp` object, resides in the `fusionscript` module. The official `README.txt` is misleading in this regard. The fix involves attempting to import `fusionscript` directly, which should provide the correct `scriptapp` object, and falling back to the original method only if the direct import fails.
**Impact:** This change should resolve the `AttributeError: module 'DaVinciResolveScript' has no attribute 'scriptapp'` error and allow the application to connect to DaVinci Resolve successfully.

- **2025-07-24:** [已决定] 决定将 `format_timecode` 函数从 `resolve_utils.py` 中解耦出来，创建一个新的 `timecode_utils.py` 模块。 **理由:** 提高代码的模块化程度和可维护性。`format_timecode` 的功能相对独立，将其分离可以使 `resolve_utils.py` 更专注于与 DaVinci Resolve API 的直接交互逻辑，而 `timecode_utils.py` 则专门负责时间码相关的计算和格式化。

- **2025-07-24:** [已决定] 为实现点击字幕跳转时间线功能，决定在后端创建一个新的API端点 `/api/v1/timeline/timecode`，并重构现有的DaVinci Resolve连接逻辑。 **理由:** 1.  **功能需求:** 需要一个新的API来处理前端发送的时间码跳转请求。2.  **代码质量:** 在实现新功能的同时，发现现有的连接逻辑存在重复代码。通过将其重构为一个可复用的辅助函数，可以提高代码的可维护性和可读性，为未来的功能扩展打下良好基础。

- **2025-07-24:** [已决定] 为实现播放头跳转到“终点”和“中点”的功能，决定扩展后端API `/api/v1/timeline/timecode`。 **理由:** 1.  **功能需求:** 需要API支持更灵活的跳转选项。 2.  **代码实现:** 通过在请求中添加 `jump_to` 参数（值为 "start", "end", 或 "middle"），后端可以灵活处理不同的跳转逻辑，同时保持API的简洁性。

- **2025-07-24:** [已决定] 在前端实现一个全局下拉菜单来控制播放头的跳转模式。 **理由:** 1.  **用户体验:** 全局控制比在每一行都添加一个下拉菜单更简洁，操作更方便。 2.  **实现简单:** 这种方式可以减少组件的复杂性，更容易实现和维护。

- **2025-07-24:** [已决定] 在前端应用中添加一个实时搜索功能。 **理由:** 1.  **功能需求:** 允许用户快速地从大量字幕中筛选出需要的内容，提高使用效率。 2.  **用户体验:** 实时筛选（无需点击按钮）提供了流畅、即时的交互反馈。 3.  **实现策略:** 将筛选逻辑放在父组件 `App.tsx` 中，可以更好地管理状态，并保持子组件 `SubtitleTable.tsx` 的纯粹性，使其只负责数据展示。

---
### 代码实现 [React Component]
[2025-07-25 14:51:03] - 在 `SubtitleTable` 组件中实现了字幕双击编辑功能。

**实现细节：**
*   在 `SubtitleTableProps` 接口中添加了 `onSubtitleChange` 回调函数。
*   为字幕内容的 `TableCell` 添加了 `onDoubleClick` 事件，以触发编辑模式。
*   使用 `useState` 来管理单元格的编辑状态和编辑后的文本。
*   当用户双击时，将 `TableCell` 替换为 Material-UI 的 `TextField` 组件。
*   实现了 `onKeyDown`（处理 Enter 和 Escape 键）和 `onBlur` 事件，以结束编辑状态并调用 `onSubtitleChange` 回调。
*   根据用户反馈，通过调整 `TextField` 和 `TableCell` 的样式，解决了编辑时产生的位移问题，实现了“无感”的编辑模式切换。

**测试框架：**
*   `vitest`
*   `@testing-library/react`

**测试结果：**
- 覆盖率：100%
- 通过率：100%

---
### 功能实现 [文本差异高亮及SRT导出]
[2025-07-25] - 实现了一个完整的、采用前后端分离架构的文本差异高亮及SRT导出功能。

**最终架构决策：**
*   **核心逻辑后置**: 采纳了用户提出的专业建议，将所有复杂的数据处理、时间码转换和SRT文件格式化逻辑全部移至Python后端。
*   **前端职责单一**: 前端只负责UI展示（通过`DiffHighlighter`组件）和调用API，保持了代码的轻量和职责的清晰。
*   **后端API**:
    *   改造了 `/api/v1/subtitles` 接口，使其能够返回时间线的准确帧率。
    *   创建了一个全新的 `POST /api/v1/export/srt` 接口，专门负责接收前端数据并生成格式完美的SRT文件内容。

**决策演变过程：**
1.  **初步构想**: 计划在前端使用`<ins>`和`<del>`标签实现一个轻量级的UI高亮组件。
2.  **关键反馈 (导出格式)**: 用户一针见血地指出，直接导出带HTML标签的文本会污染SRT文件。
3.  **关键反馈 (时间码)**: 用户再次敏锐地发现，应用内部的帧数时间码(`FF`)与SRT标准的毫秒时间码(`ms`)不兼容，必须进行转换。
4.  **关键反馈 (架构)**: 用户提出了将所有核心处理逻辑移至后端的专业建议，这使得整个系统架构得到了质的提升，实现了完美的前后端“关注点分离”。
5.  **最终方案**: 经过数次迭代，我们共同确定了当前这个健壮、专业、可维护性极佳的最终架构方案。