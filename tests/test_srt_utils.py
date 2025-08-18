import unittest
import sys
import os

from backend.srt_utils import generate_srt_content
from backend.schemas import SubtitleExportRequest, SubtitleModel, DiffPart

class TestSrtUtils(unittest.TestCase):

    def test_generate_srt_content_basic(self):
        """Test basic SRT content generation."""
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
        
        result = generate_srt_content(request)
        
        expected = "1\n00:00:01,000 --> 00:00:02,000\nSubtitle 1\n\n2\n00:00:03,000 --> 00:00:04,000\nSubtitle 2"
        self.assertEqual(result, expected)

    def test_generate_srt_content_with_base_frames(self):
        """Test SRT content generation with base frames."""
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
        
        result = generate_srt_content(request, base_frames=24)
        
        expected = "1\n00:00:00,000 --> 00:00:01,000\nSubtitle 1"
        self.assertEqual(result, expected)

    def test_generate_srt_content_with_removed_diffs(self):
        """Test SRT content generation with removed diffs."""
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
        
        result = generate_srt_content(request)
        
        expected = "1\n00:00:01,000 --> 00:00:02,000\nSubtitle 1"
        self.assertEqual(result, expected)

if __name__ == '__main__':
    unittest.main()