from timecode import Timecode

def format_timecode(frame, frame_rate):
    """将帧数转换为 HH:MM:SS:FF 格式的时间码"""
    if frame_rate == 0:
        return "00:00:00:00"
    
    # The Timecode library is 1-based. Frame 0 is a special case.
    if frame == 0:
        return "00:00:00:00"

    # Add 1 to the frame to match the 1-based indexing of the library
    tc = Timecode(frame_rate, frames=int(frame) + 1)
    return str(tc)

def timecode_to_frames(tc_str: str, frame_rate: float) -> int:
    """Converts HH:MM:SS:FF to frame count."""
    tc = Timecode(frame_rate, tc_str)
    return tc.frames - 1

def frames_to_timecode(frames: int, frame_rate: float) -> str:
    """Converts frame count to HH:MM:SS:FF."""
    return format_timecode(frames, frame_rate)