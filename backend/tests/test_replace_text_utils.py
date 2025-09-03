import pytest
from text_utils import replace_text_in_subtitles
from schemas import SubtitleItem

class TestReplaceTextInSubtitles:
    """测试查找替换文本函数"""

    def test_basic_replacement(self):
        """测试基本替换功能"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="Hello World"),
            SubtitleItem(id=2, startTimecode="00:00:03:00", endTimecode="00:00:05:00", text="Goodbye World"),
            SubtitleItem(id=3, startTimecode="00:00:05:00", endTimecode="00:00:07:00", text="Hello Universe")
        ]
        
        result = replace_text_in_subtitles(subtitles, "World", "Earth")
        
        assert len(result) == 2
        assert result[0]["id"] == 1
        assert result[0]["text"] == "Hello Earth"
        assert result[1]["id"] == 2
        assert result[1]["text"] == "Goodbye Earth"

    def test_case_insensitive_replacement(self):
        """测试不区分大小写的替换"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="hello world"),
            SubtitleItem(id=2, startTimecode="00:00:03:00", endTimecode="00:00:05:00", text="Hello World"),
            SubtitleItem(id=3, startTimecode="00:00:05:00", endTimecode="00:00:07:00", text="HELLO WORLD")
        ]
        
        result = replace_text_in_subtitles(subtitles, "hello", "Hi")
        
        assert len(result) == 3
        for item in result:
            assert "Hi" in item["text"]

    def test_empty_search_query_raises_error(self):
        """测试空搜索查询抛出错误"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="Hello World")
        ]
        
        with pytest.raises(ValueError, match="搜索查询不能为空"):
            replace_text_in_subtitles(subtitles, "", "Earth")
        
        with pytest.raises(ValueError, match="搜索查询不能为空"):
            replace_text_in_subtitles(subtitles, "   ", "Earth")

    def test_no_matches_returns_empty_list(self):
        """测试没有匹配项时返回空列表"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="Hello World"),
            SubtitleItem(id=2, startTimecode="00:00:03:00", endTimecode="00:00:05:00", text="Goodbye Universe")
        ]
        
        result = replace_text_in_subtitles(subtitles, "Nonexistent", "Replacement")
        
        assert len(result) == 0

    def test_multiple_occurrences_in_single_subtitle(self):
        """测试单个字幕中多次出现的替换"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="Test Test Test"),
            SubtitleItem(id=2, startTimecode="00:00:03:00", endTimecode="00:00:05:00", text="Single Test")
        ]
        
        result = replace_text_in_subtitles(subtitles, "Test", "Replaced")
        
        assert len(result) == 2
        
        # 验证多次替换
        for item in result:
            if item["id"] == 1:
                assert item["text"] == "Replaced Replaced Replaced"
            elif item["id"] == 2:
                assert item["text"] == "Single Replaced"

    def test_special_characters_escaped(self):
        """测试正则表达式特殊字符被正确转义"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="Test. with dots"),
            SubtitleItem(id=2, startTimecode="00:00:03:00", endTimecode="00:00:05:00", text="Test* with asterisk"),
            SubtitleItem(id=3, startTimecode="00:00:05:00", endTimecode="00:00:07:00", text="Test+ with plus")
        ]
        
        result = replace_text_in_subtitles(subtitles, "Test.", "Replaced")
        
        assert len(result) == 1
        assert result[0]["id"] == 1
        assert result[0]["text"] == "Replaced with dots"

    def test_empty_replace_query_deletes_text(self):
        """测试空的替换查询会删除匹配的文本"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="Hello World")
        ]
        
        result = replace_text_in_subtitles(subtitles, "World", "")
        
        assert len(result) == 1
        assert result[0]["text"] == "Hello "

    def test_unicode_characters(self):
        """测试Unicode字符的替换"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="你好世界"),
            SubtitleItem(id=2, startTimecode="00:00:03:00", endTimecode="00:00:05:00", text="Hello 世界")
        ]
        
        result = replace_text_in_subtitles(subtitles, "世界", "World")
        
        assert len(result) == 2
        assert result[0]["text"] == "你好World"
        assert result[1]["text"] == "Hello World"

    def test_partial_word_replacement(self):
        """测试部分单词替换"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="Testing the test")
        ]
        
        result = replace_text_in_subtitles(subtitles, "test", "exam")
        
        assert len(result) == 1
        assert result[0]["text"] == "examing the exam"

    def test_preserve_non_matching_subtitles(self):
        """测试不匹配的字幕不会被包含在结果中"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="Hello World"),
            SubtitleItem(id=2, startTimecode="00:00:03:00", endTimecode="00:00:05:00", text="Goodbye Universe"),
            SubtitleItem(id=3, startTimecode="00:00:05:00", endTimecode="00:00:07:00", text="Hello World")
        ]
        
        result = replace_text_in_subtitles(subtitles, "Universe", "Multiverse")
        
        assert len(result) == 1
        assert result[0]["id"] == 2
        assert result[0]["text"] == "Goodbye Multiverse"

    def test_whitespace_handling(self):
        """测试空格处理"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="  Hello  World  "),
            SubtitleItem(id=2, startTimecode="00:00:03:00", endTimecode="00:00:05:00", text="Hello   World")
        ]
        
        result = replace_text_in_subtitles(subtitles, "Hello", "Hi")
        
        assert len(result) == 2
        assert result[0]["text"] == "  Hi  World  "
        assert result[1]["text"] == "Hi   World"