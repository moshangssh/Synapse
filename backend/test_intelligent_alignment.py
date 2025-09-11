#!/usr/bin/env python3
"""
测试脚本：验证智能字幕对齐功能
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.subtitle_aligner import SubtitleAligner
from backend.schemas import SimpleSubtitleItem, OptimizedSubtitleItem

def test_intelligent_alignment():
    """测试智能对齐功能"""
    print("=== 开始测试智能字幕对齐功能 ===")
    
    # 创建测试数据
    original_subtitles = [
        SimpleSubtitleItem(id=1, text="Hello world"),
        SimpleSubtitleItem(id=2, text="This is a test"),
        SimpleSubtitleItem(id=3, text="Another subtitle"),
        SimpleSubtitleItem(id=4, text="More content here"),
        SimpleSubtitleItem(id=5, text="Final subtitle")
    ]
    
    # 测试场景1：数量匹配
    print("\n--- 测试场景1：数量匹配 ---")
    optimized_data1 = [
        {"id": 1, "optimized_text": "Hello beautiful world"},
        {"id": 2, "optimized_text": "This is a simple test"},
        {"id": 3, "optimized_text": "Another great subtitle"},
        {"id": 4, "optimized_text": "More interesting content here"},
        {"id": 5, "optimized_text": "Final amazing subtitle"}
    ]
    
    aligner = SubtitleAligner()
    result1 = aligner.align_subtitles(original_subtitles, optimized_data1, strict_mode=False)
    print(f"严格模式结果: {result1.success}")
    print(f"对齐字幕数量: {len(result1.aligned_subtitles)}")
    if result1.warnings:
        print(f"警告: {result1.warnings}")
    
    # 测试场景2：数量不匹配（优化数据少于原始字幕）
    print("\n--- 测试场景2：数量不匹配（优化数据少） ---")
    optimized_data2 = [
        {"id": 1, "optimized_text": "Hello beautiful world"},
        {"id": 2, "optimized_text": "This is a simple test"},
        {"id": 3, "optimized_text": "Another great subtitle"}
    ]
    
    result2 = aligner.align_subtitles(original_subtitles, optimized_data2, strict_mode=False)
    print(f"宽松模式结果: {result2.success}")
    print(f"对齐字幕数量: {len(result2.aligned_subtitles)}")
    if result2.warnings:
        print(f"警告: {result2.warnings}")
    
    # 测试场景3：数量不匹配（优化数据多于原始字幕）
    print("\n--- 测试场景3：数量不匹配（优化数据多） ---")
    optimized_data3 = [
        {"id": 1, "optimized_text": "Hello beautiful world"},
        {"id": 2, "optimized_text": "This is a simple test"},
        {"id": 3, "optimized_text": "Another great subtitle"},
        {"id": 4, "optimized_text": "More interesting content here"},
        {"id": 5, "optimized_text": "Final amazing subtitle"},
        {"id": 6, "optimized_text": "Extra subtitle"},
        {"id": 7, "optimized_text": "Another extra subtitle"}
    ]
    
    result3 = aligner.align_subtitles(original_subtitles, optimized_data3, strict_mode=False)
    print(f"宽松模式结果: {result3.success}")
    print(f"对齐字幕数量: {len(result3.aligned_subtitles)}")
    if result3.warnings:
        print(f"警告: {result3.warnings}")
    
    # 测试场景4：ID不匹配
    print("\n--- 测试场景4：ID不匹配 ---")
    optimized_data4 = [
        {"id": 10, "optimized_text": "Hello beautiful world"},
        {"id": 20, "optimized_text": "This is a simple test"},
        {"id": 30, "optimized_text": "Another great subtitle"}
    ]
    
    result4 = aligner.align_subtitles(original_subtitles, optimized_data4, strict_mode=False)
    print(f"宽松模式结果: {result4.success}")
    print(f"对齐字幕数量: {len(result4.aligned_subtitles)}")
    if result4.warnings:
        print(f"警告: {result4.warnings}")
    
    # 测试场景5：智能文本对齐
    print("\n--- 测试场景5：智能文本对齐 ---")
    original_texts = [
        "Hello world",
        "This is a test",
        "Another subtitle"
    ]
    
    optimized_texts = [
        "Hello beautiful world",
        "This is a simple test"
    ]
    
    aligned_original, aligned_optimized = aligner.align_texts(original_texts, optimized_texts)
    print(f"原始文本对齐后: {aligned_original}")
    print(f"优化文本对齐后: {aligned_optimized}")
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    test_intelligent_alignment()