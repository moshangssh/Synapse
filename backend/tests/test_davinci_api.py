import pytest
from unittest.mock import Mock, patch
from davinci_api import get_resolve_project_info, get_subtitle_tracks, get_resolve_subtitles, set_resolve_timecode
from schemas import SubtitleTrackInfo, SubtitleExportRequest, SubtitleItem


class TestDavinciAPI:
    """测试 DaVinci API 业务逻辑函数（使用模拟对象）"""

    def test_get_resolve_project_info_success(self):
        """测试成功获取项目信息"""
        # 创建模拟对象
        mock_project = Mock()
        mock_project.GetName.return_value = "Test Project"
        mock_timeline = Mock()
        mock_timeline.GetName.return_value = "Test Timeline"
        
        # 调用函数
        result = get_resolve_project_info(mock_project, mock_timeline)
        
        # 验证结果
        assert result["projectName"] == "Test Project"
        assert result["timelineName"] == "Test Timeline"
        mock_project.GetName.assert_called_once()
        mock_timeline.GetName.assert_called_once()

    def test_get_resolve_project_info_no_project(self):
        """测试没有项目时抛出异常"""
        from exceptions import NoProjectOpenError
        
        # 调用函数并期望抛出异常
        with pytest.raises(NoProjectOpenError, match="未找到当前打开的项目"):
            get_resolve_project_info(None, None)

    def test_get_subtitle_tracks_success(self):
        """测试成功获取字幕轨道"""
        # 创建模拟对象
        mock_project = Mock()
        mock_timeline = Mock()
        mock_timeline.GetTrackCount.return_value = 2
        mock_timeline.GetTrackName.side_effect = ["Track 1", "Track 2"]
        
        # 调用函数
        result = get_subtitle_tracks(mock_project, mock_timeline)
        
        # 验证结果
        assert len(result) == 2
        assert result[0].track_index == 1
        assert result[0].track_name == "Track 1"
        assert result[1].track_index == 2
        assert result[1].track_name == "Track 2"
        mock_timeline.GetTrackCount.assert_called_once_with("subtitle")
        assert mock_timeline.GetTrackName.call_count == 2

    def test_get_subtitle_tracks_no_tracks(self):
        """测试没有字幕轨道时返回空列表"""
        # 创建模拟对象
        mock_project = Mock()
        mock_timeline = Mock()
        mock_timeline.GetTrackCount.return_value = 0
        
        # 调用函数
        result = get_subtitle_tracks(mock_project, mock_timeline)
        
        # 验证结果
        assert result == []
        mock_timeline.GetTrackCount.assert_called_once_with("subtitle")

    def test_get_resolve_subtitles_success(self):
        """测试成功获取字幕数据"""
        # 创建模拟对象
        mock_project = Mock()
        mock_timeline = Mock()
        mock_timeline.GetTrackCount.return_value = 1
        mock_timeline.GetItemListInTrack.return_value = [
            Mock(GetStart=Mock(return_value=0), GetEnd=Mock(return_value=100), GetName=Mock(return_value="Test Subtitle"))
        ]
        
        # 调用函数
        result = get_resolve_subtitles(mock_project, mock_timeline, 24.0)
        
        # 验证结果
        assert result["frameRate"] == 24.0
        assert len(result["data"]) == 1
        assert result["data"][0]["id"] == 1
        assert result["data"][0]["text"] == "Test Subtitle"
        assert result["data"][0]["startTimecode"] == "00:00:00:00"
        assert result["data"][0]["endTimecode"] == "00:00:04:04"

    def test_get_resolve_subtitles_no_tracks(self):
        """测试没有字幕轨道时返回空数据"""
        # 创建模拟对象
        mock_project = Mock()
        mock_timeline = Mock()
        mock_timeline.GetTrackCount.return_value = 0
        
        # 调用函数
        result = get_resolve_subtitles(mock_project, mock_timeline, 24.0)
        
        # 验证结果
        assert result["frameRate"] == 24.0
        assert result["data"] == []

    def test_get_resolve_subtitles_invalid_track_index(self):
        """测试无效轨道索引时抛出异常"""
        from exceptions import ResolveError
        
        # 创建模拟对象
        mock_project = Mock()
        mock_timeline = Mock()
        mock_timeline.GetTrackCount.return_value = 1
        
        # 调用函数并期望抛出异常
        with pytest.raises(ResolveError, match="无效的字幕轨道索引: 2"):
            get_resolve_subtitles(mock_project, mock_timeline, 24.0, track_index=2)

    def test_set_resolve_timecode_start(self):
        """测试设置时间码到开始位置"""
        # 创建模拟对象
        mock_project = Mock()
        mock_timeline = Mock()
        
        # 调用函数
        result = set_resolve_timecode(mock_project, mock_timeline, 24.0, "00:00:00:00", "00:00:10:00", "start")
        
        # 验证结果
        assert result["message"] == "成功将时间码设置为: 00:00:00:00"
        mock_timeline.SetCurrentTimecode.assert_called_once_with("00:00:00:00")

    def test_set_resolve_timecode_end(self):
        """测试设置时间码到结束位置"""
        # 创建模拟对象
        mock_project = Mock()
        mock_timeline = Mock()
        
        # 调用函数
        result = set_resolve_timecode(mock_project, mock_timeline, 24.0, "00:00:00:00", "00:00:10:00", "end")
        
        # 验证结果
        assert result["message"] == "成功将时间码设置为: 00:00:10:00"
        mock_timeline.SetCurrentTimecode.assert_called_once_with("00:00:10:00")

    def test_set_resolve_timecode_middle(self):
        """测试设置时间码到中间位置"""
        # 创建模拟对象
        mock_project = Mock()
        mock_timeline = Mock()
        
        # 调用函数
        result = set_resolve_timecode(mock_project, mock_timeline, 24.0, "00:00:00:00", "00:00:10:00", "middle")
        
        # 验证结果
        assert result["message"] == "成功将时间码设置为: 00:00:05:00"
        mock_timeline.SetCurrentTimecode.assert_called_once_with("00:00:05:00")

    def test_get_resolve_subtitles_empty_track(self):
        """测试空字幕轨道时返回空数据"""
        # 创建模拟对象
        mock_project = Mock()
        mock_timeline = Mock()
        mock_timeline.GetTrackCount.return_value = 1
        mock_timeline.GetItemListInTrack.return_value = []
        
        # 调用函数
        result = get_resolve_subtitles(mock_project, mock_timeline, 24.0)
        
        # 验证结果
        assert result["frameRate"] == 24.0
        assert result["data"] == []

    def test_get_resolve_project_info_no_timeline(self):
        """测试没有时间线时返回None作为时间线名称"""
        # 创建模拟对象
        mock_project = Mock()
        mock_project.GetName.return_value = "Test Project"
        mock_timeline = None
        
        # 调用函数
        result = get_resolve_project_info(mock_project, mock_timeline)
        
        # 验证结果
        assert result["projectName"] == "Test Project"
        assert result["timelineName"] is None
        mock_project.GetName.assert_called_once()