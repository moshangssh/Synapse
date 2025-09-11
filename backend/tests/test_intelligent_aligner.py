"""
智能对齐器测试
"""
import pytest
from unittest.mock import Mock, patch
from typing import List, Dict, Any

from intelligent_aligner import IntelligentAligner
from schemas import SimpleSubtitleItem, OptimizedSubtitleItem


class TestIntelligentAligner:
    """智能对齐器测试类"""
    
    def setup_method(self):
        """设置测试方法"""
        self.aligner = IntelligentAligner()
        
        # 创建测试用的原始字幕
        self.original_subtitles = [
            SimpleSubtitleItem(id=1, text="Hello world"),
            SimpleSubtitleItem(id=2, text="This is a test"),
            SimpleSubtitleItem(id=3, text="Another subtitle"),
            SimpleSubtitleItem(id=4, text="More content here"),
            SimpleSubtitleItem(id=5, text="Final subtitle")
        ]
        
        # 创建测试用的优化数据
        self.optimized_data = [
            {"id": 1, "optimized_text": "Hello beautiful world"},
            {"id": 2, "optimized_text": "This is a wonderful test"},
            {"id": 3, "optimized_text": "Another amazing subtitle"},
            {"id": 4, "optimized_text": "More interesting content here"},
            {"id": 5, "optimized_text": "Final amazing subtitle"}
        ]
    
    def test_align_subtitles_intelligently_success(self):
        """测试成功的智能字幕对齐"""
        result = self.aligner.align_subtitles_intelligently(self.original_subtitles, self.optimized_data)
        
        assert len(result) == 5
        
        # 验证第一个字幕的对齐结果
        first_aligned = result[0]
        assert first_aligned.id == 1
        assert first_aligned.original_text == "Hello world"
        assert first_aligned.optimized_text == "Hello beautiful world"
        assert len(first_aligned.diffs) > 0
    
    def test_align_subtitles_intelligently_count_mismatch_less(self):
        """测试优化数据少于原始字幕的智能对齐"""
        # 优化数据只有3个，但原始有5个
        mismatched_data = self.optimized_data[:3]
        result = self.aligner.align_subtitles_intelligently(self.original_subtitles, mismatched_data)
        
        assert len(result) == 5
        # 验证前三个字幕有优化文本
        assert result[0].optimized_text == "Hello beautiful world"
        assert result[1].optimized_text == "This is a wonderful test"
        assert result[2].optimized_text == "Another amazing subtitle"
        # 验证后两个字幕使用填充文本
        # 注意：具体填充逻辑可能不同，这里只验证基本结构
    
    def test_align_subtitles_intelligently_count_mismatch_more(self):
        """测试优化数据多于原始字幕的智能对齐"""
        # 优化数据有7个，但原始有5个
        extended_data = self.optimized_data + [
            {"id": 6, "optimized_text": "Extra subtitle"},
            {"id": 7, "optimized_text": "Another extra subtitle"}
        ]
        result = self.aligner.align_subtitles_intelligently(self.original_subtitles, extended_data)
        
        assert len(result) >= 5
        # 验证基本结构
    
    def test_align_texts_success(self):
        """测试文本对齐成功"""
        source_texts = ["Hello world", "This is a test", "Another subtitle"]
        target_texts = ["Hello beautiful world", "This is a wonderful test"]
        
        aligned_source, aligned_target = self.aligner.align_texts(source_texts, target_texts)
        
        assert len(aligned_source) == len(aligned_target)
        assert len(aligned_source) >= 2  # 至少应该有2个元素
    
    def test_align_texts_empty_source(self):
        """测试源文本为空"""
        source_texts = []
        target_texts = ["Hello beautiful world", "This is a wonderful test"]
        
        aligned_source, aligned_target = self.aligner.align_texts(source_texts, target_texts)
        
        assert len(aligned_source) == len(aligned_target)
        assert len(aligned_source) == len(target_texts)
    
    def test_align_texts_empty_target(self):
        """测试目标文本为空"""
        source_texts = ["Hello world", "This is a test", "Another subtitle"]
        target_texts = []
        
        aligned_source, aligned_target = self.aligner.align_texts(source_texts, target_texts)
        
        assert len(aligned_source) == len(aligned_target)
        assert len(aligned_source) == len(source_texts)
    
    def test_align_texts_both_empty(self):
        """测试源文本和目标文本都为空"""
        source_texts = []
        target_texts = []
        
        aligned_source, aligned_target = self.aligner.align_texts(source_texts, target_texts)
        
        assert len(aligned_source) == len(aligned_target)
        assert len(aligned_source) == 0
    
    def test_edge_case_single_text(self):
        """测试单个文本的边界情况"""
        source_texts = ["Single text"]
        target_texts = ["Optimized single text"]
        
        aligned_source, aligned_target = self.aligner.align_texts(source_texts, target_texts)
        
        assert len(aligned_source) == len(aligned_target)
        assert len(aligned_source) == 1
        assert aligned_source[0] == "Single text"
        assert aligned_target[0] == "Optimized single text"
    
    def test_edge_case_special_characters(self):
        """测试特殊字符的边界情况"""
        source_texts = ["Hello @#$%^&*() world"]
        target_texts = ["Hello !@#$%^&*() beautiful world"]
        
        aligned_source, aligned_target = self.aligner.align_texts(source_texts, target_texts)
        
        assert len(aligned_source) == len(aligned_target)
        assert len(aligned_source) == 1
        assert aligned_source[0] == "Hello @#$%^&*() world"
        assert aligned_target[0] == "Hello !@#$%^&*() beautiful world"
    
    def test_edge_case_unicode_characters(self):
        """测试Unicode字符的边界情况"""
        source_texts = ["你好世界"]
        target_texts = ["你好美丽的世界"]
        
        aligned_source, aligned_target = self.aligner.align_texts(source_texts, target_texts)
        
        assert len(aligned_source) == len(aligned_target)
        assert len(aligned_source) == 1
        assert aligned_source[0] == "你好世界"
        assert aligned_target[0] == "你好美丽的世界"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])