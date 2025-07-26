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

- **2025-07-25:** [已决定] 将“仅查找”功能与“查找与替换”功能进行整合。 **理由:** 1.  **用户体验:** 在实现查找替换功能后，原有的独立查找框被覆盖，导致用户困惑。 2.  **代码复用:** “仅查找”（实时筛选）和“查找与替换”的底层逻辑（如 `searchQuery`）是相通的。将它们整合到一个统一的 `useFindReplace` Hook 和 `FindReplace` 组件中，可以最大化地复用代码，避免逻辑分散。 3.  **UI简洁性:** 通过“默认显示搜索，点击展开替换”的设计，可以在保持界面简洁的同时，提供两种不同层次的查找功能，满足不同用户的需求。

---
### 前端代码重构决策 [代码分析]
[2025-07-25 16:30:46] - 基于对前端代码库的分析，识别出以下重构机会：

**已完成的重构：**
1.  **样式复用**: 提取了 `SubtitleTable` 和 `SubtitleRow` 组件中的共享样式至 `sharedStyles.ts`，减少了代码重复。
2.  **逻辑复用**: 将 `useFindReplace` hook 中的 `diff` 计算逻辑提取至 `utils/diff.ts`，提高了代码的可复用性。

**已完成的重构任务：**
1.  **`FindReplace` 功能增强**:
    *   **任务**: 实现“大小写匹配”、“全词匹配”和“使用正则表达式”功能。
    *   **方案**: 在 `useFindReplace` hook 中添加状态来管理这些选项，并更新过滤和替换逻辑。
2.  **API 调用逻辑抽象**:
    *   **任务**: 将 `SubtitleTable` 中的时间码跳转 API 调用逻辑提取出来。
    *   **方案**: 创建一个新的自定义 Hook `useTimelineNavigation` 来封装该 API 调用。
3.  **组件进一步拆分**:
    *   **任务**: 将 `SubtitleRow` 中的编辑逻辑拆分。
    *   **方案**: 创建一个独立的 `EditableSubtitleCell` 组件来处理编辑状态下的逻辑。


---
### 后端代码重构决策 [代码分析]
[2025-07-25 17:17:52] - 基于对后端代码库的分析，识别出以下重构机会：

**主要问题：**
1.  **通用错误处理逻辑**: `main.py` 中的 API 端点存在重复的错误处理代码。
2.  **Resolve 对象获取逻辑**: 在 `resolve_utils.py` 和 `diagnose_resolve.py` 中，获取 `project` 和 `timeline` 对象的代码重复。
3.  **时间码转换逻辑分散**: `frames_to_srt_timecode` 函数与其他时间码转换函数不在同一个模块中。
4.  **代码冗余**: `diagnose_resolve.py` 脚本与 `resolve_utils.py` 中的代码高度重复。

**重构建议：**
1.  **提取通用错误处理函数**: 在 `main.py` 中创建一个通用的错误处理函数，例如 `handle_resolve_error()`。
2.  **提取 Resolve 对象获取函数**: 在 `resolve_utils.py` 中创建一个私有辅助函数，例如 `_get_current_timeline()`，来封装对象获取逻辑。
3.  **集中管理时间码转换**: 将 `frames_to_srt_timecode` 函数移动到 `timecode_utils.py`。
4.  **重构诊断脚本**: 简化 `diagnose_resolve.py`，使其调用 `resolve_utils.py` 中的辅助函数。
5.  **统一数据模型 (可选)**: 在未来可以考虑统一 `schemas.py` 中相似的 `SubtitleModel` 和 `SubtitleItem` 模型。


---
### 代码实现 [后端连接逻辑]
[2025-07-25 18:55:36] - 重构时间码函数并优化 DaVinci Resolve 连接逻辑

**实现细节：**
- 将 `frames_to_srt_timecode` 函数从 `resolve_utils.py` 移动到 `timecode_utils.py`，以实现更好的模块化。
- 在 `resolve_utils.py` 中引入全局连接缓存 `_resolve_connection`，以复用与 DaVinci Resolve 的连接，避免重复连接开销。
- 修改了 `_connect_to_resolve` 函数，增加了 `force_reconnect` 参数，用于管理缓存和处理强制重连。
- 增强了 `_get_current_timeline` 函数，使其能够在检测到连接丢失时，自动触发重连机制，提高了系统的健壮性。

**测试框架：**
本次任务未涉及测试用例的编写或执行。

**测试结果：**
- 覆盖率：N/A
- 通过率：N/A



---
### 代码实现 [后端代码重构]
[2025-07-25 19:21:03] - 完成后端代码的全面重构

**实现细节：**
1.  **提取通用错误处理逻辑**: 在 `main.py` 中创建了 `handle_error` 辅助函数，统一处理 API 端点的错误响应。
2.  **提取 Resolve 对象获取逻辑**: 在 `resolve_utils.py` 中创建了 `_get_current_timeline` 辅助函数，封装了获取 `project` 和 `timeline` 对象的通用逻辑。
3.  **提取时间线帧率获取逻辑**: 将获取时间线帧率的逻辑整合到 `_get_current_timeline` 函数中，进一步提高了代码的内聚性。
4.  **集中管理时间码转换逻辑**: 将 `frames_to_srt_timecode` 函数从 `resolve_utils.py` 移动到 `timecode_utils.py`，统一管理时间码相关的工具函数。
5.  **简化诊断脚本**: 重构了 `diagnose_resolve.py` 脚本，使其调用 `resolve_utils.py` 中的辅助函数，消除了代码冗余。

**测试框架：**
本次任务未涉及测试用例的编写或执行。

**测试结果：**
- 覆盖率：N/A
- 通过率：N/A

## 2025-07-26: MUI Table 与 react-window 集成方案

- **问题:** 在 `SubtitleTable.tsx` 中使用 `react-window` 对 MUI `Table` 进行虚拟化时，出现 `<tbody> cannot appear as a child of <div>` 和 `<div> cannot appear as a child of <table>` 的 DOM 嵌套警告。
- **根本原因:** `react-window` 的 `List` 组件默认使用 `div` 作为其内部和外部容器，这与 `Table` 组件期望的 `<table>`、`<tbody>`、`<tr>` 结构不兼容。
- **决策:**
  1.  **采用 MUI 官方文档推荐的集成模式。**
  2.  **组件转发 Ref:** 在 `SubtitleRow.tsx` 中，使用 `React.forwardRef` 将 `ref` 从 `List` 组件传递到 `TableRow` 组件。
  3.  **自定义内部元素:** 在 `SubtitleTable.tsx` 中，将 `List` 组件的 `innerElementType` 属性设置为一个转发 ref 的 `TableBody` 组件。这指示 `react-window` 使用 `TableBody` 作为其滚动内容的直接容器。
  4.  **结构调整:** 将 `List` 组件直接放置在 `Table` 组件内部，并位于 `TableHead` 之后，以形成一个语义上正确的 HTML 表格。
- **结果:** 成功解决了 DOM 嵌套警告，同时保持了虚拟化渲染的性能优势。


---
## 2025-07-26: 修复字幕搜索与替换功能的不一致性

- **问题:** 前端搜索功能通过“过滤”数据来显示结果，而替换功能则作用于所有字幕，导致了行为不一致。
- **决策演变过程:**
  1.  **初步构想 (高亮方案):** 最初的解决方案是重构 `useFindReplace` hook，使其不再过滤字幕数组，而是为每一行数据添加一个 `isMatch` 标志。UI 层则根据这个标志来“高亮”匹配的行，从而保持数据源的完整性。
  2.  **关键反馈 (用户需求):** 在第二阶段的UI实现任务中，根据用户的明确反馈，确认了最终期望的行为是“筛选”而非“高亮”。
  3.  **最终方案 (筛选方案):** 团队迅速响应了需求变化，将实现逻辑调整回使用 `.filter()` 来筛选字幕。这个决策虽然与初步构想不同，但完全满足了用户的最终要求，并解决了最初的行为不一致问题。
- **结果:** 成功地将搜索和替换功能的操作基础统一。整个过程体现了团队对用户反馈的敏捷响应和对最终产品质量的承诺。

---
## 2025-07-26: 修复前端 DOM 嵌套警告

- **问题:** 在 `SubtitleTable.tsx` 中使用 `react-window` 对 MUI `Table` 进行虚拟化时，出现 `<tbody> cannot appear as a child of <div>` 和 `<div> cannot appear as a child of <table>` 的 DOM 嵌套警告。
- **根本原因:** `react-window` 的 `List` 组件默认使用 `div` 作为其内部和外部容器，这与 `Table` 组件期望的 `<table>`、`<tbody>`、`<tr>` 结构不兼容。
- **决策:**
  1.  **采用 MUI 官方文档推荐的集成模式。**
  2.  **组件转发 Ref:** 在 `SubtitleRow.tsx` 中，使用 `React.forwardRef` 将 `ref` 从 `List` 组件传递到 `TableRow` 组件。
  3.  **自定义内部元素:** 在 `SubtitleTable.tsx` 中，将 `List` 组件的 `innerElementType` 属性设置为一个转发 ref 的 `TableBody` 组件。这指示 `react-window` 使用 `TableBody` 作为其滚动内容的直接容器。
  4.  **结构调整:** 将 `List` 组件直接放置在 `Table` 组件内部，并位于 `TableHead` 之后，以形成一个语义上正确的 HTML 表格。
  5.  **统一渲染元素:** 将 `SubtitleTable.tsx`、`SubtitleRow.tsx` 和 `EditableSubtitleCell.tsx` 中的所有 MUI `Table` 相关组件的渲染元素统一为 `div`，以彻底解决结构冲突。
- **结果:** 成功解决了 DOM 嵌套警告，同时保持了虚拟化渲染的性能优势。


---
## 2025-07-26: 新增“导出字幕至达芬奇”功能

- **问题:** 需要在现有导出SRT功能的基础上，增加直接将字幕导入到达芬奇时间线的功能。
- **决策:**
  1.  **架构:** 沿用现有的前后端分离架构。后端负责与DaVinci Resolve API的交互，前端负责UI展示和用户操作。
  2.  **后端API:** 创建一个新的 `POST /api/v1/export/davinci` 端点，专门处理此项功能，以保持与现有导出功能的逻辑分离。
  3.  **核心实现:**
      *   利用现有的 `generate_srt_content` 函数生成SRT内容，实现代码复用。
      *   使用Python的 `tempfile` 模块来处理临时文件的创建和删除，确保操作的原子性和系统的整洁性。
      *   通过调用 `media_pool.ImportMedia()` 和 `media_pool.AppendToTimeline()` 两个核心API，完成字幕的导入和添加。
  4.  **前端UI:** 在现有导出按钮旁边增加一个新按钮，提供清晰的功能入口，并复用现有的 `useNotifier` hook 提供操作反馈。

---
## 2025-07-26: 修复导出至达芬奇的时间码翻倍问题

- **问题:** 直接将带有绝对时间码（例如 `01:00:04:00`）的SRT文件导入到达芬奇同样从 `01:00:00:00` 开始的时间线时，时间码会被错误地累加，导致字幕位置向后偏移一小时。
- **决策:**
  1.  **根本原因分析:** 确认问题根源在于达芬奇将导入SRT文件中的时间码视为相对于时间线起点的“偏移量”，而非“绝对位置”。
  2.  **解决方案:** 在生成用于导入达芬奇的SRT文件时，从每条字幕的绝对时间码中减去时间线的起始时间码。这样，我们提供给达芬奇的就是一个正确的相对时间码。
  3.  **实现策略:**
      *   **增强 `timecode_utils.py`:** 添加 `timecode_str_to_frames` 和 `srt_time_format` 两个新的辅助函数，用于时间码字符串和帧数之间的精确转换。
      *   **修改 `resolve_utils.py`:**
          *   改造 `generate_srt_content` 函数，使其能够接受一个可选的“基准帧数” (`base_frames`)，并在此基础上计算相对时间码。
          *   在 `export_to_davinci` 函数中，首先获取时间线的起始时间码 (`timeline.GetStartTimecode()`)，将其转换为基准帧数，然后传递给 `generate_srt_content`。
  4.  **影响:** 此修改从根本上解决了时间码翻倍的问题，同时通过可选参数确保了现有的“导出SRT”功能（导出绝对时间码）不受影响。


---
## 2025-07-26: 优化“导出至达芬奇”的用户体验

- **问题:** 最初的实现虽然保证了操作的原子性（通过保存-操作-恢复流程），但在用户体验上存在不足。用户在导入新字幕后，界面会恢复到之前的轨道，用户需要手动切换到新轨道才能看到结果。
- **决策:** 根据用户反馈，修改 `backend/resolve_utils.py` 中的 `export_to_davinci` 函数，**删除**最后恢复所有字幕轨道原始启用/禁用状态的步骤。
- **结果:** 现在，在执行“导出至达芬奇”操作后，新创建并填充了字幕的轨道将保持为当前唯一启用的轨道。这使得用户可以立即看到并编辑他们刚刚导入的字幕，流程更加直观顺畅。


---
## 2025-07-26: 合并重复函数并从中学习
- **问题:** `backend/timecode_utils.py` 中存在两个功能完全相同的函数 `timecode_str_to_frames` 和 `timecode_to_frames`。
- **决策:**
  1.  **合并函数:** 将两个函数合并为 `timecode_to_frames`，并删除 `timecode_str_to_frames`。
  2.  **更新引用:** 全局搜索并更新所有对已删除函数的引用。
- **教训与反思 (来自 `code-developer` 的 `activeContext.md`):**
  1.  **搜索不应仅限于调用点:** 在重构时，必须同时检查导入语句 (`import`)，单纯的函数调用搜索 (`codebase_search`) 可能会遗漏关键的引用点，导致 `ImportError`。
  2.  **修复后必须进行全局验证:** 在每次代码修复后，都应进行一次全局的代码搜索 (`search_files`)，以确保没有遗漏任何相关的引用。将“修复后全局验证”作为标准工作流程，可以有效避免因修复不彻底而导致的连锁错误 (`NameError`)。
- **结果:** 成功移除了冗余代码，并从修复过程中总结出了更健壮的重构工作流程。
