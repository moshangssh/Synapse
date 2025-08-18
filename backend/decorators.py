from functools import wraps
from davinci_connector import get_current_timeline
from exceptions import ResolveError
from schemas import ResolveErrorCode

import os

def with_timeline(func):
    """
    一个装饰器，用于获取当前的DaVinci Resolve时间线信息，并将其作为参数传递给被装饰的函数。
    它简化了重复的 get_current_timeline 调用和错误处理。
    现在它会捕获 ResolveError 并将其转换为错误元组，以便在 API 层统一处理。
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            resolve, project, timeline, frame_rate = get_current_timeline()
            
            kwargs['resolve'] = resolve
            kwargs['project'] = project
            kwargs['timeline'] = timeline
            kwargs['frame_rate'] = frame_rate
            
            return func(*args, **kwargs)
        except ResolveError as e:
            # If in a test environment, re-raise the exception to be caught by pytest.
            if os.environ.get("TESTING"):
                raise e
            return "error", {"code": ResolveErrorCode.CONNECTION_ERROR, "message": str(e)}
    return wrapper