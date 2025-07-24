import pytest
from backend.timecode_utils import format_timecode

def test_format_timecode_zero_frame_rate():
    """
    Test that format_timecode handles a frame rate of 0 correctly.
    """
    assert format_timecode(100, 0) == "00:00:00:00"

def test_format_timecode_zero_frame():
    """
    Test that format_timecode handles frame 0 correctly.
    """
    assert format_timecode(0, 24) == "00:00:00:00"

def test_format_timecode_normal():
    """
    Test that format_timecode works for a normal case.
    """
    # At 24 fps, frame 23 should be 00:00:00:23
    # The library is 1-based, so frame 23 is the 24th frame, which is 00:00:01:00.
    # The code adds 1 to the frame, so `format_timecode(23, 24)` will calculate for frame 24.
    # Let's test frame 22, which should be timecode 00:00:00:23
    assert format_timecode(22, 24) == "00:00:00:22"
    
    # Frame 24 should be 00:00:01:00
    assert format_timecode(23, 24) == "00:00:00:23"

    # A larger frame number
    # Frame 24 should be 00:00:01:00
    assert format_timecode(24, 24) == "00:00:01:00"

    # A larger frame number
    assert format_timecode(172800, 24) == "02:00:00:00"
