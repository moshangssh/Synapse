import pytest
from text_utils import calculate_text_diff
from schemas import DiffPartModel

class TestCalculateTextDiff:
    """测试文本差异计算函数"""

    def test_no_changes(self):
        """测试无变化的情况"""
        original = "Hello World"
        new = "Hello World"
        
        result = calculate_text_diff(original, new)
        
        assert len(result) == 1
        assert result[0].type == "normal"
        assert result[0].value == "Hello World"

    def test_addition_at_end(self):
        """测试在末尾添加文本"""
        original = "Hello"
        new = "Hello World"
        
        result = calculate_text_diff(original, new)
        
        assert len(result) == 2
        assert result[0].type == "normal"
        assert result[0].value == "Hello"
        assert result[1].type == "added"
        assert result[1].value == " World"

    def test_removal_at_end(self):
        """测试在末尾删除文本"""
        original = "Hello World"
        new = "Hello"
        
        result = calculate_text_diff(original, new)
        
        assert len(result) == 2
        assert result[0].type == "normal"
        assert result[0].value == "Hello"
        assert result[1].type == "removed"
        assert result[1].value == " World"

    def test_replacement_in_middle(self):
        """测试中间替换"""
        original = "Hello World"
        new = "Hello Universe"
        
        result = calculate_text_diff(original, new)
        
        assert len(result) == 3
        assert result[0].type == "normal"
        assert result[0].value == "Hello "
        assert result[1].type == "removed"
        assert result[1].value == "World"
        assert result[2].type == "added"
        assert result[2].value == "Universe"

    def test_multiple_changes(self):
        """测试多个变化"""
        original = "Hello World"
        new = "Hi Universe"
        
        result = calculate_text_diff(original, new)
        
        # 应该有多个变化部分
        assert len(result) >= 3
        
        # 验证至少有一个添加、一个删除、一个正常的部分
        types = [part.type for part in result]
        assert "added" in types
        assert "removed" in types
        assert "normal" in types

    def test_empty_strings(self):
        """测试空字符串"""
        original = ""
        new = ""
        
        result = calculate_text_diff(original, new)
        
        assert len(result) == 1
        assert result[0].type == "normal"
        assert result[0].value == ""

    def test_empty_original_to_new(self):
        """测试从空字符串到新字符串"""
        original = ""
        new = "Hello World"
        
        result = calculate_text_diff(original, new)
        
        assert len(result) == 1
        assert result[0].type == "added"
        assert result[0].value == "Hello World"

    def test_full_string_to_empty(self):
        """测试从完整字符串到空字符串"""
        original = "Hello World"
        new = ""
        
        result = calculate_text_diff(original, new)
        
        assert len(result) == 1
        assert result[0].type == "removed"
        assert result[0].value == "Hello World"

    def test_unicode_characters(self):
        """测试Unicode字符"""
        original = "你好世界"
        new = "你好，世界"
        
        result = calculate_text_diff(original, new)
        
        assert len(result) >= 2
        # 应该包含添加的逗号
        added_parts = [part for part in result if part.type == "added"]
        assert any("，" in part.value for part in added_parts)

    def test_whitespace_changes(self):
        """测试空格变化"""
        original = "Hello World"
        new = "Hello  World"  # 双空格
        
        result = calculate_text_diff(original, new)
        
        assert len(result) >= 2
        # 应该有空格相关的变化
        text_values = [part.value for part in result]
        combined_text = "".join(text_values)
        assert combined_text == "Hello  World"

    def test_punctuation_changes(self):
        """测试标点符号变化"""
        original = "Hello World"
        new = "Hello, World!"
        
        result = calculate_text_diff(original, new)
        
        assert len(result) >= 3
        # 应该包含添加的标点符号
        added_parts = [part for part in result if part.type == "added"]
        assert any("," in part.value or "!" in part.value for part in added_parts)

    def test_complex_text_changes(self):
        """测试复杂文本变化"""
        original = "The quick brown fox jumps over the lazy dog"
        new = "The fast brown fox leaps over the sleepy cat"
        
        result = calculate_text_diff(original, new)
        
        # 验证重构后的文本与原始文本匹配
        reconstructed_original = ""
        reconstructed_new = ""
        
        for part in result:
            if part.type != "added":
                reconstructed_original += part.value
            if part.type != "removed":
                reconstructed_new += part.value
        
        assert reconstructed_original == original
        assert reconstructed_new == new

    def test_word_level_changes(self):
        """测试单词级别的变化"""
        original = "This is a test"
        new = "This was a test"
        
        result = calculate_text_diff(original, new)
        
        # 应该包含 "is" 到 "was" 的变化
        types = [part.type for part in result]
        values = [part.value for part in result]
        
        assert "removed" in types
        assert "added" in types
        
        # 验证变化包含相关的单词
        full_text = "".join(values)
        assert "is" in full_text
        assert "was" in full_text