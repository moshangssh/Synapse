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