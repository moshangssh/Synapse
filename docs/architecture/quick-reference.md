# 快速参考 - 关键文件与入口点

### 理解系统的关键文件

* **前端入口**: `frontend/synapse/src/main.tsx`
* **后端入口**: `backend/main.py`
* **核心配置**: `frontend/synapse/tauri.conf.json` (定义了Tauri应用和后端sidecar)
* **核心后端业务逻辑**: `backend/davinci_api.py`, `backend/davinci_connector.py`
* **核心前端业务逻辑**: `frontend/synapse/src/stores/` (Zustand状态管理), `frontend/synapse/src/hooks/`
* **API定义**: `backend/routers/` 目录
* **数据模型/类型**: `frontend/synapse/src/types.ts`, `backend/schemas.py`

### 新功能增强的影响区域

根据PRD，新功能将主要影响以下区域：

* **后端**:
    * 需要创建新的路由文件 `backend/routers/optimizer.py`。
    * 需要创建新的业务逻辑文件 `backend/llm_optimizer.py`，用于处理缓存、调用LLM API和结果对齐。
* **前端**:
    * 需要修改 `frontend/synapse/src/components/layout/OptimizerSidebar.tsx` 以添加新的UI控件。
    * 需要创建新的UI组件，如 `SettingsModal.tsx` 和 `ResultReviewModal.tsx`。
    * 需要更新 `frontend/synapse/src/stores/` 中的状态管理逻辑，以处理API密钥和优化结果。
