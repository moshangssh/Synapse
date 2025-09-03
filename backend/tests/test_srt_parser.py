import pytest
import sys
import os

# 添加backend目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from srt_parser import parse_srt_file, validate_srt_content, SrtSubtitleEntry, ImportedSubtitleFile


class TestSrtParser:
    """测试SRT解析功能"""
    
    def test_valid_srt_content(self):
        """测试有效的SRT内容验证"""
        srt_content = """1
00:00:01,000 --> 00:00:03,000
这是第一条字幕

2
00:00:04,000 --> 00:00:06,000
这是第二条字幕
"""
        
        result = validate_srt_content(srt_content)
        assert result["isValid"] is True
        assert len(result["errors"]) == 0
    
    def test_empty_srt_content(self):
        """测试空的SRT内容"""
        result = validate_srt_content("")
        assert result["isValid"] is False
        assert "文件内容为空" in result["errors"]
    
    def test_missing_timecode_marker(self):
        """测试缺少时间码标记的SRT内容"""
        srt_content = """1
00:00:01,000 00:00:03,000
这是第一条字幕
"""
        
        result = validate_srt_content(srt_content)
        assert result["isValid"] is False
        assert any("文件不包含SRT时间码标记" in error for error in result["errors"])
    
    def test_invalid_timecode_format(self):
        """测试无效的时间码格式"""
        srt_content = """1
00:00:01 --> 00:00:03
这是第一条字幕
"""
        
        result = validate_srt_content(srt_content)
        assert result["isValid"] is False
        assert any("时间码格式不正确" in error for error in result["errors"])
    
    def test_parse_simple_srt(self):
        """测试解析简单的SRT文件"""
        srt_content = """1
00:00:01,000 --> 00:00:03,000
Hello, world!

2
00:00:04,000 --> 00:00:06,000
This is a test.
"""
        
        result = parse_srt_file(srt_content, "test.srt")
        
        assert isinstance(result, ImportedSubtitleFile)
        assert result.fileName == "test.srt"
        assert len(result.subtitles) == 2
        
        # 检查第一个字幕
        first_subtitle = result.subtitles[0]
        assert first_subtitle.id == 1
        assert first_subtitle.startTimecode == "00:00:01.000"
        assert first_subtitle.endTimecode == "00:00:03.000"
        assert first_subtitle.text == "Hello, world!"
        
        # 检查第二个字幕
        second_subtitle = result.subtitles[1]
        assert second_subtitle.id == 2
        assert second_subtitle.startTimecode == "00:00:04.000"
        assert second_subtitle.endTimecode == "00:00:06.000"
        assert second_subtitle.text == "This is a test."
    
    def test_parse_srt_with_comma_separator(self):
        """测试解析使用逗号分隔符的SRT文件"""
        srt_content = """1
00:00:01,000 --> 00:00:03,000
Hello, world!
"""
        
        result = parse_srt_file(srt_content, "test.srt")
        assert result.subtitles[0].startTimecode == "00:00:01.000"
        assert result.subtitles[0].endTimecode == "00:00:03.000"
    
    def test_parse_srt_with_dot_separator(self):
        """测试解析使用点分隔符的SRT文件"""
        srt_content = """1
00:00:01.000 --> 00:00:03.000
Hello, world!
"""
        
        result = parse_srt_file(srt_content, "test.srt")
        assert result.subtitles[0].startTimecode == "00:00:01.000"
        assert result.subtitles[0].endTimecode == "00:00:03.000"
    
    def test_parse_srt_with_multiple_text_lines(self):
        """测试解析包含多行文本的SRT文件"""
        srt_content = """1
00:00:01,000 --> 00:00:03,000
这是第一行
这是第二行
这是第三行
"""
        
        result = parse_srt_file(srt_content, "test.srt")
        assert result.subtitles[0].text == "这是第一行\n这是第二行\n这是第三行"
    
    def test_parse_srt_with_bom(self):
        """测试解析包含BOM标记的SRT文件"""
        srt_content = "\uFEFF1\n00:00:01,000 --> 00:00:03,000\nHello, world!"
        
        result = parse_srt_file(srt_content, "test.srt")
        assert len(result.subtitles) == 1
        assert result.subtitles[0].text == "Hello, world!"
    
    def test_parse_srt_skip_invalid_blocks(self):
        """测试解析时跳过无效的字幕块"""
        srt_content = """1
00:00:01,000 --> 00:00:03,000
Valid subtitle

This is an invalid block

2
00:00:04,000 --> 00:00:06,000
Another valid subtitle
"""
        
        result = parse_srt_file(srt_content, "test.srt")
        assert len(result.subtitles) == 2  # 只有两个有效的字幕
        assert result.subtitles[0].text == "Valid subtitle"
        assert result.subtitles[1].text == "Another valid subtitle"
    
    def test_parse_srt_empty_content(self):
        """测试解析空的SRT内容"""
        result = parse_srt_file("", "test.srt")
        assert len(result.subtitles) == 0
    
    def test_to_dict_methods(self):
        """测试类的to_dict方法"""
        entry = SrtSubtitleEntry(1, "00:00:01.000", "00:00:03.000", "Test text")
        entry_dict = entry.to_dict()
        
        assert entry_dict["id"] == 1
        assert entry_dict["startTimecode"] == "00:00:01.000"
        assert entry_dict["endTimecode"] == "00:00:03.000"
        assert entry_dict["text"] == "Test text"
        
        file = ImportedSubtitleFile("test.srt", [entry])
        file_dict = file.to_dict()
        
        assert file_dict["fileName"] == "test.srt"
        assert len(file_dict["subtitles"]) == 1
        assert "metadata" in file_dict
        assert file_dict["metadata"]["format"] == "srt"


if __name__ == "__main__":
    pytest.main([__file__])