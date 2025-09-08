#!/usr/bin/env python3
"""
测试脚本：验证智能字幕对齐功能在SubtitleAligner中的集成
"""
import sys
import os
import logging

# 添加项目根目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.subtitle_aligner import SubtitleAligner
from backend.schemas import SimpleSubtitleItem

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_subtitle_aligner_integration():
    """测试字幕对齐器中的智能对齐集成"""
    print("=== 开始测试字幕对齐器中的智能对齐集成 ===")
    
    # 创建测试数据
    original_subtitles = [
        SimpleSubtitleItem(id=1, text="Hello world"),
        SimpleSubtitleItem(id=2, text="This is a test"),
        SimpleSubtitleItem(id=3, text="Another subtitle"),
        SimpleSubtitleItem(id=4, text="More content here"),
        SimpleSubtitleItem(id=5, text="Final subtitle")
    ]
    
    # 测试场景1：智能对齐
    print("\n--- 测试场景1：智能对齐 ---")
    optimized_data1 = [
        {"id": 1, "optimized_text": "Hello beautiful world"},
        {"id": 2, "optimized_text": "This is a simple test"},
        {"id": 3, "optimized_text": "Another great subtitle"}
    ]
    
    aligner = SubtitleAligner()
    result1 = aligner.create_intelligent_alignment(original_subtitles, optimized_data1)
    print(f"对齐结果: {result1.success}")
    print(f"对齐字幕数量: {len(result1.aligned_subtitles)}")
    if result1.warnings:
        print(f"警告: {result1.warnings}")
    
    for subtitle in result1.aligned_subtitles:
        print(f"ID: {subtitle.id}, 原文: '{subtitle.original_text}', 优化: '{subtitle.optimized_text}'")
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    test_subtitle_aligner_integration()