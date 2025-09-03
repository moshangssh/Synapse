import re
import json
import os
from typing import List, Dict, Any
from diff_match_patch import diff_match_patch
from schemas import SubtitleItem, DiffPartModel

def load_filler_words_config() -> Dict[str, Any]:
    """
    加载口水词配置文件
    """
    try:
        # 配置文件路径（相对于后端根目录）
        config_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'synapse', 'public', 'filler_words.json')
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        return config
    except FileNotFoundError:
        # 如果配置文件不存在，返回默认配置
        return {
            "words": ["嗯", "啊", "哦", "呢", "吧", "啦"],
            "preserved_punctuation": ["《", "》", "“", "”"]
        }
    except json.JSONDecodeError:
        # 如果配置文件格式错误，返回默认配置
        return {
            "words": ["嗯", "啊", "哦", "呢", "吧", "啦"],
            "preserved_punctuation": ["《", "》", "“", "”"]
        }

def remove_filler_words_from_text(text: str, filler_words: List[str], remove_punctuation: bool = False, preserved_punctuation: List[str] = None) -> str:
    """
    从文本中移除口水词和标点符号
    
    Args:
        text: 原始文本
        filler_words: 口水词列表
        remove_punctuation: 是否移除标点符号
        preserved_punctuation: 保留的标点符号列表
    
    Returns:
        处理后的文本
    """
    if preserved_punctuation is None:
        preserved_punctuation = []
    
    # 移除口水词
    result_text = text
    for word in filler_words:
        # 使用正则表达式匹配并移除口水词，考虑前后可能有空格
        pattern = r'\s*' + re.escape(word) + r'\s*'
        result_text = re.sub(pattern, ' ', result_text)
    
    # 移除标点符号（如果需要）
    if remove_punctuation:
        # 构建要移除的标点符号集合
        all_punctuation = '，。、；：？！""''（）【】《》<>…—'
        
        # 从要移除的标点符号中排除保留的标点符号
        punctuation_to_remove = ''.join([p for p in all_punctuation if p not in preserved_punctuation])
        
        # 移除标点符号
        for punc in punctuation_to_remove:
            result_text = result_text.replace(punc, '')
    
    # 移除多余的空格
    result_text = re.sub(r'\s+', ' ', result_text).strip()
    
    return result_text

def process_subtitles_for_filler_words(subtitles: List[SubtitleItem], remove_punctuation: bool = False) -> List[SubtitleItem]:
    """
    处理字幕列表，移除口水词
    
    Args:
        subtitles: 字幕列表
        remove_punctuation: 是否移除标点符号
    
    Returns:
        处理后的字幕列表
    """
    # 加载配置
    config = load_filler_words_config()
    filler_words = config.get('words', [])
    preserved_punctuation = config.get('preserved_punctuation', [])
    
    processed_subtitles = []
    
    for subtitle in subtitles:
        # 处理文本
        processed_text = remove_filler_words_from_text(
            subtitle.text, 
            filler_words, 
            remove_punctuation, 
            preserved_punctuation
        )
        
        # 创建新的字幕对象（保持其他字段不变）
        processed_subtitle = SubtitleItem(
            id=subtitle.id,
            startTimecode=subtitle.startTimecode,
            endTimecode=subtitle.endTimecode,
            text=processed_text
        )
        
        processed_subtitles.append(processed_subtitle)
    
    return processed_subtitles

def replace_text_in_subtitles(subtitles: List[SubtitleItem], search_query: str, replace_query: str) -> List[SubtitleItem]:
    """
    在字幕列表中执行查找替换操作
    
    Args:
        subtitles: 字幕列表
        search_query: 搜索文本（不区分大小写）
        replace_query: 替换文本
    
    Returns:
        只包含被修改字幕的列表（仅包含id和text字段）
    
    Raises:
        ValueError: 如果search_query为空
    """
    if not search_query or not search_query.strip():
        raise ValueError("搜索查询不能为空")
    
    # 转义搜索查询中的正则表达式特殊字符
    escaped_search_query = re.escape(search_query)
    
    # 构建不区分大小写的正则表达式
    pattern = re.compile(escaped_search_query, re.IGNORECASE)
    
    modified_subtitles = []
    
    for subtitle in subtitles:
        # 执行替换操作
        new_text = pattern.sub(replace_query, subtitle.text)
        
        # 只有在文本被修改时才添加到结果中
        if new_text != subtitle.text:
            modified_subtitles.append({
                "id": subtitle.id,
                "text": new_text
            })
    
    return modified_subtitles

def calculate_text_diff(original_text: str, new_text: str) -> List[DiffPartModel]:
    """
    计算两个文本之间的差异
    
    Args:
        original_text: 原始文本
        new_text: 新文本
    
    Returns:
        差异部分列表，每个部分包含类型和值
    """
    # 特殊处理：两个空字符串
    if original_text == "" and new_text == "":
        return [DiffPartModel(type="normal", value="")]
    
    dmp = diff_match_patch()
    
    # 计算差异
    diff = dmp.diff_main(original_text, new_text)
    
    # 清理差异使其更易读
    dmp.diff_cleanupSemantic(diff)
    
    # 转换为我们的DiffPartModel格式
    result = []
    for operation, text in diff:
        if operation == 1:  # 新增文本
            result.append(DiffPartModel(type="added", value=text))
        elif operation == -1:  # 删除文本
            result.append(DiffPartModel(type="removed", value=text))
        else:  # operation == 0, 无变化的文本
            result.append(DiffPartModel(type="normal", value=text))
    
    return result