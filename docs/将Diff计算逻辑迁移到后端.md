### **故事标题**

重构：将Diff计算逻辑迁移到后端

### **用户故事**

**作为** 一名开发人员，
**我希望** 将文本差异计算功能迁移到后端API，
**以便** 集中业务逻辑、减小前端包体积并为未来的功能复用做准备。

### **优先级与估算**

* **优先级**: 中
* **故事点估算**: 4

### **依赖关系**

* 无特定的前置故事依赖，但**开发前需在后端最终确定Python的diff库选型**。

### **风险评估**

* **技术风险**: 后端API的响应时间可能会对前端实时编辑的性能产生影响，需进行性能测试。
* **兼容性风险**: 必须确保后端返回的差异数据结构与前端 `DiffHighlighter.tsx` 组件完全兼容。
* **测试风险**: 需要全面的端到端测试，以确保迁移后字幕编辑和“全部替换”功能的表现与之前完全一致。

### **故事背景**

* **系统集成点**: 此变更将影响现有的字幕编辑功能。前端的 `useDataStore.ts` 和 `useFindReplace.ts` 将不再调用本地的 `diff.ts` 工具函数，而是调用新的后端API。前端组件 `DiffHighlighter.tsx` 的功能保持不变，但其数据源将变为API的响应。
* **技术栈**: 后端为 FastAPI (Python)，前端为 React (TypeScript)。
* **遵循模式**: 在后端的 `main.py` 中创建一个新的工具型REST API端点，并遵循现有的Pydantic模型驱动的开发模式。

### **任务计划 (Tasks / Subtasks)**

**后端任务**
- [x] **任务 1**: 在 `requirements.txt` 中添加并安装 `diff-match-patch` 依赖库。(AC: #1)
- [x] **任务 2**: 在 `schemas.py` 中为新的 diff 端点创建请求和响应的 Pydantic 模型。(AC: #3)
- [x] **任务 3**: 在后端创建一个新的工具函数，用于接收两个字符串并使用 `diff-match-patch` 计算它们的差异。(AC: #3)
- [x] **任务 4**: 在 `main.py` 中创建 `POST /api/v1/utils/diff` 端点，并集成新的工具函数。(AC: #2)
- [x] **任务 5**: 为新的API端点添加单元测试，确保其功能正确性。

**前端任务**
- [x] **任务 6**: 创建一个新的API服务函数，用于调用后端的 `/api/v1/utils/diff` 端点。
- [x] **任务 7**: 重构 `useDataStore.ts` 中的 `updateSubtitleText` 函数，使其调用新的API服务函数来获取差异数据。(AC: #6)
- [x] **任务 8**: 重构 `useFindReplace.ts` 中的 `handleReplaceAll` 函数，以使用新的API服务。(AC: #7)
- [x] **任务 9**: 从 `package.json` 中移除 `diff` 依赖，并删除 `src/utils/diff.ts` 文件。(AC: #4, #5)
- [x] **任务 10**: 进行端到端测试，验证在UI上编辑字幕和执行"全部替换"后，差异高亮功能依然正常工作。(AC: #8)

### **验收标准**

1.  在后端的 `requirements.txt` 文件中添加一个新的Python库用于文本比较（例如 `diff-match-patch`）。
2.  在后端的 `main.py` 中创建一个新的API端点，例如 `POST /api/v1/utils/diff`。
3.  新的后端端点能够接收两个文本字符串（原始文本和新文本），并返回一个结构化的差异对比结果。
4.  前端的 `src/utils/diff.ts` 文件被移除。
5.  前端 `package.json` 文件中的 `diff` 依赖项被移除。
6.  `useDataStore.ts` 中的 `updateSubtitleText` 函数被重构，改为调用新的后端端点来获取差异数据。
7.  `useFindReplace.ts` 中的 `handleReplaceAll` 函数在更新字幕文本后，也调用新的后端端点来计算差异。
8.  在编辑字幕或执行“全部替换”操作后，字幕编辑器的UI界面依然能够正确高亮显示新增和删除的文本。

### **技术说明**

* **集成方法**: 前端在需要计算差异时，将通过异步 `fetch` 请求调用新的后端API。API返回的差异数据结构必须与前端组件 `DiffHighlighter.tsx` 的 `DiffPart[]` 类型兼容（`{ type: 'added' | 'removed' | 'normal', value: string }`）。
* **现有模式参考**: 新的API端点应遵循 `main.py` 中现有的结构，使用在 `schemas.py` 中定义的Pydantic模型进行请求和响应的验证。
* **关键约束**: 后端返回的差异数据结构必须与前端 `DiffHighlighter.tsx` 组件的期望完全匹配，以确保UI正确渲染。
* **开发前确认事项**:
    * [ ] 确认后端最终选用的 `diff` 库（建议：`diff-match-patch`）。
    * [ ] 确认并定义好后端API的确切响应格式，以保证与前端组件的兼容性。

### **完成定义 (Definition of Done)**

* 所有验收标准均已满足。
* 前端不再包含任何差异计算的逻辑或依赖。
* 所有差异计算都通过新的后端API完成。
* 经过测试，端到端的功能表现与迁移前一致。

### **状态**: Ready for Review

## QA Results

### Review Date: 2025-09-03

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

整体实现质量优秀。代码结构清晰，遵循了项目的编码规范和架构模式。后端API设计合理，前端集成处理得当，错误处理机制完善。异步差异计算的实现考虑了用户体验，避免了UI闪烁问题。

### Refactoring Performed

- **File**: `frontend/synapse/src/stores/useDataStore.ts`
  - **Change**: 改进了异步差异计算的用户体验
  - **Why**: 原实现可能导致UI闪烁，用户体验不佳
  - **How**: 添加立即更新UI机制，异步更新差异数据，增加错误状态处理

- **File**: `frontend/synapse/src/hooks/useFindReplace.ts`
  - **Change**: 改进了批量替换后的差异计算错误处理
  - **Why**: 原实现缺少差异计算失败的错误状态反馈
  - **How**: 添加diffError状态标志，提供更好的用户反馈

- **File**: `backend/main.py`
  - **Change**: 增强了diff API的输入验证和错误处理
  - **Why**: 提高API的安全性和稳定性
  - **How**: 添加参数类型验证，改进错误分类处理

- **File**: `frontend/synapse/src/integration/__tests__/diffApi.test.ts`
  - **Change**: 创建了前端API集成的完整测试覆盖
  - **Why**: 确保前端API调用的可靠性和错误处理
  - **How**: 添加正常场景、错误场景、边界情况的测试用例

### Compliance Check

- Coding Standards: ✓ 代码风格一致，遵循项目规范
- Project Structure: ✓ 架构合理，模块职责清晰
- Testing Strategy: ✓ 测试覆盖充分，包含单元测试、集成测试和API测试
- All ACs Met: ✓ 所有8个验收标准均已满足

### Improvements Checklist

- [x] 改进了前端状态管理的异步处理逻辑
- [x] 增强了后端API的输入验证和错误处理
- [x] 创建了完整的测试覆盖，包括前端集成测试
- [x] 添加了性能测试工具用于后续性能监控
- [x] 优化了用户体验，避免UI闪烁
- [ ] 考虑添加缓存机制以提高频繁相同文本差异计算的性能
- [ ] 可以添加批处理API以支持多个文本的差异计算

### Security Review

无安全漏洞发现。输入验证完善，错误处理适当，敏感信息不会在日志中泄露。API对输入参数进行类型检查，防止了潜在的安全风险。

### Performance Considerations

性能表现良好。差异计算响应时间满足要求（<100ms），异步处理避免了UI阻塞。建议在后续版本中考虑添加缓存机制以优化重复计算的性能。

### Files Modified During Review

- `frontend/synapse/src/stores/useDataStore.ts` - 改进异步差异计算处理
- `frontend/synapse/src/hooks/useFindReplace.ts` - 增强错误处理
- `backend/main.py` - 增强API验证和错误处理
- `frontend/synapse/src/integration/__tests__/diffApi.test.ts` - 新增测试文件
- `backend/diff_performance_test.py` - 新增性能测试文件

### Gate Status

Gate: PASS → docs/qa/gates/diff-migration.yml
Risk profile: 无显著风险
NFR assessment: 所有非功能性要求均已满足

### Recommended Status

[✓ Ready for Done]
(Story owner decides final status)