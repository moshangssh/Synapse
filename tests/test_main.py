import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.main import app
from backend.exceptions import ResolveConnectionError, NoActiveTimelineError
from backend.schemas import SubtitleModel, DiffPart

client = TestClient(app)

@patch('backend.main.set_resolve_timecode')
def test_set_timecode_success(mock_set_resolve_timecode):
    in_point = "01:00:00:00"
    out_point = "01:00:10:00"
    jump_to = "start"
    mock_set_resolve_timecode.return_value = {"message": f"成功将时间码设置为: {in_point}"}

    response = client.post(
        "/api/v1/timeline/timecode",
        json={"in_point": in_point, "out_point": out_point, "jump_to": jump_to}
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success", "message": f"成功将时间码设置为: {in_point}"}
    mock_set_resolve_timecode.assert_called_once_with(in_point=in_point, out_point=out_point, jump_to=jump_to)

@patch('backend.main.set_resolve_timecode', side_effect=ResolveConnectionError("无法连接到 DaVinci Resolve。"))
def test_set_timecode_resolve_not_running(mock_set_resolve_timecode):
    """Test the endpoint when DaVinci Resolve is not running."""
    in_point = "01:00:00:00"
    out_point = "01:00:10:00"
    jump_to = "start"

    response = client.post("/api/v1/timeline/timecode", json={"in_point": in_point, "out_point": out_point, "jump_to": jump_to})

    assert response.status_code == 503
    assert "无法连接到 DaVinci Resolve" in response.json()['detail']['message']

@patch('backend.main.get_subtitle_tracks')
def test_get_subtitle_tracks_success(mock_get_tracks):
    """Test successfully getting the list of subtitle tracks."""
    mock_data = [
        {"track_index": 1, "track_name": "English-Sub"},
        {"track_index": 2, "track_name": "Spanish-Sub"}
    ]
    mock_get_tracks.return_value = mock_data

    response = client.get("/api/v1/timeline/subtitle_tracks")

    assert response.status_code == 200
    assert response.json() == {"status": "success", "data": mock_data}
    mock_get_tracks.assert_called_once()

@patch('backend.main.get_subtitle_tracks', side_effect=NoActiveTimelineError("No active timeline in the project."))
def test_get_subtitle_tracks_resolve_error(mock_get_tracks):
    """Test handling an error from Resolve, like no active timeline."""
    response = client.get("/api/v1/timeline/subtitle_tracks")

    assert response.status_code == 503
    assert "No active timeline" in response.json()['detail']['message']
    mock_get_tracks.assert_called_once()

@patch('backend.main.generate_srt_content')
def test_export_subtitles_as_srt_success(mock_generate_srt_content):
    """Test successfully exporting subtitles as SRT."""
    mock_srt_content = "1\n00:00:01,000 --> 00:00:04,000\nHello, world!"
    mock_generate_srt_content.return_value = mock_srt_content
    
    request_data = {
        "frameRate": 24.0,
        "subtitles": [
            {
                "id": 1,
                "startTimecode": "00:00:01:00",
                "endTimecode": "00:00:04:00",
                "diffs": [{"type": "added", "value": "Hello, world!"}]
            }
        ]
    }

    response = client.post("/api/v1/export/srt", json=request_data)

    assert response.status_code == 200
    assert response.text == mock_srt_content
    assert response.headers['content-type'] == 'text/plain; charset=utf-8'
    mock_generate_srt_content.assert_called_once()

@patch('backend.main.export_to_davinci')
def test_export_subtitles_to_davinci_success(mock_export_to_davinci):
    """Test successfully exporting subtitles to DaVinci Resolve."""
    mock_export_to_davinci.return_value = {"message": "成功导出至达芬奇！"}
    
    request_data = {
        "frameRate": 24.0,
        "subtitles": [
            {
                "id": 1,
                "startTimecode": "00:00:01:00",
                "endTimecode": "00:00:04:00",
                "diffs": [{"type": "added", "value": "Hello, world!"}]
            }
        ]
    }

    response = client.post("/api/v1/export/davinci", json=request_data)

    assert response.status_code == 200
    assert response.json() == {"status": "success", "message": "成功导出至达芬奇！"}
    mock_export_to_davinci.assert_called_once()

@patch('backend.main.export_to_davinci', side_effect=ResolveConnectionError("导出至达芬奇时发生错误"))
def test_export_subtitles_to_davinci_error(mock_export_to_davinci):
    """Test handling an error when exporting subtitles to DaVinci Resolve."""
    request_data = {
        "frameRate": 24.0,
        "subtitles": [
            {
                "id": 1,
                "startTimecode": "00:00:01:00",
                "endTimecode": "00:00:04:00",
                "diffs": [{"type": "added", "value": "Hello, world!"}]
            }
        ]
    }

    response = client.post("/api/v1/export/davinci", json=request_data)

    assert response.status_code == 503
    assert "导出至达芬奇时发生错误" in response.json()['detail']['message']
    mock_export_to_davinci.assert_called_once()