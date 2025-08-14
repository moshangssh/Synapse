import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the backend directory to the path so we can import the modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from davinci_api import get_resolve_project_info, get_subtitle_tracks, get_resolve_subtitles, set_resolve_timecode, export_to_davinci
from schemas import SubtitleExportRequest, SubtitleItem

class TestDavinciApi(unittest.TestCase):

    @patch('davinci_api.get_current_timeline')
    def test_get_resolve_project_info_success(self, mock_get_current_timeline):
        """Test successful retrieval of project info."""
        # Mock the timeline, project manager, and project
        mock_timeline = MagicMock()
        mock_project_manager = MagicMock()
        mock_project = MagicMock()
        mock_timeline.GetProjectManager.return_value = mock_project_manager
        mock_project_manager.GetCurrentProject.return_value = mock_project
        mock_project.GetName.return_value = "Test Project"
        mock_project.GetCurrentTimeline.return_value = None
        
        mock_get_current_timeline.return_value = (mock_timeline, 24.0, None)
        
        # Call the function
        status, result = get_resolve_project_info()
        
        # Assert the result
        self.assertEqual(status, "success")
        self.assertEqual(result["projectName"], "Test Project")
        self.assertIsNone(result["timelineName"])

    @patch('davinci_api.get_current_timeline')
    def test_get_subtitle_tracks_success(self, mock_get_current_timeline):
        """Test successful retrieval of subtitle tracks."""
        # Mock the timeline
        mock_timeline = MagicMock()
        mock_timeline.GetTrackCount.return_value = 2
        mock_timeline.GetTrackName.side_effect = ["Track 1", "Track 2"]
        
        mock_get_current_timeline.return_value = (mock_timeline, 24.0, None)
        
        # Call the function
        status, result = get_subtitle_tracks()
        
        # Assert the result
        self.assertEqual(status, "success")
        self.assertEqual(len(result["data"]), 2)
        self.assertEqual(result["data"][0].track_name, "Track 1")
        self.assertEqual(result["data"][1].track_name, "Track 2")

    @patch('davinci_api.get_current_timeline')
    def test_get_resolve_subtitles_success(self, mock_get_current_timeline):
        """Test successful retrieval of subtitles."""
        # Mock the timeline
        mock_timeline = MagicMock()
        mock_timeline.GetTrackCount.return_value = 1
        mock_timeline.GetItemListInTrack.return_value = [
            MagicMock(GetStart=MagicMock(return_value=100), GetEnd=MagicMock(return_value=200), GetName=MagicMock(return_value="Subtitle 1")),
            MagicMock(GetStart=MagicMock(return_value=300), GetEnd=MagicMock(return_value=400), GetName=MagicMock(return_value="Subtitle 2"))
        ]
        
        mock_get_current_timeline.return_value = (mock_timeline, 24.0, None)
        
        # Call the function
        status, result = get_resolve_subtitles()
        
        # Assert the result
        self.assertEqual(status, "success")
        self.assertEqual(len(result["data"]), 2)
        self.assertEqual(result["data"][0]["text"], "Subtitle 1")
        self.assertEqual(result["data"][1]["text"], "Subtitle 2")

    @patch('davinci_api.get_current_timeline')
    def test_set_resolve_timecode_success(self, mock_get_current_timeline):
        """Test successful setting of timecode."""
        # Mock the timeline
        mock_timeline = MagicMock()
        mock_get_current_timeline.return_value = (mock_timeline, 24.0, None)
        
        # Call the function
        status, result = set_resolve_timecode("00:00:01:00", "00:00:02:00", "start")
        
        # Assert the result
        self.assertEqual(status, "success")
        mock_timeline.SetCurrentTimecode.assert_called_once_with("00:00:01:00")

    @patch('davinci_api.get_current_timeline')
    @patch('davinci_api.generate_srt_content')
    def test_export_to_davinci_success(self, mock_generate_srt_content, mock_get_current_timeline):
        """Test successful export to DaVinci Resolve."""
        # Mock the timeline, project manager, project, and media pool
        mock_timeline = MagicMock()
        mock_project_manager = MagicMock()
        mock_project = MagicMock()
        mock_media_pool = MagicMock()
        
        mock_timeline.GetProjectManager.return_value = mock_project_manager
        mock_project_manager.GetCurrentProject.return_value = mock_project
        mock_project.GetMediaPool.return_value = mock_media_pool
        mock_timeline.GetStartTimecode.return_value = "00:00:00:00"
        mock_project.GetCurrentTimeline.return_value = mock_timeline
        mock_timeline.GetTrackCount.return_value = 1
        mock_timeline.AddTrack.return_value = True
        
        mock_get_current_timeline.return_value = (mock_timeline, 24.0, None)
        mock_generate_srt_content.return_value = "1\n00:00:01,000 --> 00:00:02,000\nSubtitle 1"
        mock_media_pool.ImportMedia.return_value = [MagicMock()]
        mock_media_pool.AppendToTimeline.return_value = True
        
        # Create a SubtitleExportRequest
        request = SubtitleExportRequest(
            frameRate=24.0,
            subtitles=[
                SubtitleItem(
                    id=1,
                    startTimecode="00:00:01:00",
                    endTimecode="00:00:02:00",
                    text="Subtitle 1",
                    diffs=[]
                )
            ]
        )
        
        # Call the function
        status, result = export_to_davinci(request)
        
        # Assert the result
        self.assertEqual(status, "success")

if __name__ == '__main__':
    unittest.main()