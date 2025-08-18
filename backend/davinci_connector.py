import sys
import os
import logging
import importlib.util
from schemas import ResolveErrorCode
from exceptions import ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError

# Configure logging
log_file = os.path.join(os.path.dirname(__file__), 'resolve_connection.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, mode='a', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

# Global variable to cache the Resolve connection
_resolve_connection = None

def _get_resolve_bmd():
    """
    Dynamically loads the DaVinci Resolve script module from its specific path
    to avoid conflicts with other modules like fusionscript.
    """
    if sys.platform.startswith("darwin"):
        script_module_path = "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules/DaVinciResolveScript.py"
    elif sys.platform.startswith("win") or sys.platform.startswith("cygwin"):
        script_module_path = os.getenv("PROGRAMDATA") + "\\Blackmagic Design\\DaVinci Resolve\\Support\\Developer\\Scripting\\Modules\\DaVinciResolveScript.py"
    elif sys.platform.startswith("linux"):
        script_module_path = "/opt/resolve/libs/Fusion/Modules/DaVinciResolveScript.py"
    else:
        raise ImportError("Unsupported operating system")

    if not os.path.exists(script_module_path):
        logging.error(f"DaVinci Resolve scripting module not found at path: {script_module_path}")
        return None

    try:
        # Load the module directly from the file path to ensure the correct one is used.
        spec = importlib.util.spec_from_file_location("DaVinciResolveScript", script_module_path)
        bmd = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(bmd)
        logging.info(f"Successfully imported DaVinciResolveScript module from: {script_module_path}")
        return bmd
    except Exception as e:
        logging.error(f"Failed to import DaVinci Resolve script module from {script_module_path}: {e}", exc_info=True)
        return None

def _connect_to_resolve(force_reconnect=False):
    """
    Loads the DaVinci Resolve script module and connects to the Resolve application.
    It will cache the connection globally to avoid reconnecting on every call.
    
    Args:
        force_reconnect (bool): If True, it will ignore the cached connection
                                and establish a new one.

    Returns a tuple (resolve, error), where resolve is the connection object
    and error is a dictionary with 'code' and 'message' if connection fails.
    """
    global _resolve_connection
    if _resolve_connection and not force_reconnect:
        logging.info("使用缓存的 DaVinci Resolve 连接。")
        return _resolve_connection, None

    dvr_script = _get_resolve_bmd()
    if not dvr_script:
        logging.error("DaVinci Resolve Scripting API module not found.")
        raise ResolveConnectionError("DaVinci Resolve Scripting API module not found.")

    try:
        # The official documentation is wrong, the scriptapp is in the fusionscript module
        # Use importlib to avoid static analysis warnings in development environments
        dvr_script = importlib.import_module('fusionscript')
    except ImportError:
        # Keep the original as a fallback
        pass

    try:
        logging.info("尝试连接到 DaVinci Resolve...")
        resolve = dvr_script.scriptapp("Resolve")
        if not resolve:
            logging.error("无法连接到 DaVinci Resolve。请确保 Resolve 正在运行。")
            _resolve_connection = None # Clear connection on failure
            raise ResolveConnectionError("无法连接到 DaVinci Resolve。请确保 Resolve 正在运行。")
        
        logging.info("成功连接到 DaVinci Resolve。")
        _resolve_connection = resolve # Cache the connection
        return resolve
    except Exception as e:
        logging.error(f"连接 DaVinci Resolve 时发生未知错误: {e}", exc_info=True)
        _resolve_connection = None # Clear connection on exception
        raise ResolveConnectionError(f"连接 DaVinci Resolve 时发生未知错误: {e}")


def get_current_timeline():
    """
    Connects to Resolve and retrieves the current timeline object and its frame rate.
    It will attempt to reconnect if the connection is lost.

    Returns:
        A tuple (resolve, project, timeline, frame_rate).
    
    Raises:
        ResolveConnectionError: If it cannot connect to Resolve.
        NoProjectOpenError: If no project is currently open.
        NoActiveTimelineError: If no timeline is active in the current project.
    """
    try:
        resolve = _connect_to_resolve()
        projectManager = resolve.GetProjectManager()
        project = projectManager.GetCurrentProject()
        if not project:
            raise NoProjectOpenError("未找到当前打开的项目。")
    except Exception as e:
        logging.warning(f"DaVinci Resolve 连接可能已断开，正在尝试重新连接... 错误: {e}")
        resolve = _connect_to_resolve(force_reconnect=True)
        projectManager = resolve.GetProjectManager()
        project = projectManager.GetCurrentProject()
        if not project:
            raise NoProjectOpenError("重新连接后仍未找到当前打开的项目。")


    timeline = project.GetCurrentTimeline()
    if not timeline:
        raise NoActiveTimelineError("项目中没有活动的（当前）时间线。")
    
    try:
        frame_rate_str = timeline.GetSetting('timelineFrameRate')
        frame_rate = float(frame_rate_str)
    except (ValueError, TypeError, AttributeError):
        logging.warning("无法获取时间线帧率，将使用默认值 24.0。")
        frame_rate = 24.0 # Default to a common frame rate

    return resolve, project, timeline, frame_rate