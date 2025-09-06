import re
import json
import os
import logging
from typing import List, Dict, Any
from diff_match_patch import diff_match_patch
from schemas import SubtitleItem, DiffPartModel

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_filler_words_config() -> Dict[str, Any]:
    """
    加载口水词配置文件
    """
    try:
        # 配置文件路径（相对于后端根目录）
        config_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'synapse', 'public', 'filler_words.json')
        
        logger.info(f"尝试加载配置文件: {config_path}")
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        logger.info(f"成功加载配置文件，口水词数量: {len(config.get('words', []))}")
        return config
    except FileNotFoundError:
        logger.warning("配置文件未找到，使用默认配置")
        # 如果配置文件不存在，返回默认配置
        default_config = {
            "words": ["嗯", "啊", "哦", "呢", "吧", "啦"],
            "preserved_punctuation": ["《", "》", "“", "”"]
        }
        logger.info(f"使用默认配置，口水词数量: {len(default_config['words'])}")
        return default_config
    except json.JSONDecodeError as e:
        logger.error(f"配置文件格式错误: {e}")
        # 如果配置文件格式错误，返回默认配置
        default_config = {
            "words": ["嗯", "啊", "哦", "呢", "吧", "啦"],
            "preserved_punctuation": ["《", "》", "“", "”"]
        }
        logger.info("使用默认配置")
        return default_config

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
    logger.debug(f"处理文本: '{text}'")
    logger.debug(f"口水词列表: {filler_words}")
    logger.debug(f"是否移除标点符号: {remove_punctuation}")
    
    if preserved_punctuation is None:
        preserved_punctuation = []
    
    logger.debug(f"保留的标点符号: {preserved_punctuation}")
    
    # 移除口水词
    result_text = text
    removed_words = []
    for word in filler_words:
        # 使用正则表达式匹配并移除口水词，考虑前后可能有空格
        # 修改模式以更精确地处理空格
        pattern = r'\s*' + re.escape(word) + r'\s*'
        matches = re.findall(pattern, result_text)
        if matches:
            removed_words.extend([word] * len(matches))
        result_text = re.sub(pattern, '', result_text)
    
    logger.debug(f"移除的口水词: {removed_words}")
    
    # 移除标点符号（如果需要）
    if remove_punctuation:
        # 构建要移除的标点符号集合
        all_punctuation = '，。、；：？！""''（）【】《》<>…—'
        
        # 从要移除的标点符号中排除保留的标点符号
        punctuation_to_remove = ''.join([p for p in all_punctuation if p not in preserved_punctuation])
        logger.debug(f"要移除的标点符号: {punctuation_to_remove}")
        
        # 移除标点符号
        removed_punctuation = []
        for punc in punctuation_to_remove:
            if punc in result_text:
                removed_punctuation.append(punc)
            result_text = result_text.replace(punc, '')
        
        logger.debug(f"移除的标点符号: {removed_punctuation}")
    
    # 移除多余的空格并清理文本
    original_length = len(result_text)
    result_text = re.sub(r'\s+', ' ', result_text).strip()
    cleaned_length = len(result_text)
    
    logger.info(f"文本处理完成，原始长度: {len(text)}, 处理后长度: {cleaned_length}")
    
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
    logger.info(f"开始处理 {len(subtitles)} 条字幕，移除标点符号: {remove_punctuation}")
    
    # 加载配置
    config = load_filler_words_config()
    filler_words = config.get('words', [])
    preserved_punctuation = config.get('preserved_punctuation', [])
    
    logger.info(f"加载配置完成，口水词数量: {len(filler_words)}")
    
    processed_subtitles = []
    changed_count = 0
    
    for i, subtitle in enumerate(subtitles):
        # 处理文本
        processed_text = remove_filler_words_from_text(
            subtitle.text, 
            filler_words, 
            remove_punctuation, 
            preserved_punctuation
        )
        
        # 检查文本是否有变化
        diffs = calculate_text_diff(subtitle.text, processed_text)
        if processed_text != subtitle.text:
            changed_count += 1
            logger.debug(f"字幕 {subtitle.id} 文本发生变化: '{subtitle.text}' -> '{processed_text}'")
        
        # 创建新的字幕对象（保持其他字段不变）
        processed_subtitle = SubtitleItem(
            id=subtitle.id,
            startTimecode=subtitle.startTimecode,
            endTimecode=subtitle.endTimecode,
            text=processed_text,
            diffs=diffs,
        )
        
        processed_subtitles.append(processed_subtitle)
    
    logger.info(f"处理完成，共 {len(subtitles)} 条字幕，其中 {changed_count} 条发生了变化")
    
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
            diffs = calculate_text_diff(subtitle.text, new_text)
            modified_subtitles.append({
                "id": subtitle.id,
                "text": new_text,
                "diffs": [d.model_dump() for d in diffs] # 序列化DiffPartModel
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