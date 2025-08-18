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
    assert format_timecode(22, 24) == "00:00:00:22"
    assert format_timecode(23, 24) == "00:00:00:23"
    assert format_timecode(24, 24) == "00:00:01:00"
    assert format_timecode(172800, 24) == "02:00:00:00"