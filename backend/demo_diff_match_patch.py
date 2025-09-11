#!/usr/bin/env python3
"""
diff-match-patch 实际使用示例
展示如何在 Synapse 项目中使用 diff-match-patch 库进行文本差异计算和对齐
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from diff_match_patch import diff_match_patch
from typing import List, Tuple, Dict, Any
import json

class TextDiffDemo:
    """文本差异计算演示类"""
    
    def __init__(self):
        self.dmp = diff_match_patch()
    
    def basic_diff_example(self):
        """基本差异计算示例"""
        print("=== 基本差异计算示例 ===")
        
        # 示例1：简单文本比较
        text1 = "Hello World"
        text2 = "Hello Beautiful World"
        
        print(f"文本1: {text1}")
        print(f"文本2: {text2}")
        
        diff = self.dmp.diff_main(text1, text2)
        self.dmp.diff_cleanupSemantic(diff)
        
        print("\n差异结果:")
        for operation, text in diff:
            op_map = {0: "无变化", 1: "新增", -1: "删除"}
            print(f"  {op_map[operation]}: '{text}'")
        
        # 计算相似度
        similarity = self.calculate_similarity(text1, text2)
        print(f"\n相似度: {similarity:.2f}")
        
        return diff
    
    def subtitle_diff_example(self):
        """字幕文本差异示例"""
        print("\n=== 字幕文本差异示例 ===")
        
        # 模拟字幕数据
        original_subtitles = [
            "Hello World",
            "This is a test",
            "Goodbye everyone",
            "See you tomorrow"
        ]
        
        optimized_subtitles = [
            "Hello Beautiful World",
            "This was a test",
            "Goodbye",
            "See you next week"
        ]
        
        print("原始字幕:")
        for i, text in enumerate(original_subtitles, 1):
            print(f"  {i}: {text}")
        
        print("\n优化字幕:")
        for i, text in enumerate(optimized_subtitles, 1):
            print(f"  {i}: {text}")
        
        # 计算每对字幕的差异
        results = []
        for orig, opt in zip(original_subtitles, optimized_subtitles):
            diff = self.dmp.diff_main(orig, opt)
            self.dmp.diff_cleanupSemantic(diff)
            similarity = self.calculate_similarity(orig, opt)
            
            results.append({
                'original': orig,
                'optimized': opt,
                'diff': diff,
                'similarity': similarity
            })
        
        print("\n差异分析结果:")
        for i, result in enumerate(results, 1):
            print(f"\n字幕 {i}:")
            print(f"  原始: {result['original']}")
            print(f"  优化: {result['optimized']}")
            print(f"  相似度: {result['similarity']:.2f}")
            
            # 显示具体差异
            op_map = {0: "无变化", 1: "新增", -1: "删除"}
            changes = [f"{op_map[op]}:'{text}'" for op, text in result['diff'] if op != 0]
            if changes:
                print(f"  变化: {', '.join(changes)}")
            else:
                print(f"  变化: 无")
        
        return results
    
    def html_diff_example(self):
        """HTML 格式差异示例"""
        print("\n=== HTML 格式差异示例 ===")
        
        text1 = "The quick brown fox"
        text2 = "The fast brown fox jumps"
        
        diff = self.dmp.diff_main(text1, text2)
        self.dmp.diff_cleanupSemantic(diff)
        
        html_diff = self.dmp.diff_prettyHtml(diff)
        
        print("HTML 格式差异:")
        print(html_diff)
        
        # 保存到文件
        with open('diff_example.html', 'w', encoding='utf-8') as f:
            f.write(f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>差异比较示例</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .diff-container {{ padding: 20px; border: 1px solid #ccc; }}
                    del {{ background-color: #ffe6e6; text-decoration: line-through; }}
                    ins {{ background-color: #e6ffe6; text-decoration: underline; }}
                </style>
            </head>
            <body>
                <h1>文本差异比较示例</h1>
                <div class="diff-container">
                    {html_diff}
                </div>
            </body>
            </html>
            """)
        
        print("HTML 文件已保存为: diff_example.html")
        
        return html_diff
    
    def patch_example(self):
        """补丁操作示例"""
        print("\n=== 补丁操作示例 ===")
        
        original_text = "Hello World"
        modified_text = "Hello Beautiful World"
        
        print(f"原始文本: {original_text}")
        print(f"修改后文本: {modified_text}")
        
        # 创建补丁
        patches = self.dmp.patch_make(original_text, modified_text)
        print(f"\n创建了 {len(patches)} 个补丁")
        
        # 应用补丁
        new_text, success = self.dmp.patch_apply(patches, original_text)
        print(f"补丁应用结果: {success}")
        print(f"应用后文本: {new_text}")
        
        # 应用到其他文本
        other_text = "Hello World!"
        new_text2, success2 = self.dmp.patch_apply(patches, other_text)
        print(f"\n应用到其他文本 '{other_text}':")
        print(f"应用结果: {success2}")
        print(f"结果文本: {new_text2}")
        
        return patches
    
    def match_example(self):
        """文本匹配示例"""
        print("\n=== 文本匹配示例 ===")
        
        text = "The quick brown fox jumps over the lazy dog"
        patterns = [
            "brown fox",
            "lazy dog",
            "quick cat",
            "jumps over"
        ]
        
        print(f"搜索文本: {text}")
        print("搜索模式:")
        
        for pattern in patterns:
            location = self.dmp.match_main(text, pattern, 0)
            if location >= 0:
                print(f"  '{pattern}' -> 位置 {location}")
                # 显示匹配的上下文
                start = max(0, location - 10)
                end = min(len(text), location + len(pattern) + 10)
                context = text[start:end]
                print(f"    上下文: ...{context}...")
            else:
                print(f"  '{pattern}' -> 未找到")
    
    def advanced_diff_example(self):
        """高级差异计算示例"""
        print("\n=== 高级差异计算示例 ===")
        
        # 复杂文本比较
        text1 = """这是一个测试文本。
它包含多行内容。
用于演示复杂的差异比较功能。"""
        
        text2 = """这是一个测试文本。
它包含多行修改后的内容。
用于演示复杂的差异比较功能。
还添加了新的行。"""
        
        print("文本1:")
        print(text1)
        print("\n文本2:")
        print(text2)
        
        # 计算差异
        diff = self.dmp.diff_main(text1, text2)
        self.dmp.diff_cleanupSemantic(diff)
        
        print("\n差异结果:")
        for operation, text in diff:
            op_map = {0: "无变化", 1: "新增", -1: "删除"}
            # 处理换行符显示
            display_text = text.replace('\n', '\\n')
            print(f"  {op_map[operation]}: '{display_text}'")
        
        # 计算统计信息
        stats = self.calculate_diff_stats(diff)
        print(f"\n统计信息:")
        print(f"  无变化字符数: {stats['unchanged']}")
        print(f"  新增字符数: {stats['added']}")
        print(f"  删除字符数: {stats['removed']}")
        print(f"  总变化字符数: {stats['total_changes']}")
        
        return diff
    
    def subtitle_alignment_example(self):
        """字幕对齐示例"""
        print("\n=== 字幕对齐示例 ===")
        
        # 模拟数量不匹配的字幕
        original_subtitles = [
            "Hello World",
            "This is a test",
            "Goodbye everyone",
            "See you tomorrow",
            "Have a nice day"
        ]
        
        optimized_subtitles = [
            "Hello Beautiful World",
            "This was a test",
            "Goodbye"
            # 缺少最后两个字幕的优化版本
        ]
        
        print("原始字幕数量:", len(original_subtitles))
        print("优化字幕数量:", len(optimized_subtitles))
        
        # 智能对齐处理
        aligned_pairs = self.align_subtitles_intelligently(
            original_subtitles, optimized_subtitles
        )
        
        print("\n对齐结果:")
        for i, (orig, opt) in enumerate(aligned_pairs, 1):
            diff = self.dmp.diff_main(orig, opt)
            self.dmp.diff_cleanupSemantic(diff)
            similarity = self.calculate_similarity(orig, opt)
            
            print(f"\n对齐 {i}:")
            print(f"  原始: {orig}")
            print(f"  优化: {opt}")
            print(f"  相似度: {similarity:.2f}")
            
            # 显示是否有变化
            has_changes = any(op != 0 for op, _ in diff)
            print(f"  有变化: {'是' if has_changes else '否'}")
        
        return aligned_pairs
    
    def calculate_similarity(self, text1: str, text2: str) -> float:
        """计算两个文本的相似度"""
        if text1 == "" and text2 == "":
            return 1.0
        
        diff = self.dmp.diff_main(text1, text2)
        self.dmp.diff_cleanupSemantic(diff)
        
        # 计算相同文本的比例
        same_chars = sum(len(text) for op, text in diff if op == 0)
        max_chars = max(len(text1), len(text2))
        
        return same_chars / max_chars if max_chars > 0 else 1.0
    
    def calculate_diff_stats(self, diff) -> Dict[str, int]:
        """计算差异统计信息"""
        stats = {
            'unchanged': 0,
            'added': 0,
            'removed': 0,
            'total_changes': 0
        }
        
        for operation, text in diff:
            char_count = len(text)
            if operation == 0:
                stats['unchanged'] += char_count
            elif operation == 1:
                stats['added'] += char_count
                stats['total_changes'] += char_count
            elif operation == -1:
                stats['removed'] += char_count
                stats['total_changes'] += char_count
        
        return stats
    
    def align_subtitles_intelligently(self, originals: List[str], optimized: List[str]) -> List[Tuple[str, str]]:
        """智能对齐字幕"""
        aligned_pairs = []
        
        # 如果优化字幕数量不足，使用最后一个优化字幕填充
        for i, orig in enumerate(originals):
            if i < len(optimized):
                opt = optimized[i]
            else:
                # 使用最后一个优化字幕
                opt = optimized[-1] if optimized else orig
            
            aligned_pairs.append((orig, opt))
        
        return aligned_pairs
    
    def run_all_examples(self):
        """运行所有示例"""
        print("diff-match-patch 库使用示例")
        print("=" * 50)
        
        try:
            # 运行各种示例
            self.basic_diff_example()
            self.subtitle_diff_example()
            self.html_diff_example()
            self.patch_example()
            self.match_example()
            self.advanced_diff_example()
            self.subtitle_alignment_example()
            
            print("\n" + "=" * 50)
            print("所有示例运行完成!")
            
        except Exception as e:
            print(f"运行示例时出错: {e}")
            import traceback
            traceback.print_exc()

def main():
    """主函数"""
    demo = TextDiffDemo()
    demo.run_all_examples()

if __name__ == "__main__":
    main()