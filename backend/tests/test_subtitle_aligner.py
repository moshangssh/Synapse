"""
字幕对齐器测试
"""
import pytest
from unittest.mock import Mock, patch
from typing import List, Dict, Any

from subtitle_aligner import SubtitleAligner, AlignmentResult
from schemas import SubtitleItem, OptimizedSubtitleItem, DiffPartModel, OptimizationErrorCode


class TestSubtitleAligner:
    """字幕对齐器测试类"""
    
    def setup_method(self):
        """设置测试方法"""
        self.aligner = SubtitleAligner()
        
        # 创建测试用的原始字幕
        self.original_subtitles = [
            SubtitleItem(
                id=1,
                startTimecode="00:00:01:00",
                endTimecode="00:00:03:00",
                text="Hello world",
                diffs=None
            ),
            SubtitleItem(
                id=2,
                startTimecode="00:00:04:00",
                endTimecode="00:00:06:00",
                text="This is a test",
                diffs=None
            ),
            SubtitleItem(
                id=3,
                startTimecode="00:00:07:00",
                endTimecode="00:00:09:00",
                text="Another subtitle",
                diffs=None
            )
        ]
        
        # 创建测试用的优化数据
        self.optimized_data = [
            {"id": 1, "optimized_text": "Hello beautiful world"},
            {"id": 2, "optimized_text": "This is a wonderful test"},
            {"id": 3, "optimized_text": "Another amazing subtitle"}
        ]
    
    def test_align_subtitles_success(self):
        """测试成功的字幕对齐"""
        result = self.aligner.align_subtitles(self.original_subtitles, self.optimized_data)
        
        assert result.success is True
        assert len(result.aligned_subtitles) == 3
        assert result.processing_time > 0
        
        # 验证第一个字幕的对齐结果
        first_aligned = result.aligned_subtitles[0]
        assert first_aligned.id == 1
        assert first_aligned.original_text == "Hello world"
        assert first_aligned.optimized_text == "Hello beautiful world"
        assert len(first_aligned.diffs) > 0
    
    def test_align_subtitles_empty_original(self):
        """测试空原始字幕列表"""
        result = self.aligner.align_subtitles([], self.optimized_data)
        
        assert result.success is False
        assert result.error == "原始字幕列表不能为空"
        assert result.error_code == OptimizationErrorCode.INVALID_REQUEST
    
    def test_align_subtitles_empty_optimized(self):
        """测试空优化数据"""
        result = self.aligner.align_subtitles(self.original_subtitles, [])
        
        assert result.success is False
        assert result.error == "优化数据不能为空"
        assert result.error_code == OptimizationErrorCode.INVALID_REQUEST
    
    def test_align_subtitles_count_mismatch(self):
        """测试字幕数量不匹配"""
        # 优化数据只有2个，但原始有3个
        mismatched_data = self.optimized_data[:2]
        result = self.aligner.align_subtitles(self.original_subtitles, mismatched_data)
        
        assert result.success is False
        assert "字幕数量不匹配" in result.error
        assert result.error_code == OptimizationErrorCode.PROCESSING_ERROR
    
    def test_align_subtitles_invalid_format(self):
        """测试无效的优化数据格式"""
        invalid_data = [{"invalid": "data"}]  # 缺少id字段
        result = self.aligner.align_subtitles(self.original_subtitles, invalid_data)
        
        assert result.success is False
        assert "缺少ID字段" in result.error
        assert result.error_code == OptimizationErrorCode.INVALID_REQUEST
    
    def test_align_subtitles_id_not_found(self):
        """测试优化数据中的ID不存在于原始字幕中"""
        invalid_data = [{"id": 999, "optimized_text": "Some text"}]
        result = self.aligner.align_subtitles(self.original_subtitles, invalid_data)
        
        assert result.success is False
        assert "不存在于原始字幕中" in result.error
        assert result.error_code == OptimizationErrorCode.INVALID_REQUEST
    
    def test_align_subtitles_missing_optimized_text(self):
        """测试优化数据中缺少优化文本"""
        incomplete_data = [
            {"id": 1},  # 缺少optimized_text
            {"id": 2, "optimized_text": "This is a wonderful test"},
            {"id": 3, "optimized_text": "Another amazing subtitle"}
        ]
        result = self.aligner.align_subtitles(self.original_subtitles, incomplete_data)
        
        assert result.success is True
        # 第一个字幕应该使用原始文本作为备用
        first_aligned = result.aligned_subtitles[0]
        assert first_aligned.optimized_text == "Hello world"
        assert len(result.warnings) > 0
        assert "使用原始文本" in result.warnings[0]
    
    def test_create_fallback_alignment(self):
        """测试创建备用对齐"""
        result = self.aligner.create_fallback_alignment(self.original_subtitles)
        
        assert result.success is True
        assert len(result.aligned_subtitles) == 3
        
        # 验证所有字幕都保持原样
        for i, aligned in enumerate(result.aligned_subtitles):
            assert aligned.id == self.original_subtitles[i].id
            assert aligned.original_text == self.original_subtitles[i].text
            assert aligned.optimized_text == self.original_subtitles[i].text
            assert len(aligned.diffs) == 1
            assert aligned.diffs[0].type == "normal"
            assert aligned.diffs[0].value == self.original_subtitles[i].text
    
    def test_alignment_preserves_order(self):
        """测试对齐保持正确的顺序"""
        # 打乱优化数据的顺序
        shuffled_data = [
            {"id": 3, "optimized_text": "Another amazing subtitle"},
            {"id": 1, "optimized_text": "Hello beautiful world"},
            {"id": 2, "optimized_text": "This is a wonderful test"}
        ]
        result = self.aligner.align_subtitles(self.original_subtitles, shuffled_data)
        
        assert result.success is True
        assert len(result.aligned_subtitles) == 3
        
        # 验证顺序是正确的（1, 2, 3）
        for i in range(3):
            assert result.aligned_subtitles[i].id == i + 1
    
    def test_alignment_preserves_metadata(self):
        """测试对齐保留原始字幕元数据"""
        result = self.aligner.align_subtitles(self.original_subtitles, self.optimized_data)
        
        assert result.success is True
        
        # 验证原始字幕的元数据被保留
        for i, aligned in enumerate(result.aligned_subtitles):
            original = self.original_subtitles[i]
            assert aligned.original_text == original.text
            # 注意：OptimizedSubtitleItem不直接包含时间码，
            # 但原始字幕的引用应该保持完整
    
    def test_edge_case_single_subtitle(self):
        """测试单个字幕的边界情况"""
        single_subtitle = [self.original_subtitles[0]]
        single_optimized = [self.optimized_data[0]]
        
        result = self.aligner.align_subtitles(single_subtitle, single_optimized)
        
        assert result.success is True
        assert len(result.aligned_subtitles) == 1
        assert result.aligned_subtitles[0].id == 1
        assert result.aligned_subtitles[0].original_text == "Hello world"
        assert result.aligned_subtitles[0].optimized_text == "Hello beautiful world"
    
    def test_edge_case_empty_text(self):
        """测试空文本的边界情况"""
        empty_subtitles = [
            SubtitleItem(
                id=1,
                startTimecode="00:00:01:00",
                endTimecode="00:00:03:00",
                text="",
                diffs=None
            )
        ]
        empty_optimized = [{"id": 1, "optimized_text": ""}]
        
        result = self.aligner.align_subtitles(empty_subtitles, empty_optimized)
        
        assert result.success is True
        assert len(result.aligned_subtitles) == 1
        assert result.aligned_subtitles[0].original_text == ""
        assert result.aligned_subtitles[0].optimized_text == ""
    
    def test_edge_case_special_characters(self):
        """测试特殊字符的边界情况"""
        special_subtitles = [
            SubtitleItem(
                id=1,
                startTimecode="00:00:01:00",
                endTimecode="00:00:03:00",
                text="Hello @#$%^&*() world",
                diffs=None
            )
        ]
        special_optimized = [{"id": 1, "optimized_text": "Hello !@#$%^&*() beautiful world"}]
        
        result = self.aligner.align_subtitles(special_subtitles, special_optimized)
        
        assert result.success is True
        assert len(result.aligned_subtitles) == 1
        assert result.aligned_subtitles[0].original_text == "Hello @#$%^&*() world"
        assert result.aligned_subtitles[0].optimized_text == "Hello !@#$%^&*() beautiful world"
    
    def test_edge_case_unicode_characters(self):
        """测试Unicode字符的边界情况"""
        unicode_subtitles = [
            SubtitleItem(
                id=1,
                startTimecode="00:00:01:00",
                endTimecode="00:00:03:00",
                text="你好世界",
                diffs=None
            )
        ]
        unicode_optimized = [{"id": 1, "optimized_text": "你好美丽的世界"}]
        
        result = self.aligner.align_subtitles(unicode_subtitles, unicode_optimized)
        
        assert result.success is True
        assert len(result.aligned_subtitles) == 1
        assert result.aligned_subtitles[0].original_text == "你好世界"
        assert result.aligned_subtitles[0].optimized_text == "你好美丽的世界"
    
    def test_edge_case_long_text(self):
        """测试长文本的边界情况"""
        long_text = "This is a very long subtitle text that contains multiple sentences and should be handled properly by the alignment system without any issues or errors occurring during the processing."
        long_optimized = "This is a very long optimized subtitle text that contains multiple sentences and should be handled properly by the alignment system without any issues or errors occurring during the processing."
        
        long_subtitles = [
            SubtitleItem(
                id=1,
                startTimecode="00:00:01:00",
                endTimecode="00:00:03:00",
                text=long_text,
                diffs=None
            )
        ]
        long_optimized_data = [{"id": 1, "optimized_text": long_optimized}]
        
        result = self.aligner.align_subtitles(long_subtitles, long_optimized_data)
        
        assert result.success is True
        assert len(result.aligned_subtitles) == 1
        assert result.aligned_subtitles[0].original_text == long_text
        assert result.aligned_subtitles[0].optimized_text == long_optimized
    
    def test_alignment_performance(self):
        """测试对齐性能"""
        import time
        
        # 创建大量字幕进行性能测试
        large_subtitles = []
        large_optimized = []
        
        for i in range(100):
            large_subtitles.append(
                SubtitleItem(
                    id=i + 1,
                    startTimecode=f"00:00:{i+1:02d}:00",
                    endTimecode=f"00:00:{i+1:02d}:00",
                    text=f"Subtitle text {i+1}",
                    diffs=None
                )
            )
            large_optimized.append(
                {"id": i + 1, "optimized_text": f"Optimized subtitle text {i+1}"}
            )
        
        start_time = time.time()
        result = self.aligner.align_subtitles(large_subtitles, large_optimized)
        end_time = time.time()
        
        assert result.success is True
        assert len(result.aligned_subtitles) == 100
        # 对齐应该在合理时间内完成（小于1秒）
        assert result.processing_time < 1.0
        # 整体测试时间也应该合理
        assert (end_time - start_time) < 2.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])