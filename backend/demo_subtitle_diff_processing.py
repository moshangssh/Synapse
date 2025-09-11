#!/usr/bin/env python3
"""
Synapse 项目中 diff-match-patch 的实际应用示例
展示如何在字幕处理流程中使用 diff-match-patch 库
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from diff_match_patch import diff_match_patch
from typing import List, Dict, Any, Optional
import json
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SubtitleDiffProcessor:
    """字幕差异处理器"""
    
    def __init__(self):
        self.dmp = diff_match_patch()
        self.dmp.Diff_Timeout = 5.0  # 设置5秒超时
    
    def process_subtitle_optimization(self, 
                                     original_subtitles: List[Dict[str, Any]], 
                                     optimized_subtitles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        处理字幕优化流程，计算差异并生成对齐结果
        
        Args:
            original_subtitles: 原始字幕列表
            optimized_subtitles: 优化后的字幕列表
            
        Returns:
            处理后的字幕列表，包含差异信息
        """
        logger.info(f"开始处理字幕优化，原始字幕数量: {len(original_subtitles)}, 优化字幕数量: {len(optimized_subtitles)}")
        
        processed_subtitles = []
        
        # 处理数量不匹配的情况
        max_length = max(len(original_subtitles), len(optimized_subtitles))
        
        for i in range(max_length):
            original_item = original_subtitles[i] if i < len(original_subtitles) else None
            optimized_item = optimized_subtitles[i] if i < len(optimized_subtitles) else None
            
            # 处理缺失的字幕
            if original_item is None:
                # 原始字幕不足，使用优化字幕作为原始字幕
                original_item = {
                    'id': optimized_item['id'],
                    'text': optimized_item['text'],
                    'start_time': optimized_item.get('start_time', '00:00:00'),
                    'end_time': optimized_item.get('end_time', '00:00:00')
                }
            
            if optimized_item is None:
                # 优化字幕不足，使用原始字幕作为优化字幕
                optimized_item = {
                    'id': original_item['id'],
                    'text': original_item['text'],
                    'start_time': original_item.get('start_time', '00:00:00'),
                    'end_time': original_item.get('end_time', '00:00:00')
                }
            
            # 计算文本差异
            diff_result = self.calculate_text_diff_with_stats(
                original_item['text'], 
                optimized_item['text']
            )
            
            # 构建处理后的字幕项
            processed_item = {
                'id': original_item['id'],
                'original_text': original_item['text'],
                'optimized_text': optimized_item['text'],
                'start_time': original_item.get('start_time', '00:00:00'),
                'end_time': original_item.get('end_time', '00:00:00'),
                'diff': diff_result['diff'],
                'similarity': diff_result['similarity'],
                'has_changes': diff_result['has_changes'],
                'change_stats': diff_result['stats']
            }
            
            processed_subtitles.append(processed_item)
        
        logger.info(f"字幕处理完成，共处理 {len(processed_subtitles)} 条字幕")
        return processed_subtitles
    
    def calculate_text_diff_with_stats(self, original_text: str, new_text: str) -> Dict[str, Any]:
        """
        计算文本差异并返回统计信息
        
        Args:
            original_text: 原始文本
            new_text: 新文本
            
        Returns:
            包含差异和统计信息的字典
        """
        # 特殊处理：两个空字符串
        if original_text == "" and new_text == "":
            return {
                'diff': [{'type': 'normal', 'value': ''}],
                'similarity': 1.0,
                'has_changes': False,
                'stats': {'unchanged': 0, 'added': 0, 'removed': 0, 'total_changes': 0}
            }
        
        # 计算差异
        diff = self.dmp.diff_main(original_text, new_text)
        self.dmp.diff_cleanupSemantic(diff)
        
        # 转换为标准格式
        formatted_diff = []
        for operation, text in diff:
            if operation == 1:
                formatted_diff.append({'type': 'added', 'value': text})
            elif operation == -1:
                formatted_diff.append({'type': 'removed', 'value': text})
            else:
                formatted_diff.append({'type': 'normal', 'value': text})
        
        # 计算统计信息
        stats = {
            'unchanged': sum(len(text) for op, text in diff if op == 0),
            'added': sum(len(text) for op, text in diff if op == 1),
            'removed': sum(len(text) for op, text in diff if op == -1),
            'total_changes': sum(len(text) for op, text in diff if op != 0)
        }
        
        # 计算相似度
        max_length = max(len(original_text), len(new_text))
        similarity = stats['unchanged'] / max_length if max_length > 0 else 1.0
        
        return {
            'diff': formatted_diff,
            'similarity': similarity,
            'has_changes': stats['total_changes'] > 0,
            'stats': stats
        }
    
    def generate_diff_report(self, processed_subtitles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        生成差异报告
        
        Args:
            processed_subtitles: 处理后的字幕列表
            
        Returns:
            差异报告
        """
        total_subtitles = len(processed_subtitles)
        changed_subtitles = sum(1 for item in processed_subtitles if item['has_changes'])
        
        total_stats = {
            'unchanged': 0,
            'added': 0,
            'removed': 0,
            'total_changes': 0
        }
        
        similarity_scores = []
        
        for item in processed_subtitles:
            stats = item['change_stats']
            total_stats['unchanged'] += stats['unchanged']
            total_stats['added'] += stats['added']
            total_stats['removed'] += stats['removed']
            total_stats['total_changes'] += stats['total_changes']
            similarity_scores.append(item['similarity'])
        
        avg_similarity = sum(similarity_scores) / len(similarity_scores) if similarity_scores else 0
        
        report = {
            'total_subtitles': total_subtitles,
            'changed_subtitles': changed_subtitles,
            'unchanged_subtitles': total_subtitles - changed_subtitles,
            'change_rate': changed_subtitles / total_subtitles if total_subtitles > 0 else 0,
            'average_similarity': avg_similarity,
            'total_stats': total_stats,
            'quality_score': self.calculate_quality_score(similarity_scores)
        }
        
        return report
    
    def calculate_quality_score(self, similarity_scores: List[float]) -> float:
        """
        计算优化质量分数
        
        Args:
            similarity_scores: 相似度分数列表
            
        Returns:
            质量分数 (0.0 - 1.0)
        """
        if not similarity_scores:
            return 0.0
        
        # 基于相似度分数计算质量分数
        # 可以根据需要调整权重
        avg_similarity = sum(similarity_scores) / len(similarity_scores)
        
        # 质量分数计算：相似度占70%，一致性占30%
        consistency = 1.0 - (max(similarity_scores) - min(similarity_scores)) / max(similarity_scores) if max(similarity_scores) > 0 else 0.0
        
        quality_score = (avg_similarity * 0.7) + (consistency * 0.3)
        return min(1.0, max(0.0, quality_score))
    
    def export_diff_html(self, processed_subtitles: List[Dict[str, Any]], output_file: str):
        """
        导出HTML格式的差异报告
        
        Args:
            processed_subtitles: 处理后的字幕列表
            output_file: 输出文件路径
        """
        html_content = self.generate_html_report(processed_subtitles)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logger.info(f"HTML差异报告已导出到: {output_file}")
    
    def generate_html_report(self, processed_subtitles: List[Dict[str, Any]]) -> str:
        """
        生成HTML格式的差异报告
        
        Args:
            processed_subtitles: 处理后的字幕列表
            
        Returns:
            HTML内容
        """
        # 生成报告
        report = self.generate_diff_report(processed_subtitles)
        
        # 生成HTML内容
        html_lines = [
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8">',
            '<title>字幕优化差异报告</title>',
            '<style>',
            'body { font-family: Arial, sans-serif; margin: 20px; }',
            '.header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }',
            '.stats { display: flex; gap: 20px; margin-bottom: 20px; }',
            '.stat-card { background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #007acc; }',
            '.subtitle-item { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }',
            '.subtitle-header { font-weight: bold; margin-bottom: 10px; }',
            '.diff-content { margin-top: 10px; }',
            'del { background-color: #ffe6e6; text-decoration: line-through; }',
            'ins { background-color: #e6ffe6; text-decoration: underline; }',
            '.similarity-bar { width: 100px; height: 10px; background-color: #ddd; border-radius: 5px; overflow: hidden; display: inline-block; margin-left: 10px; }',
            '.similarity-fill { height: 100%; background-color: #4CAF50; }',
            '</style>',
            '</head>',
            '<body>',
            '<div class="header">',
            '<h1>字幕优化差异报告</h1>',
            '<div class="stats">',
            f'<div class="stat-card">',
            f'<h3>总字幕数</h3>',
            f'<p>{report["total_subtitles"]}</p>',
            f'</div>',
            f'<div class="stat-card">',
            f'<h3>已修改字幕</h3>',
            f'<p>{report["changed_subtitles"]}</p>',
            f'</div>',
            f'<div class="stat-card">',
            f'<h3>修改率</h3>',
            f'<p>{report["change_rate"]:.1%}</p>',
            f'</div>',
            f'<div class="stat-card">',
            f'<h3>平均相似度</h3>',
            f'<p>{report["average_similarity"]:.1%}</p>',
            f'</div>',
            f'<div class="stat-card">',
            f'<h3>质量分数</h3>',
            f'<p>{report["quality_score"]:.1%}</p>',
            f'</div>',
            f'</div>',
            f'</div>'
        ]
        
        # 添加每个字幕的差异信息
        for item in processed_subtitles:
            if not item['has_changes']:
                continue
            
            # 生成HTML差异
            diff_html = self.generate_diff_html(item['diff'])
            
            html_lines.extend([
                '<div class="subtitle-item">',
                f'<div class="subtitle-header">',
                f'字幕 ID: {item["id"]} | ',
                f'相似度: {item["similarity"]:.1%}',
                f'<div class="similarity-bar">',
                f'<div class="similarity-fill" style="width: {item["similarity"] * 100}%"></div>',
                f'</div>',
                f'</div>',
                f'<div><strong>原始文本:</strong> {item["original_text"]}</div>',
                f'<div><strong>优化文本:</strong> {item["optimized_text"]}</div>',
                f'<div class="diff-content"><strong>差异:</strong> {diff_html}</div>',
                f'</div>'
            ])
        
        html_lines.extend(['</body>', '</html>'])
        
        return '\n'.join(html_lines)
    
    def generate_diff_html(self, diff: List[Dict[str, Any]]) -> str:
        """
        生成HTML格式的差异内容
        
        Args:
            diff: 差异列表
            
        Returns:
            HTML格式的差异内容
        """
        html_parts = []
        
        for part in diff:
            if part['type'] == 'added':
                html_parts.append(f'<ins style="background:#e6ffe6;">{part["value"]}</ins>')
            elif part['type'] == 'removed':
                html_parts.append(f'<del style="background:#ffe6e6;">{part["value"]}</del>')
            else:
                html_parts.append(f'<span>{part["value"]}</span>')
        
        return ''.join(html_parts)

def main():
    """主函数 - 演示字幕差异处理流程"""
    
    # 示例数据
    original_subtitles = [
        {
            'id': 1,
            'text': 'Hello World',
            'start_time': '00:00:01',
            'end_time': '00:00:03'
        },
        {
            'id': 2,
            'text': 'This is a test',
            'start_time': '00:00:04',
            'end_time': '00:00:06'
        },
        {
            'id': 3,
            'text': 'Goodbye everyone',
            'start_time': '00:00:07',
            'end_time': '00:00:09'
        },
        {
            'id': 4,
            'text': 'See you tomorrow',
            'start_time': '00:00:10',
            'end_time': '00:00:12'
        }
    ]
    
    optimized_subtitles = [
        {
            'id': 1,
            'text': 'Hello Beautiful World',
            'start_time': '00:00:01',
            'end_time': '00:00:03'
        },
        {
            'id': 2,
            'text': 'This was a test',
            'start_time': '00:00:04',
            'end_time': '00:00:06'
        },
        {
            'id': 3,
            'text': 'Goodbye',
            'start_time': '00:00:07',
            'end_time': '00:00:09'
        }
        # 缺少第4个字幕
    ]
    
    # 创建处理器
    processor = SubtitleDiffProcessor()
    
    # 处理字幕
    processed_subtitles = processor.process_subtitle_optimization(
        original_subtitles, optimized_subtitles
    )
    
    # 生成报告
    report = processor.generate_diff_report(processed_subtitles)
    
    # 输出结果
    print("=== 字幕优化差异处理结果 ===")
    print(f"总字幕数: {report['total_subtitles']}")
    print(f"已修改字幕: {report['changed_subtitles']}")
    print(f"修改率: {report['change_rate']:.1%}")
    print(f"平均相似度: {report['average_similarity']:.1%}")
    print(f"质量分数: {report['quality_score']:.1%}")
    print(f"总变化字符数: {report['total_stats']['total_changes']}")
    
    # 输出详细差异
    print("\n=== 详细差异信息 ===")
    for item in processed_subtitles:
        if item['has_changes']:
            print(f"\n字幕 ID: {item['id']}")
            print(f"原始: {item['original_text']}")
            print(f"优化: {item['optimized_text']}")
            print(f"相似度: {item['similarity']:.1%}")
            
            # 显示变化统计
            stats = item['change_stats']
            print(f"变化统计: 新增{stats['added']}字符, 删除{stats['removed']}字符")
    
    # 导出HTML报告
    processor.export_diff_html(processed_subtitles, 'subtitle_diff_report.html')
    
    # 导出JSON数据
    with open('subtitle_diff_data.json', 'w', encoding='utf-8') as f:
        json.dump({
            'report': report,
            'subtitles': processed_subtitles
        }, f, ensure_ascii=False, indent=2)
    
    print("\n=== 文件导出完成 ===")
    print("HTML报告: subtitle_diff_report.html")
    print("JSON数据: subtitle_diff_data.json")

if __name__ == "__main__":
    main()