#!/usr/bin/env python3
"""
测试脚本：验证新的智能字幕对齐功能
"""
import sys
import os
import logging

# 添加项目根目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.intelligent_aligner import IntelligentAligner
from backend.schemas import SimpleSubtitleItem

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_intelligent_aligner():
    """测试智能对齐器"""
    print("=== 开始测试新的智能字幕对齐器 ===")
    
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
    
    aligner = IntelligentAligner()
    aligned_subtitles1 = aligner.align_subtitles_intelligently(original_subtitles, optimized_data1)
    print(f"对齐字幕数量: {len(aligned_subtitles1)}")
    for subtitle in aligned_subtitles1:
        print(f"ID: {subtitle.id}, 原文: '{subtitle.original_text}', 优化: '{subtitle.optimized_text}'")
    
    # 测试场景2：数量不匹配（优化数据少于原始字幕）
    print("\n--- 测试场景2：数量不匹配（优化数据少） ---")
    optimized_data2 = [
        {"id": 1, "optimized_text": "Hello beautiful world"},
        {"id": 2, "optimized_text": "This is a simple test"},
        {"id": 3, "optimized_text": "Another great subtitle"}
    ]
    
    aligned_subtitles2 = aligner.align_subtitles_intelligently(original_subtitles, optimized_data2)
    print(f"对齐字幕数量: {len(aligned_subtitles2)}")
    for subtitle in aligned_subtitles2:
        print(f"ID: {subtitle.id}, 原文: '{subtitle.original_text}', 优化: '{subtitle.optimized_text}'")
    
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
    
    aligned_subtitles3 = aligner.align_subtitles_intelligently(original_subtitles, optimized_data3)
    print(f"对齐字幕数量: {len(aligned_subtitles3)}")
    for subtitle in aligned_subtitles3:
        print(f"ID: {subtitle.id}, 原文: '{subtitle.original_text}', 优化: '{subtitle.optimized_text}'")
    
    # 测试场景4：文本对齐
    print("\n--- 测试场景4：文本对齐 ---")
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
    test_intelligent_aligner()