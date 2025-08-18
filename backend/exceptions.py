class ResolveError(Exception):
    """DaVinci Resolve 相关操作的基础异常类。"""
    pass

class ResolveConnectionError(ResolveError):
    """当无法连接到 DaVinci Resolve 时抛出。"""
    pass

class NoProjectOpenError(ResolveError):
    """当没有打开的项目时抛出。"""
    pass

class NoActiveTimelineError(ResolveError):
    """当项目中没有活动时间线时抛出。"""
    pass