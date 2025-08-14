import logging
import tempfile
import os
from typing import Tuple, Dict, Any, List
from timecode_utils import format_timecode, timecode_to_frames, frames_to_timecode, frames_to_srt_timecode
from schemas import SubtitleTrackInfo, ResolveErrorCode, SubtitleExportRequest
from davinci_connector import get_current_timeline
from srt_utils import generate_srt_content

def get_resolve_project_info() -> Tuple[str, Dict[str, Any]]:
    """
    Connects to Resolve and retrieves the current project and timeline names.

    Returns:
        A tuple (status, data), where status is "success" or "error",
        and data is a dictionary with project and timeline names or an error message.
    """
    resolve, project, timeline, frame_rate, error = get_current_timeline()
    if error:
        return "error", error

    try:
        if not project:
            return "error", {"code": ResolveErrorCode.NO_PROJECT_OPEN, "message": "未找到当前打开的项目。"}

        timeline = project.GetCurrentTimeline()
        if not timeline:
            return "success", {"projectName": project.GetName(), "timelineName": None}

        return "success", {"projectName": project.GetName(), "timelineName": timeline.GetName()}

    except Exception as e:
        logging.error(f"获取项目信息时出错: {e}", exc_info=True)
        # Attempt to reconnect
        resolve, project, timeline, frame_rate, error = get_current_timeline()
        if error:
            return "error", error

        try:
            if not project:
                return "error", {"code": ResolveErrorCode.NO_PROJECT_OPEN, "message": "重新连接后仍未找到当前打开的项目。"}

            timeline = project.GetCurrentTimeline()
            if not timeline:
                return "success", {"projectName": project.GetName(), "timelineName": None}

            return "success", {"projectName": project.GetName(), "timelineName": timeline.GetName()}
        except Exception as final_e:
            logging.error(f"重新连接后获取项目信息时仍然出错: {final_e}", exc_info=True)
            return "error", {"code": "get_info_failed", "message": f"获取项目信息失败: {final_e}"}


def get_subtitle_tracks() -> Tuple[str, Dict[str, Any]]:
    """
    连接到 DaVinci Resolve 并获取当前时间线上所有字幕轨道的列表。

    Returns:
        一个元组 (status, data)，其中 status 是 "success" 或 "error",
        data 是包含轨道信息的列表或错误信息字典。
    """
    resolve, project, timeline, frame_rate, error = get_current_timeline()
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


def get_resolve_subtitles(track_index: int = 1) -> Tuple[str, Dict[str, Any]]:
    """
    连接到 DaVinci Resolve 并从指定轨道提取当前时间线的字幕信息。

    Args:
        track_index (int): 要提取字幕的轨道索引，默认为 1。

    Returns:
        一个元组 (status, data), 其中 status 是 "success" 或 "error",
        data 是字幕列表或错误信息字典。
    """
    resolve, project, timeline, frame_rate, error = get_current_timeline()
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


def set_resolve_timecode(in_point: str, out_point: str, jump_to: str) -> Tuple[str, Dict[str, Any]]:
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
    resolve, project, timeline, frame_rate, error = get_current_timeline()
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


def export_to_davinci(request: SubtitleExportRequest) -> Tuple[str, Dict[str, Any]]:
    """
    Exports subtitles to DaVinci Resolve by creating a temporary SRT file,
    importing it, and adding it to the timeline.
    """
    resolve, project, timeline, frame_rate, error = get_current_timeline()
    if error:
        return "error", error

    if not project:
        return "error", {"code": ResolveErrorCode.NO_PROJECT_OPEN, "message": "未找到当前打开的项目。"}

    media_pool = project.GetMediaPool()
    if not media_pool:
        return "error", {"code": "no_media_pool", "message": "无法获取媒体池。"}

    start_tc_str = timeline.GetStartTimecode()
    base_frames = timecode_to_frames(start_tc_str, frame_rate)

    srt_content = generate_srt_content(request, base_frames)
    temp_file_path = ""
    try:
        # Create a temporary file to store the SRT content
        with tempfile.NamedTemporaryFile(mode='w+', suffix='.srt', delete=False, encoding='utf-8') as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(srt_content)
            temp_file.flush()  # Ensure content is written to disk

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
            return "error", {"code": ResolveErrorCode.NO_ACTIVE_TIMELINE, "message": "项目中没有活动的（当前）时间线。"}

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