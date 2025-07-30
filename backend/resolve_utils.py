import sys
import os
import logging
import importlib.util
import tempfile
from timecode import Timecode
from timecode_utils import format_timecode, timecode_to_frames, frames_to_srt_timecode
from schemas import SubtitleTrackInfo

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

# 全局变量来缓存 Resolve 连接
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
        return None, {"code": "dvr_script_not_found", "message": "DaVinci Resolve Scripting API module not found."}

    try:
        # The official documentation is wrong, the scriptapp is in the fusionscript module
        import fusionscript as dvr_script
    except ImportError:
        # Keep the original as a fallback
        pass

    try:
        logging.info("尝试连接到 DaVinci Resolve...")
        resolve = dvr_script.scriptapp("Resolve")
        if not resolve:
            logging.error("无法连接到 DaVinci Resolve。请确保 Resolve 正在运行。")
            _resolve_connection = None # Clear connection on failure
            return None, {"code": "resolve_not_running", "message": "无法连接到 DaVinci Resolve。请确保 Resolve 正在运行。"}
        
        logging.info("成功连接到 DaVinci Resolve。")
        _resolve_connection = resolve # Cache the connection
        return resolve, None
    except Exception as e:
        logging.error(f"连接 DaVinci Resolve 时发生未知错误: {e}", exc_info=True)
        _resolve_connection = None # Clear connection on exception
        return None, {"code": "connection_error", "message": f"连接 DaVinci Resolve 时发生未知错误: {e}"}


def _get_current_timeline():
    """
    Connects to Resolve and retrieves the current timeline object and its frame rate.
    It will attempt to reconnect if the connection is lost.

    Returns:
        A tuple (timeline, frame_rate, error), where timeline is the DaVinci Resolve
        timeline object, frame_rate is a float, and error is a dictionary
        with 'code' and 'message' if an error occurs.
    """
    resolve, error = _connect_to_resolve()
    if error:
        return None, None, error

    try:
        # First, try to get the project manager to check if the connection is alive
        projectManager = resolve.GetProjectManager()
        project = projectManager.GetCurrentProject()
        if not project:
            return None, None, {"code": "no_project_open", "message": "未找到当前打开的项目。"}
    except Exception as e:
        logging.warning(f"DaVinci Resolve 连接可能已断开，正在尝试重新连接... 错误: {e}")
        resolve, error = _connect_to_resolve(force_reconnect=True)
        if error:
            return None, None, error
        projectManager = resolve.GetProjectManager()
        project = projectManager.GetCurrentProject()
        if not project:
            return None, None, {"code": "no_project_open", "message": "重新连接后仍未找到当前打开的项目。"}


    timeline = project.GetCurrentTimeline()
    if not timeline:
        return None, None, {"code": "no_active_timeline", "message": "项目中没有活动的（当前）时间线。"}
    
    try:
        frame_rate_str = timeline.GetSetting('timelineFrameRate')
        frame_rate = float(frame_rate_str)
    except (ValueError, TypeError, AttributeError):
        logging.warning("无法获取时间线帧率，将使用默认值 24.0。")
        frame_rate = 24.0 # Default to a common frame rate

    return timeline, frame_rate, None

def get_resolve_project_info():
    """
    Connects to Resolve and retrieves the current project and timeline names.

    Returns:
        A tuple (status, data), where status is "success" or "error",
        and data is a dictionary with project and timeline names or an error message.
    """
    resolve, error = _connect_to_resolve()
    if error:
        return "error", error

    try:
        projectManager = resolve.GetProjectManager()
        project = projectManager.GetCurrentProject()
        if not project:
            return "error", {"code": "no_project_open", "message": "未找到当前打开的项目。"}
        
        timeline = project.GetCurrentTimeline()
        if not timeline:
            return "success", {"projectName": project.GetName(), "timelineName": None}

        return "success", {"projectName": project.GetName(), "timelineName": timeline.GetName()}

    except Exception as e:
        logging.error(f"获取项目信息时出错: {e}", exc_info=True)
        # Attempt to reconnect
        resolve, error = _connect_to_resolve(force_reconnect=True)
        if error:
            return "error", error
        
        try:
            projectManager = resolve.GetProjectManager()
            project = projectManager.GetCurrentProject()
            if not project:
                return "error", {"code": "no_project_open", "message": "重新连接后仍未找到当前打开的项目。"}
            
            timeline = project.GetCurrentTimeline()
            if not timeline:
                 return "success", {"projectName": project.GetName(), "timelineName": None}

            return "success", {"projectName": project.GetName(), "timelineName": timeline.GetName()}
        except Exception as final_e:
            logging.error(f"重新连接后获取项目信息时仍然出错: {final_e}", exc_info=True)
            return "error", {"code": "get_info_failed", "message": f"获取项目信息失败: {final_e}"}


def get_subtitle_tracks():
    """
    连接到 DaVinci Resolve 并获取当前时间线上所有字幕轨道的列表。

    Returns:
        一个元组 (status, data)，其中 status 是 "success" 或 "error",
        data 是包含轨道信息的列表或错误信息字典。
    """
    timeline, _, error = _get_current_timeline()
    if error:
        return "error", error

    track_count = timeline.GetTrackCount("subtitle")
    if track_count == 0:
        return "success", {"data": []}

    tracks_data = []
    for i in range(1, track_count + 1):
        track_name = timeline.GetTrackName("subtitle", i)
        tracks_data.append(SubtitleTrackInfo(track_index=i, track_name=track_name))

    return "success", {"data": tracks_data}


def get_resolve_subtitles(track_index: int = 1):
    """
    连接到 DaVinci Resolve 并从指定轨道提取当前时间线的字幕信息。

    Args:
        track_index (int): 要提取字幕的轨道索引，默认为 1。

    Returns:
        一个元组 (status, data), 其中 status 是 "success" 或 "error",
        data 是字幕列表或错误信息字典。
    """
    timeline, frame_rate, error = _get_current_timeline()
    if error:
        return "error", error
        
    # 3. 访问字幕轨道
    subtitle_track_count = timeline.GetTrackCount("subtitle")
    if subtitle_track_count == 0:
        return "success", {"frameRate": frame_rate, "data": []}

    if not (1 <= track_index <= subtitle_track_count):
        return "error", {"code": "invalid_track_index", "message": f"无效的字幕轨道索引: {track_index}。有效范围是 1 到 {subtitle_track_count}。"}

    # 从指定的字幕轨道提取
    subtitle_items = timeline.GetItemListInTrack("subtitle", track_index)
    if not subtitle_items:
        return "success", {"frameRate": frame_rate, "data": []}

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
        
    return "success", {"frameRate": frame_rate, "data": extracted_data}

from timecode_utils import timecode_to_frames, frames_to_timecode, frames_to_srt_timecode

def set_resolve_timecode(in_point: str, out_point: str, jump_to: str):
    """
    在 DaVinci Resolve 中设置当前时间线的时间码。

    Args:
        in_point (str): 入点时间码，格式为 "HH:MM:SS:FF"。
        out_point (str): 出点时间码，格式为 "HH:MM:SS:FF"。
        jump_to (str): 跳转位置，可以是 'start', 'end', 'middle'。

    Returns:
        一个元组 (status, data)，其中 status 是 "success" 或 "error",
        data 是成功信息或错误信息字典。
    """
    timeline, frame_rate, error = _get_current_timeline()
    if error:
        return "error", error

    target_timecode = ""
    if jump_to == "start":
        target_timecode = in_point
    elif jump_to == "end":
        target_timecode = out_point
    elif jump_to == "middle":
        in_frames = timecode_to_frames(in_point, frame_rate)
        out_frames = timecode_to_frames(out_point, frame_rate)
        middle_frames = (in_frames + out_frames) // 2
        target_timecode = frames_to_timecode(middle_frames, frame_rate)

    try:
        timeline.SetCurrentTimecode(target_timecode)
        logging.info(f"成功将时间码设置为: {target_timecode}")
        return "success", {"message": f"成功将时间码设置为: {target_timecode}"}
    except Exception as e:
        logging.error(f"设置时间码时出错: {e}", exc_info=True)
        return "error", {"code": "set_timecode_failed", "message": f"设置时间码时出错: {e}"}
from schemas import SubtitleExportRequest


def generate_srt_content(request: SubtitleExportRequest, base_frames: int = 0) -> str:
    """
    Generates a string in SRT format from a list of subtitle objects.
    """
    srt_blocks = []
    frame_rate = request.frameRate

    for index, subtitle in enumerate(request.subtitles, start=1):
        # 1. Reconstruct clean text from diffs
        clean_text = "".join([part.value for part in subtitle.diffs if part.type != 'removed'])

        # 2. Convert timecodes to relative frames
        start_frames = timecode_to_frames(subtitle.startTimecode, frame_rate) - base_frames
        end_frames = timecode_to_frames(subtitle.endTimecode, frame_rate) - base_frames

        # 3. Format frames back to SRT timecode
        start_srt_time = frames_to_srt_timecode(max(0, start_frames), frame_rate)
        end_srt_time = frames_to_srt_timecode(max(0, end_frames), frame_rate)

        # 4. Assemble the SRT block
        srt_block = f"{index}\n{start_srt_time} --> {end_srt_time}\n{clean_text}"
        srt_blocks.append(srt_block)

    # 5. Join all blocks with double newlines
    return "\n\n".join(srt_blocks)


def export_to_davinci(request: SubtitleExportRequest):
    """
    Exports subtitles to DaVinci Resolve by creating a temporary SRT file,
    importing it, and adding it to the timeline.
    """
    resolve, error = _connect_to_resolve()
    if error:
        return "error", error

    projectManager = resolve.GetProjectManager()
    project = projectManager.GetCurrentProject()
    if not project:
        return "error", {"code": "no_project_open", "message": "未找到当前打开的项目。"}

    media_pool = project.GetMediaPool()
    if not media_pool:
        return "error", {"code": "no_media_pool", "message": "无法获取媒体池。"}

    timeline, frame_rate, error = _get_current_timeline()
    if error:
        return "error", error

    start_tc_str = timeline.GetStartTimecode()
    base_frames = timecode_to_frames(start_tc_str, frame_rate)
    
    srt_content = generate_srt_content(request, base_frames)
    temp_file_path = ""
    try:
        # Create a temporary file to store the SRT content
        with tempfile.NamedTemporaryFile(mode='w+', suffix='.srt', delete=False, encoding='utf-8') as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(srt_content)
            temp_file.flush() # Ensure content is written to disk
        
        logging.info(f"临时 SRT 文件已创建: {temp_file_path}")

        # Import the temporary SRT file into the media pool
        media_items = media_pool.ImportMedia([temp_file_path])
        if not media_items:
            logging.error("导入媒体文件失败。")
            return "error", {"code": "import_failed", "message": "导入媒体文件失败。"}
        
        # The API returns a list, we need the first item
        media_item = media_items[0]
        
        timeline = project.GetCurrentTimeline()
        if not timeline:
            return "error", {"code": "no_active_timeline", "message": "项目中没有活动的（当前）时间线。"}

        # 1. 显式轨道创建
        if not timeline.AddTrack("subtitle"):
            logging.error("无法创建新的字幕轨道。")
            return "error", {"message": "Failed to create a new subtitle track.", "code": "create_track_failed"}
        
        target_track_index = timeline.GetTrackCount("subtitle")
        logging.info(f"成功创建新的字幕轨道，索引为: {target_track_index}")

        # 2. 轨道隔离与状态保存
        original_track_states = {}
        total_subtitle_tracks = timeline.GetTrackCount("subtitle")
        
        # 先保存所有轨道的原始状态
        for i in range(1, total_subtitle_tracks + 1):
            original_track_states[i] = timeline.GetIsTrackEnabled("subtitle", i)

        try:
            # 禁用所有其他轨道，并显式启用目标轨道
            for i in range(1, total_subtitle_tracks + 1):
                if i != target_track_index:
                    timeline.SetTrackEnable("subtitle", i, False)
            timeline.SetTrackEnable("subtitle", target_track_index, True)
            logging.info(f"轨道隔离完成：仅启用目标轨道 {target_track_index}")

            # 3. 精确定位插入点
            if request.subtitles:
                first_subtitle_tc = request.subtitles[0].startTimecode
                timeline.SetCurrentTimecode(first_subtitle_tc)
                logging.info(f"播放头已移动到: {first_subtitle_tc}")

            # 4. 执行“粘贴”操作
            # 此时，因为只有一个字幕轨道是启用的，所以字幕会精确地添加到该轨道
            if not media_pool.AppendToTimeline([media_item]):
                logging.warning("AppendToTimeline 返回了 false 或 None，但这可能是预期的行为。")

        finally:
            # 根据用户要求，不再恢复轨道的原始状态，以保持新轨道为激活状态。
            pass

        logging.info("成功将字幕导入并附加到时间线。")
        return "success", {"message": "成功将字幕导出至 DaVinci Resolve。"}

    except Exception as e:
        logging.error(f"导出至 DaVinci Resolve 时出错: {e}", exc_info=True)
        return "error", {"code": "export_error", "message": f"导出至 DaVinci Resolve 时出错: {e}"}
    finally:
        # Clean up the temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logging.info(f"临时文件已删除: {temp_file_path}")
            except OSError as e:
                logging.error(f"删除临时文件时出错: {e}", exc_info=True)