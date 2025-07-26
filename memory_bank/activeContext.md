# 前端代码分析报告 (已完成)

## 1. 样式复用 (已完成)

**问题:**
在 `frontend/synapse/src/components/SubtitleTable.tsx` 和 `frontend/synapse/src/components/SubtitleRow.tsx` 中存在大量重复的样式定义。

**解决方案:**
1.  创建了 `frontend/synapse/src/components/sharedStyles.ts`。
2.  将共享样式移动到 `sharedStyles.ts`。
3.  更新了 `SubtitleTable.tsx` 和 `SubtitleRow.tsx` 以使用共享样式。

**结果:**
*   减少了代码重复，提高了样式的可维护性。

## 2. 逻辑复用 (已完成)

**问题:**
`frontend/synapse/src/hooks/useFindReplace.ts` 中的 `diff` 逻辑是可复用的。

**解决方案:**
1.  创建了 `frontend/synapse/src/utils/diff.ts`。
2.  将 `diff` 逻辑封装成 `calculateDiff` 函数。
3.  更新了 `useFindReplace.ts` 以使用该函数。

**结果:**
*   提高了 `diff` 逻辑的可复用性。

## 3. `FindReplace` 功能增强 (已完成)

**问题:**
`FindReplace` 组件缺少“大小写匹配”、“全词匹配”和“使用正则表达式”的功能。

**解决方案:**
1.  在 `useFindReplace.ts` 中添加了相关状态和逻辑。
2.  更新了 `FindReplace.tsx` 以支持这些新功能。
3.  更新了 `App.tsx` 和 `FindReplace.test.tsx` 以适应变化。

**结果:**
*   `FindReplace` 组件现在功能齐全。

## 4. API 调用逻辑抽象 (已完成)

**问题:**
`SubtitleTable.tsx` 中的 API 调用逻辑是硬编码的。

**解决方案:**
1.  创建了 `frontend/synapse/src/hooks/useTimelineNavigation.ts` hook。
2.  将 API 调用逻辑移动到该 hook 中。
3.  更新了 `SubtitleTable.tsx` 以使用该 hook。

**结果:**
*   提高了 API 调用逻辑的可复用性。

## 5. 组件进一步拆分 (已完成)

**问题:**
`SubtitleRow.tsx` 同时处理了展示和编辑逻辑。

**解决方案:**
1.  创建了 `frontend/synapse/src/components/EditableSubtitleCell.tsx` 组件。
2.  将编辑逻辑移动到 `EditableSubtitleCell.tsx`。
3.  更新了 `SubtitleRow.tsx` 以使用新组件。

**结果:**
*   `SubtitleRow.tsx` 的职责更单一，代码更清晰。
# 后端代码分析 (进行中)

## 1. `backend/main.py` 分析

**文件功能:**
- 定义了 FastAPI 应用的三个主要 API 端点：
  - `POST /api/v1/timeline/timecode`: 设置 Resolve 的时间码。
  - `GET /api/v1/subtitles`: 获取 Resolve 的字幕。
  - `POST /api/v1/export/srt`: 导出 SRT 字幕文件。

**初步发现:**
- **可复用的错误处理逻辑:** 在 `set_timecode` 和 `get_subtitles` 端点中，存在大量重复的 `if/elif` 错误处理代码。这部分代码可以被抽象成一个通用的错误处理函数，以提高代码的可维护性。

---
## 2. `backend/resolve_utils.py` 分析

**文件功能:**
- 封装了与 DaVinci Resolve Scripting API 交互的所有核心逻辑，包括连接、数据提取和控制。

**初步发现:**
- **可复用的 Resolve 对象获取逻辑:** 在 `get_resolve_subtitles` 和 `set_resolve_timecode` 函数中，获取 `project` 和 `timeline` 对象的代码是完全重复的。这部分逻辑可以被抽象成一个通用的辅助函数，例如 `_get_current_timeline()`。
- **可复用的帧率获取逻辑:** 获取时间线帧率 (`frame_rate`) 的 `try-except` 代码块在多个函数中重复出现。这个逻辑也可以被提取到一个单独的辅助函数中。

---
## 3. `backend/timecode_utils.py` 分析

**文件功能:**
- 提供了基于 `timecode` 库的帧数和时间码字符串之间的转换功能。

**初步发现:**
- **代码结构清晰:** 文件职责单一，代码简洁。
- **潜在的简化点:** `frames_to_timecode` 函数是 `format_timecode` 的一个别名。可以考虑直接使用 `format_timecode` 以减少函数层级。
- **功能扩展可能性:** `resolve_utils.py` 中有一个 `frames_to_srt_timecode` 函数，用于将帧数转换为 SRT 时间码格式。为了更好地组织代码，可以将这个函数也移动到 `timecode_utils.py` 中，使所有与时间码转换相关的逻辑都集中在一个地方。

---
## 4. `backend/schemas.py` 分析

**文件功能:**
- 使用 Pydantic 定义了所有 API 端点所需的数据模型。

**初步发现:**
- **模型定义清晰:** 使用了 `Enum` 和字段示例，是很好的实践。
- **相似的模型:** `SubtitleModel` (用于 SRT 导出) 和 `SubtitleItem` (用于 API 响应) 非常相似。它们都代表一条字幕，但内容字段不同 (`diffs` vs `text`)。
- **潜在的统一可能性:** 这两个模型可以被统一或通过继承来减少重复。例如，可以创建一个 `BaseSubtitle` 模型，或者在 `SubtitleItem` 中添加一个可选的 `diffs` 字段。虽然当前的分离是合理的，但在未来的重构中值得考虑。

---
## 5. `backend/diagnose_resolve.py` 分析

**文件功能:**
- 一个独立的诊断脚本，用于连接到 Resolve 并打印第一个字幕项的完整属性，以便于调试。

**初步发现:**
- **大量的代码重复:** 这个脚本与 `resolve_utils.py` 中的代码高度重复。它重新实现了连接 Resolve、获取项目和时间线、以及获取字幕项的逻辑。
- **未复用现有工具:** 该脚本没有调用 `resolve_utils.py` 中已有的函数，而是复制代码并进行修改，这导致了严重的代码冗余。
- **重构机会:** 这个脚本可以被极大地简化，通过调用 `resolve_utils.py` 中（经过重构后）的辅助函数来获取所需的对象，从而只关注其核心的诊断功能。

---
# 后端代码分析总结

经过对 `backend/` 目录下所有 Python 文件的分析，发现了以下几个主要的重复代码和可复用逻辑点：

## 1. 通用错误处理逻辑 (主要问题)
- **位置:** `backend/main.py` 中的 `set_timecode` 和 `get_subtitles` 端点。
- **问题:** 这两个函数中存在几乎完全相同的 `if/elif` 错误处理代码块。
- **建议:** 创建一个通用的错误处理函数，例如 `handle_resolve_error(error_code, error_message)`，以减少重复。

## 2. Resolve 对象获取逻辑
- **位置:** `backend/resolve_utils.py` 中的 `get_resolve_subtitles` 和 `set_resolve_timecode` 函数，以及 `backend/diagnose_resolve.py`。
- **问题:** 获取 DaVinci Resolve 的 `project` 和 `timeline` 对象的代码在多个地方重复。
- **建议:** 在 `resolve_utils.py` 中创建一个私有辅助函数，例如 `_get_current_timeline()`，来封装这部分逻辑。

## 3. 时间线帧率获取逻辑
- **位置:** `backend/resolve_utils.py` 中的 `get_resolve_subtitles` 和 `set_resolve_timecode` 函数。
- **问题:** 获取时间线帧率 (`frame_rate`) 的 `try-except` 代码块是重复的。
- **建议:** 将此逻辑包含在 `_get_current_timeline()` 辅助函数中，或提取到单独的函数中。

## 4. 时间码转换逻辑的集中管理
- **位置:** `backend/resolve_utils.py` 和 `backend/timecode_utils.py`。
- **问题:** `frames_to_srt_timecode` 函数位于 `resolve_utils.py`，而其他时间码转换函数位于 `timecode_utils.py`。
- **建议:** 将 `frames_to_srt_timecode` 函数移动到 `timecode_utils.py`，以集中管理所有时间码转换逻辑。

## 5. 相似的数据模型
- **位置:** `backend/schemas.py`。
- **问题:** `SubtitleModel` 和 `SubtitleItem` 模型非常相似。
- **建议:** 在未来的重构中可以考虑使用继承或可选字段来统一这两个模型。

**总结:** 后端代码功能完善，但存在明显的代码重复。通过提取辅助函数和更好地组织代码，可以显著提高其可维护性。

---