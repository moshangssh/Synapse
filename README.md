# Tauri + React + FastAPI 项目

这是一个使用 Tauri, React, 和 FastAPI 构建的桌面应用程序项目。

## 技术栈

- **前端:** React (TypeScript) + Vite
- **桌面应用框架:** Tauri
- **后端:** FastAPI (Python)

## 如何运行

1.  **安装前端依赖:**
    ```bash
    cd frontend/synapse
    npm install
    ```

2.  **安装后端依赖:**
    ```bash
    cd backend
    python -m venv env
    source env/bin/activate
    pip install -r requirements.txt
    ```

3.  **启动开发服务器:**
    ```bash
    cd frontend/synapse
    npm run tauri dev
    ```

## 项目结构

```
.
├── backend
│   ├── main.py
│   └── requirements.txt
├── frontend
│   └── synapse
│       ├── src
│       │   ├── App.tsx
│       │   └── ...
│       ├── src-tauri
│       │   └── tauri.conf.json
│       └── ...
└── README.md