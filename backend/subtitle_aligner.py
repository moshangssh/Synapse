"""
字幕对齐模块
确保AI优化文本与原始字幕完美对齐，保留所有元数据和时间码
"""
import logging
import time
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

from schemas import SubtitleItem, OptimizedSubtitleItem, DiffPartModel, OptimizationErrorCode

logger = logging.getLogger(__name__)


@dataclass
class AlignmentResult:
    """对齐结果"""
    success: bool
    aligned_subtitles: List[OptimizedSubtitleItem] = None
    error: Optional[str] = None
    error_code: Optional[OptimizationErrorCode] = None
    processing_time: float = 0.0
    warnings: List[str] = None
    
    def __post_init__(self):
        if self.aligned_subtitles is None:
            self.aligned_subtitles = []
        if self.warnings is None:
            self.warnings = []


class SubtitleAligner:
    """字幕对齐器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def align_subtitles(
        self, 
        original_subtitles: List[SubtitleItem], 
        optimized_data: List[Dict[str, Any]]
    ) -> AlignmentResult:
        """
        对齐优化文本与原始字幕
        
        Args:
            original_subtitles: 原始字幕列表
            optimized_data: 解析后的优化数据，包含id和optimized_text字段
            
        Returns:
            AlignmentResult: 对齐结果
        """
        start_time = time.time()
        all_warnings = []
        
        try:
            # 验证输入
            validation_result = self._validate_alignment_inputs(original_subtitles, optimized_data)
            if not validation_result.success:
                return validation_result
            
            # 创建原始字幕映射
            original_map = {sub.id: sub for sub in original_subtitles}
            
            # 执行对齐
            aligned_subtitles, alignment_warnings = self._perform_alignment(original_map, optimized_data)
            all_warnings.extend(alignment_warnings)
            
            # 验证对齐结果
            result_validation = self._validate_alignment_result(original_subtitles, aligned_subtitles)
            if not result_validation.success:
                return result_validation
            
            processing_time = time.time() - start_time
            
            # 合并所有警告
            all_warnings.extend(result_validation.warnings)
            
            return AlignmentResult(
                success=True,
                aligned_subtitles=aligned_subtitles,
                processing_time=processing_time,
                warnings=all_warnings
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            self.logger.error(f"字幕对齐失败: {e}")
            return AlignmentResult(
                success=False,
                error=f"字幕对齐失败: {str(e)}",
                error_code=OptimizationErrorCode.PROCESSING_ERROR,
                processing_time=processing_time,
                warnings=all_warnings
            )
    
    def _validate_alignment_inputs(
        self, 
        original_subtitles: List[SubtitleItem], 
        optimized_data: List[Dict[str, Any]]
    ) -> AlignmentResult:
        """验证对齐输入"""
        if not original_subtitles:
            return AlignmentResult(
                success=False,
                error="原始字幕列表不能为空",
                error_code=OptimizationErrorCode.INVALID_REQUEST
            )
        
        if not optimized_data:
            return AlignmentResult(
                success=False,
                error="优化数据不能为空",
                error_code=OptimizationErrorCode.INVALID_REQUEST
            )
        
        # 首先验证优化数据格式
        for i, item in enumerate(optimized_data):
            if not isinstance(item, dict):
                return AlignmentResult(
                    success=False,
                    error=f"优化数据项 {i} 不是字典格式",
                    error_code=OptimizationErrorCode.INVALID_REQUEST
                )
            
            if 'id' not in item:
                return AlignmentResult(
                    success=False,
                    error=f"优化数据项 {i} 缺少ID字段",
                    error_code=OptimizationErrorCode.INVALID_REQUEST
                )
            
            # 检查ID是否存在于原始字幕中
            item_id = item['id']
            if not any(sub.id == item_id for sub in original_subtitles):
                return AlignmentResult(
                    success=False,
                    error=f"优化数据中的ID {item_id} 不存在于原始字幕中",
                    error_code=OptimizationErrorCode.INVALID_REQUEST
                )
        
        # 然后检查字幕数量匹配
        original_count = len(original_subtitles)
        optimized_count = len(optimized_data)
        
        if original_count != optimized_count:
            self.logger.warning(f"字幕数量不匹配: 原始={original_count}, 优化={optimized_count}")
            return AlignmentResult(
                success=False,
                error=f"字幕数量不匹配: 原始={original_count}, 优化={optimized_count}",
                error_code=OptimizationErrorCode.PROCESSING_ERROR
            )
        
        return AlignmentResult(success=True)
    
    def _perform_alignment(
        self, 
        original_map: Dict[int, SubtitleItem], 
        optimized_data: List[Dict[str, Any]]
    ) -> Tuple[List[OptimizedSubtitleItem], List[str]]:
        """执行对齐操作"""
        aligned_subtitles = []
        warnings = []
        
        for item in optimized_data:
            item_id = item['id']
            original_sub = original_map.get(item_id)
            
            if not original_sub:
                warnings.append(f"未找到ID为 {item_id} 的原始字幕")
                continue
            
            # 获取优化文本
            optimized_text = item.get('optimized_text', '')
            if not optimized_text:
                optimized_text = original_sub.text
                warnings.append(f"ID {item_id} 缺少优化文本，使用原始文本")
            
            # 计算差异
            diffs = self._calculate_diffs(original_sub.text, optimized_text)
            
            # 创建对齐后的字幕项
            aligned_item = OptimizedSubtitleItem(
                id=original_sub.id,
                original_text=original_sub.text,
                optimized_text=optimized_text,
                diffs=diffs
            )
            
            aligned_subtitles.append(aligned_item)
        
        # 按ID排序以确保顺序正确
        aligned_subtitles.sort(key=lambda x: x.id)
        
        # 将警告传递给调用者
        if warnings:
            self.logger.warning(f"对齐过程中的警告: {warnings}")
        
        return aligned_subtitles, warnings
    
    def _calculate_diffs(self, original_text: str, optimized_text: str) -> List[DiffPartModel]:
        """计算文本差异"""
        if original_text == optimized_text:
            return [DiffPartModel(type="normal", value=original_text)]
        
        # 简单的差异计算（可以替换为更复杂的diff算法）
        return [
            DiffPartModel(type="removed", value=original_text),
            DiffPartModel(type="added", value=optimized_text)
        ]
    
    def _validate_alignment_result(
        self, 
        original_subtitles: List[SubtitleItem], 
        aligned_subtitles: List[OptimizedSubtitleItem]
    ) -> AlignmentResult:
        """验证对齐结果"""
        warnings = []
        
        # 检查数量匹配
        if len(original_subtitles) != len(aligned_subtitles):
            return AlignmentResult(
                success=False,
                error=f"对齐结果数量不匹配: 原始={len(original_subtitles)}, 对齐={len(aligned_subtitles)}",
                error_code=OptimizationErrorCode.PROCESSING_ERROR
            )
        
        # 检查ID匹配和顺序
        for i, (original, aligned) in enumerate(zip(original_subtitles, aligned_subtitles)):
            if original.id != aligned.id:
                return AlignmentResult(
                    success=False,
                    error=f"ID不匹配在位置 {i}: 原始={original.id}, 对齐={aligned.id}",
                    error_code=OptimizationErrorCode.PROCESSING_ERROR
                )
            
            # 检查原始文本是否保留
            if original.text != aligned.original_text:
                warnings.append(f"ID {original.id} 的原始文本未正确保留")
            
            # 检查优化文本不为空
            if not aligned.optimized_text:
                warnings.append(f"ID {original.id} 的优化文本为空")
        
        return AlignmentResult(
            success=True,
            warnings=warnings
        )
    
    def create_fallback_alignment(self, original_subtitles: List[SubtitleItem]) -> AlignmentResult:
        """创建备用对齐结果"""
        aligned_subtitles = []
        
        for sub in original_subtitles:
            diffs = self._calculate_diffs(sub.text, sub.text)
            
            aligned_item = OptimizedSubtitleItem(
                id=sub.id,
                original_text=sub.text,
                optimized_text=sub.text,
                diffs=diffs
            )
            aligned_subtitles.append(aligned_item)
        
        return AlignmentResult(
            success=True,
            aligned_subtitles=aligned_subtitles,
            warnings=["使用备用对齐：所有字幕保持原样"]
        )