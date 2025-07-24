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