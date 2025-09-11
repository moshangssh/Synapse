import re
from typing import List, Dict, Any
from datetime import datetime


class SrtSubtitleEntry:
    """SRT字幕条目类"""
    def __init__(self, id: int, startTimecode: str, endTimecode: str, text: str):
        self.id = id
        self.startTimecode = startTimecode
        self.endTimecode = endTimecode
        self.text = text
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": self.id,
            "startTimecode": self.startTimecode,
            "endTimecode": self.endTimecode,
            "text": self.text
        }


class ImportedSubtitleFile:
    """导入的字幕文件类"""
    def __init__(self, fileName: str, subtitles: List[SrtSubtitleEntry]):
        self.fileName = fileName
        self.subtitles = subtitles
        self.metadata = {
            "importedAt": datetime.now().isoformat(),
            "format": "srt"
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "fileName": self.fileName,
            "subtitles": [subtitle.to_dict() for subtitle in self.subtitles],
            "metadata": self.metadata
        }


def parse_srt_file(content: str, fileName: str = 'imported_file.srt') -> ImportedSubtitleFile:
    """
    解析SRT文件内容
    Args:
        content: SRT文件的文本内容
        fileName: 文件名（可选）
    Returns:
        解析后的字幕文件对象
    """
    # 移除BOM标记（如果存在）
    clean_content = content.replace('\uFEFF', '')
    
    # 按双换行符分割字幕块
    blocks = re.split(r'\n\s*\n', clean_content.strip())
    blocks = [block for block in blocks if block.strip()]
    
    subtitles: List[SrtSubtitleEntry] = []
    
    for block in blocks:
        # 解析每个字幕块
        lines = block.strip().split('\n')
        
        if len(lines) < 2:
            # 不完整的字幕块，跳过
            continue
        
        # 查找时间码行的索引
        time_code_line_index = -1
        text_start_line_index = -1
        
        # 遍历行查找时间码
        for i in range(len(lines)):
            line = lines[i].strip()
            if re.match(r'^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})$', line):
                time_code_line_index = i
                text_start_line_index = i + 1
                break
        
        # 如果没有找到时间码，跳过这个块
        if time_code_line_index == -1:
            continue
        
        # 解析时间码
        time_line = lines[time_code_line_index].strip()
        time_match = re.match(r'^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})$', time_line)
        
        if not time_match:
            # 时间码格式不正确，跳过这个块
            continue
        
        # 提取时间码（将逗号替换为点号以符合SRT标准）
        start_timecode = time_match.group(1).replace(',', '.')
        end_timecode = time_match.group(2).replace(',', '.')
        
        # 剩余的行是字幕文本
        text = '\n'.join(lines[text_start_line_index:])
        
        # 生成ID
        subtitle_id = len(subtitles) + 1
        
        subtitles.append(SrtSubtitleEntry(
            id=subtitle_id,
            startTimecode=start_timecode,
            endTimecode=end_timecode,
            text=text
        ))
    
    # 返回解析后的字幕文件对象
    return ImportedSubtitleFile(fileName, subtitles)


def validate_srt_content(content: str, strict: bool = True) -> Dict[str, Any]:
    """
    验证SRT文件内容是否有效
    Args:
        content: SRT文件的文本内容
        strict: 是否严格模式，如果为True，有任何错误都会返回False；如果为False，只要有有效的字幕块就会返回True
    Returns:
        验证结果字典
    """
    errors: List[str] = []
    valid_blocks = 0
    
    # 检查是否为空
    if not content or content.strip() == '':
        errors.append('文件内容为空')
        return {"isValid": False, "errors": errors}
    
    # 移除BOM标记（如果存在）
    clean_content = content.replace('\uFEFF', '')
    
    # 检查基本的SRT格式特征
    if '-->' not in clean_content:
        errors.append('文件不包含SRT时间码标记 "-->"')
        return {"isValid": False, "errors": errors}
    
    # 按双换行符分割字幕块
    blocks = re.split(r'\n\s*\n', clean_content.strip())
    blocks = [block for block in blocks if block.strip()]
    
    if len(blocks) == 0:
        errors.append('文件不包含有效的字幕块')
        return {"isValid": False, "errors": errors}
    
    # 检查每个块的基本结构
    for i in range(len(blocks)):
        lines = [line.strip() for line in blocks[i].strip().split('\n') if line.strip()]
        
        if len(lines) < 1:
            errors.append(f'字幕块 {i + 1} 结构不完整，至少需要1行')
            continue
        
        # 查找时间码行
        time_line = ''
        has_timecode_format = False
        
        for line in lines:
            trimmed_line = line.strip()
            # 检查是否包含时间码标记
            if '-->' in trimmed_line:
                time_line = trimmed_line
                # 检查是否符合标准SRT时间码格式（包含毫秒）
                if re.match(r'^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}$', trimmed_line):
                    has_timecode_format = True
                    valid_blocks += 1
                break
        
        if not time_line:
            errors.append(f'字幕块 {i + 1} 未找到时间码')
            continue
        
        if not has_timecode_format:
            errors.append(f'字幕块 {i + 1} 时间码格式不正确: "{time_line}"')
    
    # 在严格模式下，任何错误都会导致验证失败
    if strict:
        return {"isValid": len(errors) == 0, "errors": errors}
    else:
        # 在非严格模式下，只要有一个有效的字幕块就认为文件有效
        return {"isValid": valid_blocks > 0, "errors": errors, "validBlocks": valid_blocks}


def is_valid_srt_format(content: str) -> bool:
    """
    检查内容是否为有效的SRT格式
    Args:
        content: 文件内容
    Returns:
        是否为有效的SRT格式
    """
    # 检查是否为空
    if not content or content.strip() == '':
        return False
    
    # 移除BOM标记（如果存在）
    clean_content = content.replace('\uFEFF', '')
    
    # 检查基本的SRT格式特征
    if '-->' not in clean_content:
        return False
    
    # 按双换行符分割字幕块
    blocks = re.split(r'\n\s*\n', clean_content.strip())
    blocks = [block for block in blocks if block.strip()]
    
    if len(blocks) == 0:
        return False
    
    # 检查每个块是否包含有效的时间码
    valid_blocks = 0
    for block in blocks:
        lines = [line.strip() for line in block.strip().split('\n') if line.strip()]
        
        # 查找时间码行
        for line in lines:
            # 检查是否符合标准SRT时间码格式（包含毫秒）
            if re.match(r'^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}$', line.strip()):
                valid_blocks += 1
                break
    
    # 如果至少有一个有效的字幕块，则认为是SRT格式
    return valid_blocks > 0