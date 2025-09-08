"""
LLM响应解析模块
提供健壮的JSON和文本响应解析功能
"""
import json
import re
import logging
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from schemas import SubtitleItem, OptimizedSubtitleItem, DiffPartModel
from subtitle_aligner import SubtitleAligner

logger = logging.getLogger(__name__)


@dataclass
class ParsedResponse:
    """解析后的响应"""
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    raw_text: Optional[str] = None
    error: Optional[str] = None
    warnings: List[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []


class ResponseParser:
    """LLM响应解析器"""
    
    def __init__(self):
        self.json_patterns = [
            # 标准JSON数组
            r'\[\s*\{.*?\}\s*\]',
            # 可能被代码块包围的JSON
            r'```(?:json)?\s*(\[\s*\{.*?\}\s*\])\s*```',
            # 可能被其他文本包围的JSON
            r'(\[\s*\{.*?\}\s*\])',
        ]
        
        self.text_patterns = [
            # 编号列表格式
            r'(\d+)[\.\)]\s*(.*?)(?=\d+[\.\)]|$)',
            # 可能的字幕格式
            r'["\']?(\d+)["\']?\s*[:\-]\s*(.*?)(?=\d+[\.\)]|$)',
        ]
    
    def parse_llm_response(self, response_content: str, original_subtitles: List[SubtitleItem]) -> ParsedResponse:
        """解析LLM响应"""
        if not response_content or not response_content.strip():
            return ParsedResponse(
                success=False,
                error="响应内容为空",
                raw_text=response_content
            )
        
        # 尝试解析JSON格式
        json_result = self._try_parse_json(response_content)
        if json_result.success:
            return self._validate_and_enrich_json_response(json_result, original_subtitles)
        
        # 尝试解析文本格式
        text_result = self._try_parse_text(response_content, original_subtitles)
        if text_result.success:
            return text_result
        
        # 如果都失败，返回原始响应
        return ParsedResponse(
            success=False,
            error="无法解析响应格式",
            raw_text=response_content,
            warnings=["响应格式无法识别，将使用原始文本"]
        )
    
    def _try_parse_json(self, response_content: str) -> ParsedResponse:
        """尝试解析JSON格式"""
        cleaned_content = response_content.strip()
        
        # 尝试不同的JSON提取模式
        for pattern in self.json_patterns:
            matches = re.findall(pattern, cleaned_content, re.DOTALL)
            if matches:
                json_str = matches[0] if isinstance(matches[0], str) else matches[0][0]
                
                try:
                    data = json.loads(json_str)
                    if isinstance(data, list):
                        return ParsedResponse(
                            success=True,
                            data=data,
                            raw_text=response_content
                        )
                except json.JSONDecodeError as e:
                    logger.warning(f"JSON解析失败: {e}")
                    continue
        
        # 尝试直接解析整个响应
        try:
            data = json.loads(cleaned_content)
            if isinstance(data, list):
                return ParsedResponse(
                    success=True,
                    data=data,
                    raw_text=response_content
                )
        except json.JSONDecodeError:
            pass
        
        return ParsedResponse(
            success=False,
            error="无法解析JSON格式",
            raw_text=response_content
        )
    
    def _try_parse_text(self, response_content: str, original_subtitles: List[SubtitleItem]) -> ParsedResponse:
        """尝试解析文本格式"""
        cleaned_content = response_content.strip()
        parsed_data = []
        
        # 尝试不同的文本解析模式
        for pattern in self.text_patterns:
            matches = re.findall(pattern, cleaned_content, re.DOTALL)
            if matches:
                for match in matches:
                    if isinstance(match, tuple) and len(match) >= 2:
                        item_id = match[0].strip()
                        text = match[1].strip()
                        
                        # 尝试将ID转换为整数
                        try:
                            item_id = int(item_id)
                        except ValueError:
                            continue
                        
                        parsed_data.append({
                            "id": item_id,
                            "optimized_text": text
                        })
                
                if parsed_data:
                    return ParsedResponse(
                        success=True,
                        data=parsed_data,
                        raw_text=response_content,
                        warnings=["使用文本格式解析，建议使用JSON格式以获得更好的准确性"]
                    )
        
        # 如果没有匹配的模式，尝试按行分割
        lines = [line.strip() for line in cleaned_content.split('\n') if line.strip()]
        if len(lines) == len(original_subtitles):
            parsed_data = []
            for i, line in enumerate(lines):
                parsed_data.append({
                    "id": original_subtitles[i].id,
                    "optimized_text": line
                })
            
            return ParsedResponse(
                success=True,
                data=parsed_data,
                raw_text=response_content,
                warnings=["使用行分割解析，建议使用结构化格式"]
            )
        
        return ParsedResponse(
            success=False,
            error="无法解析文本格式",
            raw_text=response_content
        )
    
    def _validate_and_enrich_json_response(self, parsed_response: ParsedResponse, original_subtitles: List[SubtitleItem]) -> ParsedResponse:
        """验证和丰富JSON响应"""
        if not parsed_response.data:
            return parsed_response
        
        validated_data = []
        warnings = []
        
        # 创建原始字幕的映射
        original_map = {sub.id: sub for sub in original_subtitles}
        
        for item in parsed_response.data:
            if not isinstance(item, dict):
                warnings.append(f"跳过非字典项: {item}")
                continue
            
            # 验证必需字段
            if 'id' not in item:
                warnings.append("缺少ID字段，跳过此项")
                continue
            
            item_id = item['id']
            if item_id not in original_map:
                warnings.append(f"未找到ID为 {item_id} 的原始字幕")
                continue
            
            # 获取优化文本
            optimized_text = item.get('optimized_text', item.get('text', ''))
            if not optimized_text:
                optimized_text = original_map[item_id].text
                warnings.append(f"ID {item_id} 缺少优化文本，使用原始文本")
            
            validated_data.append({
                "id": item_id,
                "optimized_text": optimized_text
            })
        
        # 检查是否有缺失的字幕
        found_ids = {item['id'] for item in validated_data}
        missing_ids = set(original_map.keys()) - found_ids
        if missing_ids:
            warnings.append(f"缺失的字幕ID: {sorted(missing_ids)}")
            # 为缺失的字幕添加原始文本
            for missing_id in missing_ids:
                validated_data.append({
                    "id": missing_id,
                    "optimized_text": original_map[missing_id].text
                })
        
        # 按ID排序
        validated_data.sort(key=lambda x: x['id'])
        
        return ParsedResponse(
            success=True,
            data=validated_data,
            raw_text=parsed_response.raw_text,
            warnings=parsed_response.warnings + warnings
        )
    
    def create_fallback_response(self, original_subtitles: List[SubtitleItem], response_content: str) -> ParsedResponse:
        """创建备用响应"""
        fallback_data = []
        for sub in original_subtitles:
            fallback_data.append({
                "id": sub.id,
                "optimized_text": sub.text  # 使用原始文本作为备用
            })
        
        return ParsedResponse(
            success=True,
            data=fallback_data,
            raw_text=response_content,
            warnings=["使用备用响应：所有字幕保持原样"]
        )


def calculate_diff(original_text: str, optimized_text: str) -> List[DiffPartModel]:
    """计算文本差异"""
    if original_text == optimized_text:
        return [{"type": "normal", "value": original_text}]
    
    # 简单的差异计算（可以替换为更复杂的diff算法）
    return [
        {"type": "removed", "value": original_text},
        {"type": "added", "value": optimized_text}
    ]


def parse_optimization_response(response_content: str, original_subtitles: List[SubtitleItem]) -> List[OptimizedSubtitleItem]:
    """解析优化响应并返回OptimizedSubtitleItem列表"""
    parser = ResponseParser()
    aligner = SubtitleAligner()
    
    parsed_response = parser.parse_llm_response(response_content, original_subtitles)
    
    if not parsed_response.success:
        # 如果解析失败，使用备用对齐
        alignment_result = aligner.create_fallback_alignment(original_subtitles)
    else:
        # 使用字幕对齐器进行对齐
        alignment_result = aligner.align_subtitles(original_subtitles, parsed_response.data)
        
        # 如果对齐失败，使用备用对齐
        if not alignment_result.success:
            logger.warning(f"字幕对齐失败: {alignment_result.error}")
            alignment_result = aligner.create_fallback_alignment(original_subtitles)
    
    # 记录解析警告
    for warning in parsed_response.warnings:
        logger.warning(f"响应解析警告: {warning}")
    
    # 记录对齐警告
    for warning in alignment_result.warnings:
        logger.warning(f"字幕对齐警告: {warning}")
    
    return alignment_result.aligned_subtitles