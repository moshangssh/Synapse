# 新功能增强的影响分析

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