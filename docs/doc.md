### **故事标题**

重构 DaVinci API 以实现依赖注入和可测试性

### **状态 (Status)**

- [ ] Draft
- [x] Approved
- [x] InProgress
- [x] Review
- [x] Done

### **用户故事 (User Story)**

**作为一名** 开发者，
**我希望** 重构 `davinci_api.py`，使其通过显式函数参数接收 Resolve 的 `project` 和 `timeline` 对象，而不是通过 `@with_timeline` 装饰器隐式获取，
**以便于** 业务逻辑可以在没有 DaVinci Resolve 实时连接的情况下进行单元测试。

### **验收标准与测试方法 (Acceptance Criteria & Verification)**

| # | 验收标准 | 测试/验证方法 |
| :--- | :--- | :--- |
| **AC1** | `davinci_api.py` 中的所有函数都已更新为显式接收 `project` 和 `timeline` 参数。 | **代码审查**: 逐一检查 `davinci_api.py` 文件中的所有函数定义，确认其函数签名中包含了 `project` 和 `timeline` 参数，并且内部逻辑正确地使用了这些传入的参数。 |
| **AC2** | `@with_timeline` 装饰器已从 `davinci_api.py` 的所有函数中移除。 | **代码搜索与审查**: 在整个代码库中搜索 `@with_timeline`，确认其不再被用于 `davinci_api.py`。检查 `decorators.py` 文件，确认该装饰器的功能已被移除或简化。 |
| **AC3** | 所有相关的 API 路由（在 `routers/` 目录下）现在负责获取并注入 `project` 和 `timeline` 依赖。 | **代码审查**: 检查 `routers` 目录下的相关 API 端点，确认每个端点内部都包含了对 `get_current_timeline()` 的调用，并且其返回值被正确地传递给了业务逻辑函数。 |
| **AC4** | 所有应用程序功能（获取字幕、导出、设置时间码等）在重构后表现与之前完全一致，没有出现功能退化。 | **手动回归测试**: 启动应用程序，并手动执行以下核心流程： 1. 连接到 Resolve 并成功加载字幕轨道。 2. 导入一个 SRT 文件。 3. 在 UI 上对字幕进行修改。 4. 将修改后的字幕导出为 SRT 文件。 5. 将修改后的字幕写回到 DaVinci Resolve。 确保每个步骤都能成功完成。 |
| **AC5** | 新增的单元测试能够成功运行，并且能够在没有 DaVinci Resolve 运行的环境下通过。 | **自动化测试**: 1. 在**未启动 DaVinci Resolve** 的情况下，运行 `pytest` 或项目指定的测试命令。 2. 确认 `tests/test_davinci_api.py` 中的新测试用例能够成功执行并通过，证明其与 Resolve 环境的依赖已解耦。 |
| **AC6** | 外部 API 接口的 URL、请求方式和响应格式保持不变。 | **API 测试**: 使用 Postman 或类似的 API 测试工具，对 `/api/v1/subtitles`, `/api/v1/timeline/timecode` 等关键端点发送请求，确认其行为和响应结构与重构前完全一致。 |

### **任务 / 子任务 (Tasks / Subtasks)**

- [x] **Task 1 (重构)**: 修改 `davinci_api.py` 中的所有函数签名，为每个需要 Resolve 上下文的函数显式添加 `project` 和 `timeline` 参数。(AC: #1)
- [x] **Task 2 (重构)**: 移除或简化 `decorators.py` 中的 `@with_timeline` 装饰器，使其不再注入 `project` 和 `timeline` 对象。(AC: #2)
- [x] **Task 3 (重构)**: 修改 `routers/timeline.py`, `routers/subtitles.py` 和 `routers/project.py` 中的所有 API 端点，使其负责调用 `davinci_connector` 并将 `project` 和 `timeline` 对象传递给 `davinci_api` 函数。(AC: #3)
- [x] **Task 4 (测试)**: 编写一个新的单元测试文件（例如 `tests/test_davinci_api.py`），为 `davinci_api.py` 中的至少一个核心函数创建一个使用模拟对象的单元测试。(AC: #5)
- [x] **Task 5 (验证)**: 手动执行端到端的功能回归测试，并使用 API 工具验证接口契约。(AC: #4, AC: #6)

### **开发者说明 (Dev Notes)**

* **架构上下文**: 本次重构的核心是将当前基于**装饰器**的隐式依赖注入模式，转变为在**路由层**进行的显式**依赖注入 (Dependency Injection)** 模式。`davinci_connector.py` 负责连接和获取 Resolve 对象，`routers/*.py` 负责组合依赖，而 `davinci_api.py` 只负责接收依赖并执行纯业务逻辑。

* **受影响的关键文件**:
    * `davinci_api.py`: 所有函数签名都需要更改。
    * `decorators.py`: `@with_timeline` 将被修改或删除。
    * `routers/timeline.py`: 需要更新以注入依赖。
    * `routers/subtitles.py`: 需要更新以注入依赖。
    * `routers/project.py`: 需要更新以注入依赖。

* **测试 (Testing)**
    * **测试文件位置**: 在 `tests/` 目录下创建一个新的测试文件，例如 `tests/test_davinci_api.py`。
    * **测试标准**: 必须使用 `unittest.mock` 库来模拟 `project` 和 `timeline` 对象。测试用例不应包含任何对 DaVinci Resolve 的实际调用，必须能够在完全隔离的环境中运行。

### **变更日志 (Change Log)**

| 日期 | 版本 | 描述 | 作者 |
| :--- | :--- | :--- | :--- |
| 2025-09-05 | 1.0 | 初始故事草稿，包含子任务和验收标准。 | John (PM) |

### **开发代理记录 (Dev Agent Record)**

* **使用的代理模型**: dev (James)
* **调试日志参考**: 无
* **完成说明**: 已成功完成所有重构任务，包括修改 davinci_api.py 中的所有函数签名以显式接收 project 和 timeline 参数，移除 @with_timeline 装饰器，更新所有相关 API 路由以在路由层注入依赖，并编写了新的单元测试。
* **文件列表**: 
  * backend/davinci_api.py
  * backend/decorators.py
  * backend/routers/timeline.py
  * backend/routers/subtitles.py
  * backend/routers/project.py
  * backend/tests/test_davinci_api.py

### **质量保证结果 (QA Results)**

### Review Date: 2025-09-06

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

重构实现质量优秀。成功将基于装饰器的隐式依赖注入模式转换为在路由层进行的显式依赖注入模式，实现了业务逻辑与 DaVinci Resolve 环境的解耦。代码结构清晰，职责分离明确，符合 SOLID 原则。

### Refactoring Performed

无需额外重构，现有实现已达到高质量标准。

### Compliance Check

- Coding Standards: ✓ 代码风格一致，命名规范，注释充分
- Project Structure: ✓ 架构设计合理，文件组织良好
- Testing Strategy: ✓ 单元测试覆盖充分，测试用例设计合理
- All ACs Met: ✓ 所有6个验收标准均已满足

### Improvements Checklist

- [x] 验证了所有 davinci_api.py 函数签名已更新为显式接收 project 和 timeline 参数
- [x] 确认 @with_timeline 装饰器已从所有函数中移除
- [x] 验证所有路由层正确实现了依赖注入
- [x] 确认单元测试能够在无 DaVinci Resolve 环境下运行
- [x] 验证 API 接口契约保持不变
- [ ] 考虑为 export_to_davinci 函数添加更多单元测试（可选改进）
- [ ] 可以考虑添加集成测试来验证完整的 API 流程（可选改进）

### Security Review

没有发现安全问题。重构保持了原有的安全边界，没有引入新的攻击面。异常处理机制完善，错误信息不会泄露敏感信息。

### Performance Considerations

重构没有引入性能开销。依赖注入模式运行效率良好，连接缓存机制确保了资源利用效率。函数调用链路清晰，没有不必要的性能损耗。

### Files Modified During Review

无文件修改，现有实现已符合质量标准。

### Gate Status

Gate: PASS → qa.qaLocation/gates/refactor.davinci-api-dependency-injection-and-testability.yml
Risk profile: 无风险评估（风险较低）
NFR assessment: 通过

### Recommended Status

[✓ Ready for Done]