import pytest
from ..resolve_utils import format_timecode

def test_format_timecode_zero_frame():
    """
    Tests formatting for the first frame (frame 0).
    """
    assert format_timecode(0, 24) == "00:00:00:00"

def test_format_timecode_standard_24fps():
    """
    Tests a standard timecode at 24 fps.
    1 hour, 2 minutes, 3 seconds, 4 frames
    """
    # Frame number for 01:02:03:04
    frame_number = 89356
    assert format_timecode(frame_number, 24) == "01:02:03:04"

def test_format_timecode_different_framerates_drop_frame():
    """
    Tests timecode formatting at 29.97 fps (drop frame).
    The Timecode library uses a semicolon for drop-frame timecode.
    10 seconds and 4 frames
    """
    # Frame number for 00:00:10;04
    frame_number = 304
    assert format_timecode(frame_number, 29.97) == "00:00:10;04"

def test_format_timecode_large_frame_number():
    """
    Tests a large frame number to ensure calculation is correct.
    """
    # Frame number for 23:59:59:23
    frame_number = 2073599
    assert format_timecode(frame_number, 24) == "23:59:59:23"

def test_format_timecode_zero_framerate():
    """
    Tests that a frame rate of 0 is handled correctly.
    """
    assert format_timecode(100, 0) == "00:00:00:00"