# 开发与部署

### 本地开发设置

1.  根据 `frontend/synapse/package.json` 安装npm依赖。
2.  根据 `backend/requirements.txt` 安装Python依赖。
3.  在 `frontend/synapse` 目录下运行 `npm run dev`，Tauri会自动启动前端开发服务器和后端sidecar服务。

### 构建与部署流程

  * **构建命令**: `npm run tauri build` 将前端和后端打包成一个独立的桌面应用安装包。
