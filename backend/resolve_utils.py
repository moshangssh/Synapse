from typing import Tuple, Dict, Any
from timecode_utils import format_timecode, timecode_to_frames, frames_to_timecode, frames_to_srt_timecode
from schemas import ResolveErrorCode
from davinci_connector import get_current_timeline
import logging

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