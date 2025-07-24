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