"""
字幕对齐模块
确保AI优化文本与原始字幕完美对齐，保留所有元数据和时间码
"""
import logging
import time
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher

from schemas import SubtitleItem, SimpleSubtitleItem, OptimizedSubtitleItem, DiffPartModel, OptimizationErrorCode
from intelligent_aligner import IntelligentAligner
from text_utils import calculate_text_diff

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
        self.intelligent_aligner = IntelligentAligner()
    
    def align_subtitles(
        self, 
        original_subtitles: List[SimpleSubtitleItem], 
        optimized_data: List[Dict[str, Any]],
        strict_mode: bool = True
    ) -> AlignmentResult:
        """
        对齐优化文本与原始字幕
        
        Args:
            original_subtitles: 原始字幕列表
            optimized_data: 解析后的优化数据，包含id和optimized_text字段
            strict_mode: 是否使用严格模式（默认True）
            
        Returns:
            AlignmentResult: 对齐结果
        """
        start_time = time.time()
        all_warnings = []
        
        try:
            # 验证输入
            validation_result = self._validate_alignment_inputs(original_subtitles, optimized_data)
            if not validation_result.success:
                # 检查是否是数量不匹配导致的失败
                if "字幕数量不匹配" in validation_result.error and not strict_mode:
                    # 宽松模式下，使用部分对齐处理数量不匹配的情况
                    self.logger.warning("检测到字幕数量不匹配，使用部分对齐模式")
                    partial_result = self._create_partial_alignment(original_subtitles, optimized_data)
                    partial_result.processing_time = time.time() - start_time
                    return partial_result
                elif strict_mode:
                    # 严格模式下验证失败，返回错误
                    return validation_result
                else:
                    # 宽松模式下使用智能对齐
                    self.logger.warning("严格模式验证失败，切换到智能对齐模式")
                    intelligent_result = self.create_intelligent_alignment(original_subtitles, optimized_data)
                    intelligent_result.processing_time = time.time() - start_time
                    return intelligent_result
            
            # 创建原始字幕映射
            original_map = {sub.id: sub for sub in original_subtitles}
            
            # 执行对齐
            aligned_subtitles, alignment_warnings = self._perform_alignment(original_map, optimized_data)
            all_warnings.extend(alignment_warnings)
            
            # 验证对齐结果
            result_validation = self._validate_alignment_result(original_subtitles, aligned_subtitles)
            if not result_validation.success:
                # 如果严格模式下验证失败，返回错误
                if strict_mode:
                    return result_validation
                else:
                    # 宽松模式下使用智能对齐
                    self.logger.warning("严格模式对齐验证失败，切换到智能对齐模式")
                    intelligent_result = self.create_intelligent_alignment(original_subtitles, optimized_data)
                    intelligent_result.processing_time = time.time() - start_time
                    return intelligent_result
            
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
        original_subtitles: List[SimpleSubtitleItem], 
        optimized_data: List[Dict[str, Any]]
    ) -> AlignmentResult:
        """验证对齐输入"""
        self.logger.info(f"=== 开始验证对齐输入 ===")
        self.logger.info(f"原始字幕数量: {len(original_subtitles)}")
        self.logger.info(f"优化数据数量: {len(optimized_data)}")
        
        # 记录原始字幕信息
        for i, sub in enumerate(original_subtitles[:5]):  # 只显示前5个
            self.logger.info(f"原始字幕{i+1}: ID={sub.id}, 文本='{sub.text[:50]}...'")
        if len(original_subtitles) > 5:
            self.logger.info(f"... 还有 {len(original_subtitles) - 5} 个原始字幕")
        
        # 记录优化数据信息
        for i, item in enumerate(optimized_data[:5]):  # 只显示前5个
            self.logger.info(f"优化数据{i+1}: {item}")
        if len(optimized_data) > 5:
            self.logger.info(f"... 还有 {len(optimized_data) - 5} 个优化数据")
        
        if not original_subtitles:
            self.logger.error("验证失败: 原始字幕列表不能为空")
            return AlignmentResult(
                success=False,
                error="原始字幕列表不能为空",
                error_code=OptimizationErrorCode.INVALID_REQUEST
            )
        
        if not optimized_data:
            self.logger.error("验证失败: 优化数据不能为空")
            return AlignmentResult(
                success=False,
                error="优化数据不能为空",
                error_code=OptimizationErrorCode.INVALID_REQUEST
            )
        
        # 首先验证优化数据格式
        for i, item in enumerate(optimized_data):
            if not isinstance(item, dict):
                self.logger.error(f"验证失败: 优化数据项 {i} 不是字典格式，类型: {type(item)}")
                return AlignmentResult(
                    success=False,
                    error=f"优化数据项 {i} 不是字典格式",
                    error_code=OptimizationErrorCode.INVALID_REQUEST
                )
            
            if 'id' not in item:
                self.logger.error(f"验证失败: 优化数据项 {i} 缺少ID字段，字段: {list(item.keys())}")
                return AlignmentResult(
                    success=False,
                    error=f"优化数据项 {i} 缺少ID字段",
                    error_code=OptimizationErrorCode.INVALID_REQUEST
                )
            
            # 检查ID是否存在于原始字幕中
            item_id = item['id']
            original_ids = [sub.id for sub in original_subtitles]
            if item_id not in original_ids:
                self.logger.error(f"验证失败: 优化数据中的ID {item_id} 不存在于原始字幕中，原始ID: {original_ids}")
                return AlignmentResult(
                    success=False,
                    error=f"优化数据中的ID {item_id} 不存在于原始字幕中",
                    error_code=OptimizationErrorCode.INVALID_REQUEST
                )
        
        # 检查字幕数量匹配
        original_count = len(original_subtitles)
        optimized_count = len(optimized_data)
        
        self.logger.info(f"数量检查: 原始={original_count}, 优化={optimized_count}")
        
        if original_count != optimized_count:
            self.logger.warning(f"字幕数量不匹配: 原始={original_count}, 优化={optimized_count}")
            self.logger.info("详细数量分析:")
            self.logger.info(f"  - 原始字幕ID: {[sub.id for sub in original_subtitles]}")
            self.logger.info(f"  - 优化数据ID: {[item.get('id') for item in optimized_data]}")
            
            # 检查是否有重复ID
            original_id_set = set(sub.id for sub in original_subtitles)
            optimized_id_set = set(item.get('id') for item in optimized_data)
            
            self.logger.info(f"  - 原始ID集合: {sorted(original_id_set)}")
            self.logger.info(f"  - 优化ID集合: {sorted(optimized_id_set)}")
            
            missing_in_optimized = original_id_set - optimized_id_set
            extra_in_optimized = optimized_id_set - original_id_set
            
            if missing_in_optimized:
                self.logger.warning(f"  - 缺失的ID: {sorted(missing_in_optimized)}")
            if extra_in_optimized:
                self.logger.warning(f"  - 额外的ID: {sorted(extra_in_optimized)}")
            
            # 对于数量不匹配的情况，返回特殊的失败结果，以便调用者决定是否进行智能对齐
            return AlignmentResult(
                success=False,
                error=f"字幕数量不匹配: 原始={original_count}, 优化={optimized_count}, 缺失ID: {sorted(missing_in_optimized)}",
                error_code=OptimizationErrorCode.PROCESSING_ERROR,
                warnings=[f"字幕数量不匹配，缺失ID: {sorted(missing_in_optimized)}"]
            )
        
        self.logger.info("对齐输入验证通过")
        return AlignmentResult(success=True)
    
    def _perform_alignment(
        self, 
        original_map: Dict[int, SimpleSubtitleItem], 
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
        return calculate_text_diff(original_text, optimized_text)
    
    def _create_partial_alignment(
        self, 
        original_subtitles: List[SimpleSubtitleItem], 
        optimized_data: List[Dict[str, Any]]
    ) -> AlignmentResult:
        """创建部分对齐结果：处理优化结果少于原始字幕数量的情况"""
        self.logger.info("=== 开始部分对齐 ===")
        
        # 创建原始字幕映射
        original_map = {sub.id: sub for sub in original_subtitles}
        # 创建优化数据映射
        optimized_map = {item['id']: item for item in optimized_data}
        
        aligned_subtitles = []
        warnings = []
        matched_count = 0
        fallback_count = 0
        
        # 按原始字幕顺序处理
        for original_sub in original_subtitles:
            if original_sub.id in optimized_map:
                # 找到对应的优化数据
                optimized_item = optimized_map[original_sub.id]
                optimized_text = optimized_item.get('optimized_text', '')
                
                if not optimized_text:
                    optimized_text = original_sub.text
                    warnings.append(f"ID {original_sub.id} 缺少优化文本，使用原始文本")
                
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
                matched_count += 1
            else:
                # 没有找到对应的优化数据，使用原始文本作为回退
                self.logger.warning(f"ID {original_sub.id} 未在优化数据中找到，使用原始文本作为回退")
                
                diffs = self._calculate_diffs(original_sub.text, original_sub.text)
                
                aligned_item = OptimizedSubtitleItem(
                    id=original_sub.id,
                    original_text=original_sub.text,
                    optimized_text=original_sub.text,
                    diffs=diffs
                )
                
                aligned_subtitles.append(aligned_item)
                fallback_count += 1
        
        self.logger.info(f"部分对齐完成: 匹配={matched_count}, 回退={fallback_count}, 总计={len(aligned_subtitles)}")
        
        if warnings:
            self.logger.warning(f"部分对齐警告: {warnings}")
        
        return AlignmentResult(
            success=True,
            aligned_subtitles=aligned_subtitles,
            warnings=warnings + [f"部分对齐：成功匹配 {matched_count} 项，回退 {fallback_count} 项"]
        )
    
    def _validate_alignment_result(
        self, 
        original_subtitles: List[SimpleSubtitleItem], 
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
    
    def create_fallback_alignment(self, original_subtitles: List[SimpleSubtitleItem]) -> AlignmentResult:
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
    
    def align_texts(self, original_texts: List[str], optimized_texts: List[str]) -> Tuple[List[str], List[str]]:
        """
        智能文本对齐方法
        
        Args:
            original_texts: 原始文本列表
            optimized_texts: 优化文本列表
            
        Returns:
            Tuple[List[str], List[str]]: 对齐后的原始文本和优化文本
        """
        self.logger.info(f"=== 开始智能文本对齐 ===")
        self.logger.info(f"原始文本数量: {len(original_texts)}")
        self.logger.info(f"优化文本数量: {len(optimized_texts)}")
        
        # 如果数量相同，直接返回
        if len(original_texts) == len(optimized_texts):
            self.logger.info("数量相同，直接返回")
            return original_texts, optimized_texts
        
        # 如果优化文本为空，返回原始文本
        if not optimized_texts:
            self.logger.warning("优化文本为空，返回原始文本")
            return original_texts, original_texts
        
        # 如果原始文本为空，返回优化文本
        if not original_texts:
            self.logger.warning("原始文本为空，返回优化文本")
            return optimized_texts, optimized_texts
        
        # 尝试基于文本相似度进行对齐
        try:
            aligned_original, aligned_optimized = self._align_by_similarity(original_texts, optimized_texts)
            self.logger.info(f"相似度对齐完成，对齐后数量: {len(aligned_original)}")
            return aligned_original, aligned_optimized
        except Exception as e:
            self.logger.error(f"相似度对齐失败: {e}")
            # 回退到简单对齐
            return self._simple_align_texts(original_texts, optimized_texts)
    
    def _align_by_similarity(self, original_texts: List[str], optimized_texts: List[str]) -> Tuple[List[str], List[str]]:
        """基于文本相似度进行对齐"""
        self.logger.info("使用相似度算法进行对齐")
        
        # 创建相似度矩阵
        similarity_matrix = []
        for i, orig_text in enumerate(original_texts):
            row = []
            for j, opt_text in enumerate(optimized_texts):
                similarity = SequenceMatcher(None, orig_text, opt_text).ratio()
                row.append(similarity)
                self.logger.debug(f"相似度矩阵[{i}][{j}]: {similarity:.3f} - '{orig_text[:30]}...' vs '{opt_text[:30]}...'")
            similarity_matrix.append(row)
        
        # 使用贪心算法进行最佳匹配
        aligned_original = []
        aligned_optimized = []
        used_original = set()
        used_optimized = set()
        
        # 按相似度从高到低排序
        matches = []
        for i in range(len(original_texts)):
            for j in range(len(optimized_texts)):
                matches.append((similarity_matrix[i][j], i, j))
        
        matches.sort(reverse=True)
        
        # 选择最佳匹配
        for similarity, i, j in matches:
            if similarity > 0.3 and i not in used_original and j not in used_optimized:  # 相似度阈值
                aligned_original.append(original_texts[i])
                aligned_optimized.append(optimized_texts[j])
                used_original.add(i)
                used_optimized.add(j)
                self.logger.info(f"匹配: 原始[{i}] -> 优化[{j}], 相似度: {similarity:.3f}")
        
        # 处理未匹配的原始文本
        for i in range(len(original_texts)):
            if i not in used_original:
                aligned_original.append(original_texts[i])
                aligned_optimized.append(original_texts[i])  # 使用原始文本作为优化文本
                self.logger.warning(f"未匹配的原始文本[{i}]: '{original_texts[i][:30]}...'")
        
        # 处理未匹配的优化文本
        for j in range(len(optimized_texts)):
            if j not in used_optimized:
                # 找到最相似的原始文本位置插入
                if original_texts:
                    best_match_idx = self._find_best_insert_position(optimized_texts[j], original_texts, used_original)
                    if best_match_idx is not None:
                        aligned_original.insert(best_match_idx, original_texts[best_match_idx])
                        aligned_optimized.insert(best_match_idx, optimized_texts[j])
                        self.logger.warning(f"插入额外优化文本在位置{best_match_idx}: '{optimized_texts[j][:30]}...'")
                    else:
                        # 追加到末尾
                        aligned_original.append(original_texts[-1])
                        aligned_optimized.append(optimized_texts[j])
                        self.logger.warning(f"追加额外优化文本: '{optimized_texts[j][:30]}...'")
        
        return aligned_original, aligned_optimized
    
    def _find_best_insert_position(self, text: str, original_texts: List[str], used_original: set) -> Optional[int]:
        """找到最佳插入位置"""
        best_similarity = 0
        best_position = None
        
        for i, orig_text in enumerate(original_texts):
            if i not in used_original:
                similarity = SequenceMatcher(None, text, orig_text).ratio()
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_position = i
        
        return best_position if best_similarity > 0.2 else None
    
    def _simple_align_texts(self, original_texts: List[str], optimized_texts: List[str]) -> Tuple[List[str], List[str]]:
        """简单文本对齐（回退方案）"""
        self.logger.info("使用简单对齐算法")
        
        max_len = max(len(original_texts), len(optimized_texts))
        aligned_original = []
        aligned_optimized = []
        
        for i in range(max_len):
            if i < len(original_texts):
                aligned_original.append(original_texts[i])
            else:
                # 如果原始文本用完，重复最后一个
                aligned_original.append(original_texts[-1] if original_texts else "")
            
            if i < len(optimized_texts):
                aligned_optimized.append(optimized_texts[i])
            else:
                # 如果优化文本用完，使用对应的原始文本
                aligned_optimized.append(original_texts[i] if i < len(original_texts) else "")
        
        return aligned_original, aligned_optimized
    
    def create_intelligent_alignment(self, original_subtitles: List[SimpleSubtitleItem], optimized_data: List[Dict[str, Any]]) -> AlignmentResult:
        """
        创建智能对齐结果
        
        使用新的智能对齐器实现更准确的文本对齐
        """
        self.logger.info(f"=== 开始智能对齐 ===")
        self.logger.info(f"原始字幕数量: {len(original_subtitles)}")
        self.logger.info(f"优化数据数量: {len(optimized_data)}")
        
        try:
            # 使用智能对齐器进行对齐
            aligned_subtitles = self.intelligent_aligner.align_subtitles_intelligently(
                original_subtitles, optimized_data
            )
            
            self.logger.info(f"智能对齐完成，对齐结果数量: {len(aligned_subtitles)}")
            
            return AlignmentResult(
                success=True,
                aligned_subtitles=aligned_subtitles,
                warnings=["使用智能对齐算法"]
            )
            
        except Exception as e:
            self.logger.error(f"智能对齐失败: {e}")
            # 回退到备用对齐
            return self.create_fallback_alignment(original_subtitles)