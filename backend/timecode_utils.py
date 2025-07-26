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
    """Converts a timecode string (e.g., '01:00:00:00') to total frames."""
    tc = Timecode(frame_rate, tc_str)
    return tc.frames - 1

def frames_to_timecode(frames: int, frame_rate: float) -> str:
    """Converts frame count to HH:MM:SS:FF."""
    return format_timecode(frames, frame_rate)

def frames_to_srt_timecode(frames: int, frame_rate: float) -> str:
    """Converts frame count to HH:MM:SS,ms SRT timecode format."""
    if frame_rate == 0:
        return "00:00:00,000"
    
    total_seconds = frames / frame_rate
    hours = int(total_seconds / 3600)
    minutes = int((total_seconds % 3600) / 60)
    seconds = int(total_seconds % 60)
    milliseconds = int((total_seconds - int(total_seconds)) * 1000)
    
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"