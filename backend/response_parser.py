"""
LLM响应解析模块
提供健壮的JSON和文本响应解析功能
"""
import json
import re
import logging
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from json_repair import repair_json
from schemas import SubtitleItem, SimpleSubtitleItem, OptimizedSubtitleItem, DiffPartModel
from text_utils import calculate_text_diff
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
    
    def parse_llm_response(self, response_content: str, original_subtitles: List[SimpleSubtitleItem]) -> ParsedResponse:
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
                    # 首先尝试使用标准json解析
                    data = json.loads(json_str)
                    # 支持数组格式和对象格式
                    if isinstance(data, list):
                        return ParsedResponse(
                            success=True,
                            data=data,
                            raw_text=response_content
                        )
                    elif isinstance(data, dict):
                        # 将对象格式转换为数组格式
                        converted_data = self._convert_object_to_array(data)
                        return ParsedResponse(
                            success=True,
                            data=converted_data,
                            raw_text=response_content
                        )
                except json.JSONDecodeError as e:
                    logger.warning(f"标准JSON解析失败: {e}")
                    # 如果标准解析失败，使用json_repair进行修复
                    try:
                        repaired_json = repair_json(json_str)
                        data = json.loads(repaired_json)
                        logger.info("使用json_repair修复JSON成功")
                        # 支持数组格式和对象格式
                        if isinstance(data, list):
                            return ParsedResponse(
                                success=True,
                                data=data,
                                raw_text=response_content,
                                warnings=["使用json_repair修复了JSON格式"]
                            )
                        elif isinstance(data, dict):
                            # 将对象格式转换为数组格式
                            converted_data = self._convert_object_to_array(data)
                            return ParsedResponse(
                                success=True,
                                data=converted_data,
                                raw_text=response_content,
                                warnings=["使用json_repair修复了JSON格式"]
                            )
                    except Exception as repair_error:
                        logger.warning(f"JSON修复失败: {repair_error}")
                        continue
        
        # 尝试直接解析整个响应
        try:
            # 首先尝试使用标准json解析
            data = json.loads(cleaned_content)
            # 支持数组格式和对象格式
            if isinstance(data, list):
                return ParsedResponse(
                    success=True,
                    data=data,
                    raw_text=response_content
                )
            elif isinstance(data, dict):
                # 将对象格式转换为数组格式
                converted_data = self._convert_object_to_array(data)
                return ParsedResponse(
                    success=True,
                    data=converted_data,
                    raw_text=response_content
                )
        except json.JSONDecodeError:
            # 如果标准解析失败，使用json_repair进行修复
            try:
                repaired_json = repair_json(cleaned_content)
                data = json.loads(repaired_json)
                logger.info("使用json_repair修复整个响应JSON成功")
                # 支持数组格式和对象格式
                if isinstance(data, list):
                    return ParsedResponse(
                        success=True,
                        data=data,
                        raw_text=response_content,
                        warnings=["使用json_repair修复了整个响应的JSON格式"]
                    )
                elif isinstance(data, dict):
                    # 将对象格式转换为数组格式
                    converted_data = self._convert_object_to_array(data)
                    return ParsedResponse(
                        success=True,
                        data=converted_data,
                        raw_text=response_content,
                        warnings=["使用json_repair修复了整个响应的JSON格式"]
                    )
            except Exception as repair_error:
                logger.warning(f"修复整个响应JSON失败: {repair_error}")
                pass
        
        return ParsedResponse(
            success=False,
            error="无法解析JSON格式",
            raw_text=response_content
        )
    
    def _convert_object_to_array(self, data: dict) -> List[Dict[str, Any]]:
        """将对象格式的JSON转换为数组格式"""
        converted_data = []
        
        # 处理字符串键（如 "0", "1", "2"）
        for key, value in data.items():
            try:
                # 尝试将键转换为整数
                item_id = int(key)
                converted_data.append({
                    "id": item_id,
                    "optimized_text": str(value)
                })
            except (ValueError, TypeError):
                # 如果键不是数字，跳过该项
                logger.warning(f"跳过无效键: {key}")
                continue
        
        # 按ID排序
        converted_data.sort(key=lambda x: x['id'])
        
        return converted_data
    
    def _try_parse_text(self, response_content: str, original_subtitles: List[SimpleSubtitleItem]) -> ParsedResponse:
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
    
    def _validate_and_enrich_json_response(self, parsed_response: ParsedResponse, original_subtitles: List[SimpleSubtitleItem]) -> ParsedResponse:
        """验证和丰富JSON响应"""
        if not parsed_response.data:
            return parsed_response
        
        validated_data = []
        warnings = parsed_response.warnings or []
        
        # 创建原始字幕的映射
        original_map = {sub.id: sub for sub in original_subtitles}
        
        # 检查数据是否为列表格式
        response_data = parsed_response.data
        if not isinstance(response_data, list):
            warnings.append("响应数据不是列表格式，尝试转换")
            if isinstance(response_data, dict):
                # 尝试将字典转换为列表
                response_data = list(response_data.values())
            else:
                response_data = [response_data]
        
        for item in response_data:
            if not isinstance(item, dict):
                warnings.append(f"跳过非字典项: {item}")
                continue
            
            # 验证必需字段
            if 'id' not in item:
                warnings.append("缺少ID字段，跳过此项")
                continue
            
            item_id = item['id']
            # 确保ID是整数类型
            try:
                item_id = int(item_id)
            except (ValueError, TypeError):
                warnings.append(f"ID {item_id} 不是有效整数，跳过此项")
                continue
            
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
                "optimized_text": str(optimized_text)
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
            warnings=warnings
        )
    
    def create_fallback_response(self, original_subtitles: List[SimpleSubtitleItem], response_content: str) -> ParsedResponse:
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
    return calculate_text_diff(original_text, optimized_text)


def parse_optimization_response(response_content: str, original_subtitles: List[SimpleSubtitleItem]) -> List[OptimizedSubtitleItem]:
    """解析优化响应并返回OptimizedSubtitleItem列表"""
    parser = ResponseParser()
    aligner = SubtitleAligner()
    
    logger.info(f"=== 开始解析AI响应 ===")
    logger.info(f"原始响应内容长度: {len(response_content)} 字符")
    logger.info(f"原始字幕数量: {len(original_subtitles)}")
    
    # 记录原始响应内容的前几行
    response_lines = response_content.split('\n')
    logger.info(f"响应内容行数: {len(response_lines)}")
    for i, line in enumerate(response_lines[:10]):
        logger.info(f"响应第{i+1}行: {line.strip()}")
    if len(response_lines) > 10:
        logger.info(f"... 还有 {len(response_lines) - 10} 行")
    
    parsed_response = parser.parse_llm_response(response_content, original_subtitles)
    
    logger.info(f"=== 解析结果 ===")
    logger.info(f"解析成功: {parsed_response.success}")
    if parsed_response.success:
        logger.info(f"解析得到数据项数量: {len(parsed_response.data) if parsed_response.data else 0}")
        if parsed_response.data:
            for i, item in enumerate(parsed_response.data[:5]):  # 只显示前5项
                logger.info(f"解析项{i+1}: {item}")
            if len(parsed_response.data) > 5:
                logger.info(f"... 还有 {len(parsed_response.data) - 5} 项")
    else:
        logger.error(f"解析失败: {parsed_response.error}")
    
    if not parsed_response.success:
        # 如果解析失败，使用备用对齐
        logger.warning("解析失败，使用备用对齐")
        alignment_result = aligner.create_fallback_alignment(original_subtitles)
    else:
        # 使用字幕对齐器进行对齐（使用宽松模式）
        logger.info("开始字幕对齐（宽松模式）...")
        alignment_result = aligner.align_subtitles(original_subtitles, parsed_response.data, strict_mode=False)
        
        # 如果对齐失败，使用备用对齐
        if not alignment_result.success:
            logger.warning(f"字幕对齐失败: {alignment_result.error}")
            logger.warning("使用备用对齐")
            alignment_result = aligner.create_fallback_alignment(original_subtitles)
        else:
            logger.info(f"字幕对齐成功，对齐结果数量: {len(alignment_result.aligned_subtitles)}")
    
    # 记录解析警告
    if parsed_response.warnings:
        logger.warning(f"=== 解析警告 ===")
        for warning in parsed_response.warnings:
            logger.warning(f"响应解析警告: {warning}")
    
    # 记录对齐警告
    if alignment_result.warnings:
        logger.warning(f"=== 对齐警告 ===")
        for warning in alignment_result.warnings:
            logger.warning(f"字幕对齐警告: {warning}")
    
    logger.info(f"=== 解析完成 ===")
    logger.info(f"最终返回优化字幕数量: {len(alignment_result.aligned_subtitles)}")
    
    return alignment_result.aligned_subtitles