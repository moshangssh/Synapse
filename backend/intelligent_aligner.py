"""
智能字幕对齐器
基于difflib实现更智能的字幕文本对齐功能
"""
import difflib
import logging
from typing import List, Tuple, Optional
from schemas import SimpleSubtitleItem, OptimizedSubtitleItem, DiffPartModel
from text_utils import calculate_text_diff

logger = logging.getLogger(__name__)


class IntelligentAligner:
    """
    智能字幕对齐器，用于对齐源字幕和优化后的字幕文本
    支持基于相似度的匹配，当目标文本缺少某项时，会使用其上一项进行填充
    """
    
    def __init__(self):
        self.line_numbers = [0, 0]
    
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
        
        # 使用difflib进行对齐
        diff_iterator = difflib.ndiff(source_text, target_text)
        return self._pair_lines(diff_iterator)
    
    def _pair_lines(self, diff_iterator) -> Tuple[List[str], List[str]]:
        """
        Pair lines from the diff iterator.
        
        Args:
            diff_iterator: Iterator from difflib.ndiff()
            
        Returns:
            tuple: Two lists containing aligned lines from source and target texts.
        """
        source_lines = []
        target_lines = []
        flag = 0
        
        for source_line, target_line, _ in self._line_iterator(diff_iterator):
            if source_line is not None:
                if source_line[1] == "\n":
                    flag += 1
                    continue
                source_lines.append(source_line[1])
            if target_line is not None:
                if flag > 0:
                    flag -= 1
                    continue
                target_lines.append(target_line[1])
        
        # 处理缺失的行，使用上一行进行填充
        for i in range(1, len(target_lines)):
            if target_lines[i] == "\n":
                target_lines[i] = target_lines[i - 1]
        
        # 如果目标行数少于源行数，使用源行进行填充
        while len(target_lines) < len(source_lines):
            target_lines.append(source_lines[len(target_lines)])
        
        # 如果源行数少于目标行数，使用目标行进行填充
        while len(source_lines) < len(target_lines):
            source_lines.append(target_lines[len(source_lines)])
        
        return source_lines, target_lines
    
    def _line_iterator(self, diff_iterator):
        """
        Iterate through diff lines and yield paired lines.
        
        Args:
            diff_iterator: Iterator from difflib.ndiff()
            
        Yields:
            tuple: (source_line, target_line, has_diff)
        """
        lines = []
        blank_lines_pending = 0
        blank_lines_to_yield = 0
        
        while True:
            while len(lines) < 4:
                try:
                    lines.append(next(diff_iterator))
                except StopIteration:
                    lines.append("X")
            
            diff_type = "".join([line[0] if line != "X" else "X" for line in lines])
            
            if diff_type.startswith("X"):
                blank_lines_to_yield = blank_lines_pending
            elif diff_type.startswith("-?+?"):
                yield (
                    self._format_line(lines, "?", 0),
                    self._format_line(lines, "?", 1),
                    True,
                )
                continue
            elif diff_type.startswith("--++"):
                blank_lines_pending -= 1
                yield self._format_line(lines, "-", 0), None, True
                continue
            elif diff_type.startswith(("--?+", "--+", "- ")):
                source_line, target_line = self._format_line(lines, "-", 0), None
                blank_lines_to_yield, blank_lines_pending = blank_lines_pending - 1, 0
            elif diff_type.startswith("-+?"):
                yield (
                    self._format_line(lines, None, 0),
                    self._format_line(lines, "?", 1),
                    True,
                )
                continue
            elif diff_type.startswith("-?+"):
                yield (
                    self._format_line(lines, "?", 0),
                    self._format_line(lines, None, 1),
                    True,
                )
                continue
            elif diff_type.startswith("-"):
                blank_lines_pending -= 1
                yield self._format_line(lines, "-", 0), None, True
                continue
            elif diff_type.startswith("+--"):
                blank_lines_pending += 1
                yield None, self._format_line(lines, "+", 1), True
                continue
            elif diff_type.startswith(("+ ", "+-")):
                source_line, target_line = None, self._format_line(lines, "+", 1)
                blank_lines_to_yield, blank_lines_pending = blank_lines_pending + 1, 0
            elif diff_type.startswith("+"):
                blank_lines_pending += 1
                yield None, self._format_line(lines, "+", 1), True
                continue
            elif diff_type.startswith(" "):
                yield (
                    self._format_line(lines[:], None, 0),
                    self._format_line(lines, None, 1),
                    False,
                )
                continue
            
            while blank_lines_to_yield < 0:
                blank_lines_to_yield += 1
                yield None, ("", "\n"), True
            while blank_lines_to_yield > 0:
                blank_lines_to_yield -= 1
                yield ("", "\n"), None, True
            
            if diff_type.startswith("X"):
                return
            else:
                yield source_line, target_line, True
    
    def _format_line(self, lines, format_key, side):
        """
        Format a line with the appropriate markup.
        
        Args:
            lines (list): List of lines to process.
            format_key (str): Formatting key ('?', '-', '+', or None).
            side (int): 0 for source, 1 for target.
            
        Returns:
            tuple: (line_number, formatted_text)
        """
        self.line_numbers[side] += 1
        if format_key is None:
            line = lines.pop(0)
            if line == "X":
                return self.line_numbers[side], ""
            return self.line_numbers[side], line[2:] if len(line) > 2 else ""
        if format_key == "?":
            text = lines.pop(0)
            if len(lines) > 0:
                lines.pop(0)  # Skip markers line
            text = text[2:] if len(text) > 2 else ""
        else:
            line = lines.pop(0)
            if line == "X":
                text = ""
            else:
                text = line[2:] if len(line) > 2 else ""
            if not text:
                text = ""
        return self.line_numbers[side], text


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
        print(difflib.SequenceMatcher(None, l1, l2).ratio())
        print("----")
        i += 1