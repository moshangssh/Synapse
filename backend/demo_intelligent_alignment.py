#!/usr/bin/env python3
"""
示例脚本：演示如何使用新的智能字幕对齐功能
"""
import sys
import os
import logging

# 添加项目根目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.intelligent_aligner import IntelligentAligner
from backend.subtitle_aligner import SubtitleAligner
from backend.schemas import SimpleSubtitleItem

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """主函数：演示智能对齐功能"""
    print("=== 智能字幕对齐功能演示 ===")
    
    # 创建测试数据
    original_subtitles = [
        SimpleSubtitleItem(id=1, text="Hello world"),
        SimpleSubtitleItem(id=2, text="This is a test"),
        SimpleSubtitleItem(id=3, text="Another subtitle"),
        SimpleSubtitleItem(id=4, text="More content here"),
        SimpleSubtitleItem(id=5, text="Final subtitle")
    ]
    
    # 创建优化数据（数量与原始字幕不同，模拟AI优化结果）
    optimized_data = [
        {"id": 1, "optimized_text": "Hello beautiful world"},
        {"id": 2, "optimized_text": "This is a wonderful test"},
        {"id": 3, "optimized_text": "Another amazing subtitle"}
        # 注意：这里缺少ID 4和5的优化数据，智能对齐器会处理这种情况
    ]
    
    print("\n--- 原始字幕 ---")
    for subtitle in original_subtitles:
        print(f"ID: {subtitle.id}, 文本: '{subtitle.text}'")
    
    print("\n--- 优化数据 ---")
    for item in optimized_data:
        print(f"ID: {item['id']}, 优化文本: '{item['optimized_text']}'")
    
    # 使用智能对齐器
    print("\n--- 使用智能对齐器进行对齐 ---")
    aligner = IntelligentAligner()
    aligned_subtitles = aligner.align_subtitles_intelligently(original_subtitles, optimized_data)
    
    print(f"\n对齐结果（{len(aligned_subtitles)} 条字幕）:")
    for subtitle in aligned_subtitles:
        print(f"ID: {subtitle.id}")
        print(f"  原文: '{subtitle.original_text}'")
        print(f"  优化: '{subtitle.optimized_text}'")
        print(f"  差异: {len(subtitle.diffs)} 个部分")
        print()
    
    # 使用传统的字幕对齐器进行对比
    print("\n--- 使用传统字幕对齐器（严格模式）---")
    traditional_aligner = SubtitleAligner()
    traditional_result = traditional_aligner.align_subtitles(original_subtitles, optimized_data, strict_mode=True)
    
    if traditional_result.success:
        print(f"传统对齐成功，结果数量: {len(traditional_result.aligned_subtitles)}")
        for subtitle in traditional_result.aligned_subtitles:
            print(f"ID: {subtitle.id}, 原文: '{subtitle.original_text}', 优化: '{subtitle.optimized_text}'")
    else:
        print(f"传统对齐失败: {traditional_result.error}")
    
    # 使用传统的字幕对齐器（宽松模式）
    print("\n--- 使用传统字幕对齐器（宽松模式）---")
    flexible_result = traditional_aligner.align_subtitles(original_subtitles, optimized_data, strict_mode=False)
    
    if flexible_result.success:
        print(f"宽松对齐成功，结果数量: {len(flexible_result.aligned_subtitles)}")
        for subtitle in flexible_result.aligned_subtitles:
            print(f"ID: {subtitle.id}, 原文: '{subtitle.original_text}', 优化: '{subtitle.optimized_text}'")
    else:
        print(f"宽松对齐失败: {flexible_result.error}")
    
    print("\n=== 演示完成 ===")

if __name__ == "__main__":
    main()