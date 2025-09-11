"""
智能字幕对齐器
基于diff-match-patch实现更智能的字幕文本对齐功能
"""
import logging
from typing import List, Tuple, Optional
from diff_match_patch import diff_match_patch
from schemas import SimpleSubtitleItem, OptimizedSubtitleItem, DiffPartModel
from text_utils import calculate_text_diff

logger = logging.getLogger(__name__)


class IntelligentAligner:
    """
    智能字幕对齐器，用于对齐源字幕和优化后的字幕文本
    支持基于相似度的匹配，当目标文本缺少某项时，会使用其上一项进行填充
    """
    
    def __init__(self):
        self.dmp = diff_match_patch()
    
    def align_subtitles_intelligently(
        self, 
        original_subtitles: List[SimpleSubtitleItem], 
        optimized_data: List[dict]
    ) -> List[OptimizedSubtitleItem]:
        """
        智能对齐字幕
        
        Args:
            original_subtitles: 原始字幕列表
            optimized_data: 优化数据列表，包含id和optimized_text字段
            
        Returns:
            对齐后的优化字幕列表
        """
        logger.info(f"=== 开始智能字幕对齐 ===")
        logger.info(f"原始字幕数量: {len(original_subtitles)}")
        logger.info(f"优化数据数量: {len(optimized_data)}")
        
        # 提取文本内容
        original_texts = [sub.text for sub in original_subtitles]
        optimized_texts = [item.get('optimized_text', '') for item in optimized_data]
        
        # 使用智能文本对齐
        aligned_original_texts, aligned_optimized_texts = self.align_texts(original_texts, optimized_texts)
        
        # 检查对齐结果
        if len(aligned_original_texts) != len(aligned_optimized_texts):
            raise ValueError(f"对齐后长度不一致: 原始={len(aligned_original_texts)}, 优化={len(aligned_optimized_texts)}")
        
        # 构建对齐后的字幕项
        aligned_subtitles = []
        
        for i, (orig_text, opt_text) in enumerate(zip(aligned_original_texts, aligned_optimized_texts)):
            # 尝试找到对应的原始字幕ID
            original_id = None
            if i < len(original_subtitles):
                original_id = original_subtitles[i].id
            else:
                # 如果超出原始字幕范围，使用最后一个ID + 索引偏移
                original_id = original_subtitles[-1].id + (i - len(original_subtitles) + 1)
                logger.warning(f"为位置{i}生成新ID: {original_id}")
            
            # 计算差异
            diffs = calculate_text_diff(orig_text, opt_text)
            
            # 创建对齐项
            aligned_item = OptimizedSubtitleItem(
                id=original_id,
                original_text=orig_text,
                optimized_text=opt_text,
                diffs=diffs
            )
            aligned_subtitles.append(aligned_item)
        
        # 按ID排序
        aligned_subtitles.sort(key=lambda x: x.id)
        
        logger.info(f"智能对齐完成，对齐结果数量: {len(aligned_subtitles)}")
        
        return aligned_subtitles
    
    def align_texts(self, source_text: List[str], target_text: List[str]) -> Tuple[List[str], List[str]]:
        """
        Align two texts and return the paired lines.
        
        Args:
            source_text (list): List of lines from the source text.
            target_text (list): List of lines from the target text.
            
        Returns:
            tuple: Two lists containing aligned lines from source and target texts.
        """
        logger.info(f"开始文本对齐，源文本数量: {len(source_text)}, 目标文本数量: {len(target_text)}")
        
        # 如果数量相同，直接返回
        if len(source_text) == len(target_text):
            logger.info("文本数量相同，直接返回")
            return source_text, target_text
        
        # 如果目标文本为空，返回源文本作为目标文本
        if not target_text:
            logger.warning("目标文本为空，返回源文本作为目标文本")
            return source_text, source_text[:]
        
        # 如果源文本为空，返回目标文本作为源文本
        if not source_text:
            logger.warning("源文本为空，返回目标文本作为源文本")
            return target_text[:], target_text
        
        # 使用diff-match-patch进行智能对齐
        return self._align_with_dmp(source_text, target_text)
    
    def _align_with_dmp(self, source_text: List[str], target_text: List[str]) -> Tuple[List[str], List[str]]:
        """
        使用 diff-match-patch 进行智能文本对齐
        
        Args:
            source_text (list): 源文本行列表
            target_text (list): 目标文本行列表
            
        Returns:
            tuple: 包含对齐后的源文本和目标文本的两个列表
        """
        # 将文本列表转换为字符串，用换行符连接
        source_str = "\n".join(source_text)
        target_str = "\n".join(target_text)
        
        # 使用 diff-match-patch 计算差异
        diffs = self.dmp.diff_main(source_str, target_str)
        self.dmp.diff_cleanupSemantic(diffs)
        
        # 重新构建对齐的文本
        aligned_source_lines = []
        aligned_target_lines = []
        
        # 当前在源文本和目标文本中的位置
        source_parts = source_str.split('\n')
        target_parts = target_str.split('\n')
        
        # 使用更简单的方法：直接使用源文本和目标文本进行智能填充
        max_len = max(len(source_text), len(target_text))
        
        # 对齐源文本
        aligned_source = list(source_text)
        while len(aligned_source) < max_len:
            if aligned_source:
                # 使用上一行进行填充
                aligned_source.append(aligned_source[-1])
            else:
                aligned_source.append("")
        
        # 对齐目标文本
        aligned_target = list(target_text)
        while len(aligned_target) < max_len:
            if aligned_target:
                # 使用上一行进行填充
                aligned_target.append(aligned_target[-1])
            else:
                aligned_target.append("")
        
        # 如果长度超过实际需要的长度，则截断
        if len(aligned_source) > max_len:
            aligned_source = aligned_source[:max_len]
        if len(aligned_target) > max_len:
            aligned_target = aligned_target[:max_len]
            
        return aligned_source, aligned_target


# 测试代码
if __name__ == "__main__":
    # 简短示例
    text1 = ["ab", "b", "c", "d", "e", "f", "g", "h", "i"]  # 源文本
    text2 = ["a", "b", "c", "d", "f", "g", "h", "i"]       # 目标文本
    
    # 使用示例
    aligner = IntelligentAligner()
    aligned_source, aligned_target = aligner.align_texts(text1, text2)
    
    print("Aligned Source:", len(aligned_source))
    print("Aligned Target:", len(aligned_target))
    print("Source:", aligned_source)
    print("Target:", aligned_target)
    
    i = 1
    for l1, l2 in zip(aligned_source, aligned_target):
        print(f"行 {i}:")
        print(f"文本1: {l1}")
        print(f"文本2: {l2}")
        # 使用 diff-match-patch 计算相似度
        dmp = diff_match_patch()
        diffs = dmp.diff_main(l1, l2)
        same_chars = sum(len(text) for op, text in diffs if op == 0)
        max_chars = max(len(l1), len(l2))
        similarity = same_chars / max_chars if max_chars > 0 else 1.0
        print(f"相似度: {similarity:.2f}")
        print("----")
        i += 1