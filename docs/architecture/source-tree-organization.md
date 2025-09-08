# 源码树与模块组织

### 项目结构 (现状)

```plaintext
/
├── backend/                  # 后端FastAPI服务
│   ├── routers/              # API路由
│   ├── tests/                # 后端测试
│   ├── davinci_api.py        # Resolve API核心逻辑
│   ├── davinci_connector.py  # Resolve连接逻辑
│   ├── main.py               # FastAPI应用入口
│   └── text_utils.py         # 文本处理工具
└── frontend/synapse/         # 前端Tauri/React应用
    ├── src/
    │   ├── components/       # React组件
    │   ├── hooks/            # 自定义Hooks
    │   ├── pages/            # 页面组件
    │   ├── services/         # API服务调用
    │   ├── stores/           # Zustand状态
    │   ├── utils/            # 前端工具函数
    │   ├── App.tsx           # 应用主组件
    │   └── main.tsx          # 应用入口
    ├── tauri.conf.json       # Tauri应用配置
    └── package.json          # 前端依赖
````

### 关键模块及其用途

  * **`backend/davinci_connector.py`**: 负责建立和管理与DaVinci Resolve的连接，是整个系统与Resolve通信的基础。
  * **`backend/text_utils.py`**: 包含现有的文本处理逻辑（如去口水词、查找替换、差异计算），新功能将扩展或利用此模块。
  * **`frontend/synapse/src/stores/`**: 使用Zustand管理所有全局状态，如字幕列表、连接状态等。新功能的状态也将在此处管理。
  * **`frontend/synapse/src/components/layout/OptimizerSidebar.tsx`**: 现有的优化器侧边栏，新功能的触发点将集成于此。
