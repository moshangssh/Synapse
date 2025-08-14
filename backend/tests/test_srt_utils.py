import unittest
import sys
import os

# Add the backend directory to the path so we can import the modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from srt_utils import generate_srt_content
from schemas import SubtitleExportRequest, SubtitleModel, DiffPart

class TestSrtUtils(unittest.TestCase):

    def test_generate_srt_content_basic(self):
        """Test basic SRT content generation."""
        # Create a SubtitleExportRequest
        request = SubtitleExportRequest(
            frameRate=24.0,
            subtitles=[
                SubtitleModel(
                    id=1,
                    startTimecode="00:00:01:00",
                    endTimecode="00:00:02:00",
                    
                    diffs=[DiffPart(type="added", value="Subtitle 1")]
                ),
                SubtitleModel(
                    id=2,
                    startTimecode="00:00:03:00",
                    endTimecode="00:00:04:00",
                    
                    diffs=[DiffPart(type="added", value="Subtitle 2")]
                )
            ]
        )
        
        # Call the function
        result = generate_srt_content(request)
        
        # Assert the result
        expected = "1\n00:00:01,000 --> 00:00:02,000\nSubtitle 1\n\n2\n00:00:03,000 --> 00:00:04,000\nSubtitle 2"
        self.assertEqual(result, expected)

    def test_generate_srt_content_with_base_frames(self):
        """Test SRT content generation with base frames."""
        # Create a SubtitleExportRequest
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
        
        # Call the function with base_frames
        result = generate_srt_content(request, base_frames=24)
        
        # Assert the result
        # The start time should be 00:00:00,000 (1 second - 1 second)
        # The end time should be 00:00:01,000 (2 seconds - 1 second)
        expected = "1\n00:00:00,000 --> 00:00:01,000\nSubtitle 1"
        self.assertEqual(result, expected)

    def test_generate_srt_content_with_removed_diffs(self):
        """Test SRT content generation with removed diffs."""
        # Create a SubtitleExportRequest with removed diffs
        request = SubtitleExportRequest(
            frameRate=24.0,
            subtitles=[
                SubtitleModel(
                    id=1,
                    startTimecode="00:00:01:00",
                    endTimecode="00:00:02:00",
                    
                    diffs=[
                        DiffPart(type="added", value="Subtitle "),
                        DiffPart(type="removed", value="Removed "),
                        DiffPart(type="added", value="1")
                    ]
                )
            ]
        )
        
        # Call the function
        result = generate_srt_content(request)
        
        # Assert the result
        # The removed text should not be in the final SRT content
        expected = "1\n00:00:01,000 --> 00:00:02,000\nSubtitle 1"
        self.assertEqual(result, expected)

if __name__ == '__main__':
    unittest.main()