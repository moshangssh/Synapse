import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app

class TestMainAPI(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    @patch('main.set_resolve_timecode')
    def test_set_timecode_jump_to_start(self, mock_set_resolve_timecode):
        # Arrange
        in_point = "01:00:00:00"
        out_point = "01:00:10:00"
        jump_to = "start"
        mock_set_resolve_timecode.return_value = ("success", {"message": f"成功将时间码设置为: {in_point}"})

        # Act
        response = self.client.post(
            "/api/v1/timeline/timecode",
            json={"in_point": in_point, "out_point": out_point, "jump_to": jump_to}
        )

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success", "message": f"成功将时间码设置为: {in_point}"})
        mock_set_resolve_timecode.assert_called_once_with(in_point=in_point, out_point=out_point, jump_to=jump_to)

    @patch('main.set_resolve_timecode')
    def test_set_timecode_jump_to_end(self, mock_set_resolve_timecode):
        # Arrange
        in_point = "01:00:00:00"
        out_point = "01:00:10:00"
        jump_to = "end"
        mock_set_resolve_timecode.return_value = ("success", {"message": f"成功将时间码设置为: {out_point}"})

        # Act
        response = self.client.post(
            "/api/v1/timeline/timecode",
            json={"in_point": in_point, "out_point": out_point, "jump_to": jump_to}
        )

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success", "message": f"成功将时间码设置为: {out_point}"})
        mock_set_resolve_timecode.assert_called_once_with(in_point=in_point, out_point=out_point, jump_to=jump_to)

    @patch('main.set_resolve_timecode')
    def test_set_timecode_jump_to_middle(self, mock_set_resolve_timecode):
        # Arrange
        in_point = "01:00:00:00"
        out_point = "01:00:10:00"
        jump_to = "middle"
        middle_point = "01:00:05:00" # Assuming this is the calculated middle point
        mock_set_resolve_timecode.return_value = ("success", {"message": f"成功将时间码设置为: {middle_point}"})

        # Act
        response = self.client.post(
            "/api/v1/timeline/timecode",
            json={"in_point": in_point, "out_point": out_point, "jump_to": jump_to}
        )

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success", "message": f"成功将时间码设置为: {middle_point}"})
        mock_set_resolve_timecode.assert_called_once_with(in_point=in_point, out_point=out_point, jump_to=jump_to)

    @patch('main.set_resolve_timecode')
    def test_set_timecode_resolve_not_running(self, mock_set_resolve_timecode):
        """Test the endpoint when DaVinci Resolve is not running."""
        # Arrange
        in_point = "01:00:00:00"
        out_point = "01:00:10:00"
        jump_to = "start"
        error_message = {"code": "resolve_not_running", "message": "无法连接到 DaVinci Resolve。"}
        mock_set_resolve_timecode.return_value = ("error", error_message)

        # Act
        response = self.client.post("/api/v1/timeline/timecode", json={"in_point": in_point, "out_point": out_point, "jump_to": jump_to})

        # Assert
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()['detail']['code'], "resolve_not_running")

if __name__ == '__main__':
    unittest.main(argv=['first-arg-is-ignored'], exit=False)

    @patch('main.get_subtitle_tracks')
    def test_get_subtitle_tracks_success(self, mock_get_tracks):
        """Test successfully getting the list of subtitle tracks."""
        # Arrange
        mock_data = [
            {"track_index": 1, "track_name": "English-Sub"},
            {"track_index": 2, "track_name": "Spanish-Sub"}
        ]
        mock_get_tracks.return_value = ("success", {"data": mock_data})

        # Act
        response = self.client.get("/api/v1/timeline/subtitle_tracks")

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success", "data": mock_data})
        mock_get_tracks.assert_called_once()

    @patch('main.get_subtitle_tracks')
    def test_get_subtitle_tracks_no_tracks(self, mock_get_tracks):
        """Test getting an empty list when there are no subtitle tracks."""
        # Arrange
        mock_get_tracks.return_value = ("success", {"data": []})

        # Act
        response = self.client.get("/api/v1/timeline/subtitle_tracks")

        # Assert
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success", "data": []})
        mock_get_tracks.assert_called_once()

    @patch('main.get_subtitle_tracks')
    def test_get_subtitle_tracks_resolve_error(self, mock_get_tracks):
        """Test handling an error from Resolve, like no active timeline."""
        # Arrange
        error_message = {"code": "no_active_timeline", "message": "No active timeline in the project."}
        mock_get_tracks.return_value = ("error", error_message)

        # Act
        response = self.client.get("/api/v1/timeline/subtitle_tracks")

        # Assert
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['detail']['code'], "no_active_timeline")
        mock_get_tracks.assert_called_once()