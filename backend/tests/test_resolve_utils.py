import pytest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from resolve_utils import set_resolve_timecode

@pytest.fixture
def mock_resolve_setup():
    """Provides a mocked Resolve and Timeline object for tests."""
    mock_timeline = MagicMock()
    mock_timeline.GetSetting.return_value = '24.0'
    
    mock_project = MagicMock()
    mock_project.GetCurrentTimeline.return_value = mock_timeline
    
    mock_project_manager = MagicMock()
    mock_project_manager.GetCurrentProject.return_value = mock_project
    
    mock_resolve = MagicMock()
    mock_resolve.GetProjectManager.return_value = mock_project_manager
    return mock_resolve, mock_timeline

@patch('resolve_utils._connect_to_resolve')
def test_set_resolve_timecode_jump_to_start(mock_connect, mock_resolve_setup):
    """Tests jumping to the start timecode."""
    mock_resolve, mock_timeline = mock_resolve_setup
    mock_connect.return_value = (mock_resolve, None)
    
    in_point = "01:00:00:00"
    out_point = "01:00:10:00"
    
    status, result = set_resolve_timecode(in_point=in_point, out_point=out_point, jump_to="start")
    
    assert status == "success"
    assert in_point in result["message"]
    mock_timeline.SetCurrentTimecode.assert_called_once_with(in_point)

@patch('resolve_utils._connect_to_resolve')
def test_set_resolve_timecode_jump_to_end(mock_connect, mock_resolve_setup):
    """Tests jumping to the end timecode."""
    mock_resolve, mock_timeline = mock_resolve_setup
    mock_connect.return_value = (mock_resolve, None)
    
    in_point = "01:00:00:00"
    out_point = "01:00:10:00"
    
    status, result = set_resolve_timecode(in_point=in_point, out_point=out_point, jump_to="end")
    
    assert status == "success"
    assert out_point in result["message"]
    mock_timeline.SetCurrentTimecode.assert_called_once_with(out_point)

@patch('resolve_utils._connect_to_resolve')
@patch('resolve_utils.timecode_to_frames')
@patch('resolve_utils.frames_to_timecode')
def test_set_resolve_timecode_jump_to_middle(mock_frames_to_tc, mock_tc_to_frames, mock_connect, mock_resolve_setup):
    """Tests jumping to the middle timecode."""
    mock_resolve, mock_timeline = mock_resolve_setup
    mock_connect.return_value = (mock_resolve, None)
    
    in_point = "01:00:00:00"
    out_point = "01:00:10:00"
    middle_point = "01:00:05:00"

    mock_tc_to_frames.side_effect = [0, 240]
    mock_frames_to_tc.return_value = middle_point
    
    status, result = set_resolve_timecode(in_point=in_point, out_point=out_point, jump_to="middle")
    
    assert status == "success"
    assert middle_point in result["message"]
    mock_timeline.SetCurrentTimecode.assert_called_once_with(middle_point)
    mock_tc_to_frames.assert_any_call(in_point, 24.0)
    mock_tc_to_frames.assert_any_call(out_point, 24.0)
    mock_frames_to_tc.assert_called_once_with(120, 24.0)

@patch('resolve_utils._connect_to_resolve')
def test_set_resolve_timecode_connection_error(mock_connect, mock_resolve_setup):
    """Tests handling of a Resolve connection error."""
    mock_resolve, _ = mock_resolve_setup
    error_message = {"code": "resolve_not_running", "message": "无法连接到 DaVinci Resolve。"}
    mock_connect.return_value = (None, error_message)
    
    status, result = set_resolve_timecode("00", "00", "start")
    
    assert status == "error"
    assert result == error_message

from resolve_utils import get_subtitle_tracks
from schemas import SubtitleTrackInfo

@patch('resolve_utils._get_current_timeline')
def test_get_subtitle_tracks_success(mock_get_timeline, mock_resolve_setup):
    """Tests successfully retrieving a list of subtitle tracks."""
    _, mock_timeline = mock_resolve_setup
    mock_get_timeline.return_value = (mock_timeline, 24.0, None)
    
    mock_timeline.GetTrackCount.return_value = 2
    mock_timeline.GetTrackName.side_effect = ["Track 1", "Track 2"]
    
    status, result = get_subtitle_tracks()
    
    assert status == "success"
    assert len(result["data"]) == 2
    assert result["data"][0] == SubtitleTrackInfo(track_index=1, track_name="Track 1")
    assert result["data"][1] == SubtitleTrackInfo(track_index=2, track_name="Track 2")
    mock_timeline.GetTrackCount.assert_called_once_with("subtitle")
    mock_timeline.GetTrackName.assert_any_call("subtitle", 1)
    mock_timeline.GetTrackName.assert_any_call("subtitle", 2)

@patch('resolve_utils._get_current_timeline')
def test_get_subtitle_tracks_no_tracks(mock_get_timeline, mock_resolve_setup):
    """Tests the case where there are no subtitle tracks on the timeline."""
    _, mock_timeline = mock_resolve_setup
    mock_get_timeline.return_value = (mock_timeline, 24.0, None)
    
    mock_timeline.GetTrackCount.return_value = 0
    
    status, result = get_subtitle_tracks()
    
    assert status == "success"
    assert result["data"] == []
    mock_timeline.GetTrackCount.assert_called_once_with("subtitle")

@patch('resolve_utils._get_current_timeline')
def test_get_subtitle_tracks_connection_error(mock_get_timeline):
    """Tests handling of a connection error when getting subtitle tracks."""
    error_message = {"code": "no_active_timeline", "message": "项目中没有活动的（当前）时间线。"}
    mock_get_timeline.return_value = (None, None, error_message)
    
    status, result = get_subtitle_tracks()
    
    assert status == "error"
    assert result == error_message