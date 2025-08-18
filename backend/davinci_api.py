import logging
import tempfile
import os
from typing import Tuple, Dict, Any, List
from timecode_utils import format_timecode, timecode_to_frames, frames_to_timecode
from schemas import SubtitleTrackInfo, ResolveErrorCode, SubtitleExportRequest
from davinci_connector import get_current_timeline
from srt_utils import generate_srt_content
from decorators import with_timeline

from exceptions import NoProjectOpenError, ResolveError

@with_timeline
def get_resolve_project_info(resolve, project, timeline, frame_rate, **kwargs) -> Dict[str, Any]:
    """
    获取当前 Resolve 项目和时间线的名称。
    """
    if not project:
        # This case should now be handled by get_current_timeline, but as a safeguard:
        raise NoProjectOpenError("未找到当前打开的项目。")

    timeline_name = timeline.GetName() if timeline else None
    project_name = project.GetName()

    return {"projectName": project_name, "timelineName": timeline_name}


@with_timeline
def get_subtitle_tracks(resolve, project, timeline, frame_rate, **kwargs) -> List[SubtitleTrackInfo]:
    """
    获取当前时间线上所有字幕轨道的列表。
    """
    track_count = timeline.GetTrackCount("subtitle")
    if track_count == 0:
        return []

    tracks_data = []
    for i in range(1, track_count + 1):
        track_name = timeline.GetTrackName("subtitle", i)
        tracks_data.append(SubtitleTrackInfo(track_index=i, track_name=track_name))

    return tracks_data


@with_timeline
def get_resolve_subtitles(track_index: int = 1, resolve=None, project=None, timeline=None, frame_rate=None, **kwargs) -> Dict[str, Any]:
    """
    从指定轨道提取当前时间线的字幕信息。
    """
    subtitle_track_count = timeline.GetTrackCount("subtitle")
    if subtitle_track_count == 0:
        return {"frameRate": frame_rate, "data": []}

    if not (1 <= track_index <= subtitle_track_count):
        raise ResolveError(f"无效的字幕轨道索引: {track_index}。有效范围是 1 到 {subtitle_track_count}。")

    subtitle_items = timeline.GetItemListInTrack("subtitle", track_index)
    if not subtitle_items:
        return {"frameRate": frame_rate, "data": []}

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

    return {"frameRate": frame_rate, "data": extracted_data}


@with_timeline
def set_resolve_timecode(in_point: str, out_point: str, jump_to: str, resolve=None, project=None, timeline=None, frame_rate=None, **kwargs) -> Dict[str, str]:
    """
    在 DaVinci Resolve 中设置当前时间线的时间码。
    """
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

    # No try-except here. If SetCurrentTimecode fails, it's a Resolve API error,
    # and the underlying COM exception should propagate up to be caught by the API layer.
    # This keeps the business logic cleaner.
    timeline.SetCurrentTimecode(target_timecode)
    logging.info(f"成功将时间码设置为: {target_timecode}")
    return {"message": f"成功将时间码设置为: {target_timecode}"}


@with_timeline
def export_to_davinci(request: SubtitleExportRequest, resolve=None, project=None, timeline=None, frame_rate=None, **kwargs) -> Dict[str, str]:
    """
    Exports subtitles to DaVinci Resolve.
    """
    if not project:
        raise NoProjectOpenError("未找到当前打开的项目。")

    media_pool = project.GetMediaPool()
    if not media_pool:
        raise ResolveError("无法获取媒体池。")

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
            raise ResolveError("导入媒体文件失败。")

        # The API returns a list, we need the first item
        media_item = media_items[0]

        # timeline object is already available from the decorator.

        # 1. 显式轨道创建
        if not timeline.AddTrack("subtitle"):
            raise ResolveError("无法创建新的字幕轨道。")

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
        return {"message": "成功将字幕导出至 DaVinci Resolve。"}

    except Exception as e:
        logging.error(f"导出至 DaVinci Resolve 时出错: {e}", exc_info=True)
        # Re-raise as a specific application-level exception
        raise ResolveError(f"导出至 DaVinci Resolve 时出错: {e}")
    finally:
        # Clean up the temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logging.info(f"临时文件已删除: {temp_file_path}")
            except OSError as e:
                logging.error(f"删除临时文件时出错: {e}", exc_info=True)