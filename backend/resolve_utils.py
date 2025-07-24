import sys
import os
import logging
import importlib.util
from timecode_utils import format_timecode

# 配置日志记录
log_file = os.path.join(os.path.dirname(__file__), 'resolve_connection.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, mode='a', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

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

dvr_script = _get_resolve_bmd()
try:
    # The official documentation is wrong, the scriptapp is in the fusionscript module
    import fusionscript as dvr_script
except ImportError:
    # Keep the original as a fallback
    pass


def get_resolve_subtitles():
    """
    连接到 DaVinci Resolve 并提取当前时间线的字幕信息。
    返回一个元组 (status, data), 其中 status 是 "success" 或 "error", 
    data 是字幕列表或错误信息字典。
    """
    if not dvr_script:
        logging.error("DaVinci Resolve Scripting API module not found.")
        return "error", {"code": "dvr_script_not_found", "message": "DaVinci Resolve Scripting API module not found."}

    # 1. 连接到 DaVinci Resolve
    try:
        logging.info("尝试连接到 DaVinci Resolve...")
        resolve = dvr_script.scriptapp("Resolve")
        if not resolve:
            logging.error("无法连接到 DaVinci Resolve。请确保 Resolve 正在运行。")
            return "error", {"code": "resolve_not_running", "message": "无法连接到 DaVinci Resolve。请确保 Resolve 正在运行。"}
        logging.info("成功连接到 DaVinci Resolve。")
    except Exception as e:
        logging.error(f"连接 DaVinci Resolve 时发生未知错误: {e}", exc_info=True)
        return "error", {"code": "connection_error", "message": f"连接 DaVinci Resolve 时发生未知错误: {e}"}


    # 2. 获取项目和时间线
    projectManager = resolve.GetProjectManager()
    project = projectManager.GetCurrentProject()
    if not project:
        return "error", {"code": "no_project_open", "message": "未找到当前打开的项目。"}

    timeline = project.GetCurrentTimeline()
    if not timeline:
        return "error", {"code": "no_active_timeline", "message": "项目中没有活动的（当前）时间线。"}
        
    # 获取帧率用于时间码转换
    try:
        frame_rate_str = timeline.GetSetting('timelineFrameRate')
        frame_rate = float(frame_rate_str)
    except (ValueError, TypeError, AttributeError):
        # Fallback if the setting is not a number or not available
        frame_rate = 24.0 # Default to a common frame rate

    # 3. 访问字幕轨道
    subtitle_track_count = timeline.GetTrackCount("subtitle")
    if subtitle_track_count == 0:
        return "success", [] # 没有字幕轨道是正常情况，返回空列表

    # 假设我们总是从第一个字幕轨道提取
    subtitle_items = timeline.GetItemListInTrack("subtitle", 1)
    if not subtitle_items:
        return "success", [] # 字幕轨道为空是正常情况，返回空列表

    # 4. 遍历字幕条目并提取信息
    extracted_data = []
    for index, item in enumerate(subtitle_items):
        start_frame = item.GetStart()
        end_frame = item.GetEnd()
        
        text_content = item.GetName()

        start_timecode = format_timecode(start_frame, frame_rate)
        end_timecode = format_timecode(end_frame, frame_rate)

        subtitle_entry = {
            "id": index + 1,
            "startTimecode": start_timecode,
            "endTimecode": end_timecode,
            "text": text_content,
        }
        extracted_data.append(subtitle_entry)
        
    return "success", extracted_data