import pytest
from unittest.mock import patch, MagicMock

# A dummy decorator that does nothing
def dummy_with_timeline(func):
    def wrapper(*args, **kwargs):
        # This is the key change: the decorated function's arguments are passed here
        return func(*args, **kwargs)
    return wrapper

# Patch the real decorator with our dummy decorator *before* importing the module
patch('backend.decorators.with_timeline', dummy_with_timeline).start()

from backend.davinci_api import get_resolve_project_info, get_subtitle_tracks, get_resolve_subtitles, set_resolve_timecode, export_to_davinci
from backend.schemas import SubtitleExportRequest, SubtitleModel, DiffPart, SubtitleTrackInfo
from backend.exceptions import ResolveError, NoProjectOpenError

@patch('backend.davinci_api.get_current_timeline')
def test_get_resolve_project_info_success(mock_get_current_timeline):
    """Test successful retrieval of project info."""
    mock_project = MagicMock()
    mock_timeline = MagicMock()
    mock_project.GetName.return_value = "Test Project"
    mock_timeline.GetName.return_value = "Test Timeline"
    mock_get_current_timeline.return_value = (MagicMock(), mock_project, mock_timeline, 24.0)
    
    result = get_resolve_project_info()
    
    assert result["projectName"] == "Test Project"
    assert result["timelineName"] == "Test Timeline"

@patch('backend.davinci_api.get_current_timeline', side_effect=NoProjectOpenError("No project open"))
def test_get_resolve_project_info_no_project(mock_get_current_timeline):
    """Test NoProjectOpenError is raised."""
    with pytest.raises(NoProjectOpenError):
        get_resolve_project_info()

@patch('backend.davinci_api.get_current_timeline')
def test_get_subtitle_tracks_success(mock_get_current_timeline):
    """Test successful retrieval of subtitle tracks."""
    mock_timeline = MagicMock()
    mock_timeline.GetTrackCount.return_value = 2
    mock_timeline.GetTrackName.side_effect = ["Track 1", "Track 2"]
    mock_get_current_timeline.return_value = (MagicMock(), MagicMock(), mock_timeline, 24.0)
    
    result = get_subtitle_tracks()
    
    assert len(result) == 2
    assert isinstance(result[0], SubtitleTrackInfo)
    assert result[0].track_name == "Track 1"

@patch('backend.davinci_api.get_current_timeline')
def test_get_resolve_subtitles_success(mock_get_current_timeline):
    """Test successful retrieval of subtitles."""
    mock_timeline = MagicMock()
    mock_timeline.GetTrackCount.return_value = 1
    mock_timeline.GetItemListInTrack.return_value = [
        MagicMock(GetStart=lambda: 100, GetEnd=lambda: 200, GetName=lambda: "Subtitle 1"),
        MagicMock(GetStart=lambda: 300, GetEnd=lambda: 400, GetName=lambda: "Subtitle 2")
    ]
    mock_get_current_timeline.return_value = (MagicMock(), MagicMock(), mock_timeline, 24.0)
    
    result = get_resolve_subtitles()
    
    assert len(result["data"]) == 2
    assert result["data"][0]["text"] == "Subtitle 1"

@patch('backend.davinci_api.get_current_timeline')
def test_set_resolve_timecode_success(mock_get_current_timeline):
    """Test successful setting of timecode."""
    mock_timeline = MagicMock()
    mock_get_current_timeline.return_value = (MagicMock(), MagicMock(), mock_timeline, 24.0)
    
    set_resolve_timecode("00:00:01:00", "00:00:02:00", "start")
    
    mock_timeline.SetCurrentTimecode.assert_called_once_with("00:00:01:00")

@patch('backend.davinci_api.generate_srt_content')
@patch('backend.davinci_api.get_current_timeline')
def test_export_to_davinci_success(mock_get_current_timeline, mock_generate_srt_content):
    """Test successful export to DaVinci Resolve."""
    mock_timeline = MagicMock()
    mock_project = MagicMock()
    mock_media_pool = MagicMock()
    
    mock_project.GetMediaPool.return_value = mock_media_pool
    mock_timeline.GetStartTimecode.return_value = "00:00:00:00"
    mock_timeline.GetTrackCount.return_value = 1
    mock_timeline.AddTrack.return_value = True
    
    mock_generate_srt_content.return_value = "1\n00:00:01,000 --> 00:00:02,000\nSubtitle 1"
    mock_media_pool.ImportMedia.return_value = [MagicMock()]
    mock_media_pool.AppendToTimeline.return_value = True
    
    mock_get_current_timeline.return_value = (MagicMock(), mock_project, mock_timeline, 24.0)
    
    request = SubtitleExportRequest(
        frameRate=24.0,
        subtitles=[
            SubtitleModel(
                id=1,
                startTimecode="00:00:01:00",
                endTimecode="00:00:02:00",
                diffs=[DiffPart(type="added", value="Subtitle 1")]
            )
        ]
    )
    
    result = export_to_davinci(request)
    
    assert result["message"] == "成功将字幕导出至 DaVinci Resolve。"