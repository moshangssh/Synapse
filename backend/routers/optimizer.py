from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
import asyncio
import time
import logging
from functools import lru_cache
import hashlib
import json

from schemas import (
    OptimizationRequest,
    OptimizationResponse,
    OptimizedSubtitleItem,
    ErrorResponse,
    OptimizationErrorCode,
    SubtitleItem,
    DiffPartModel,
    LLMConfiguration
)
from llm_client import LLMClient, llm_manager, LLMResponse
from config import get_llm_config, get_cache_config, validate_config
from cache_manager import get_cached_optimization, cache_optimization_result, get_cache_stats
from response_parser import parse_optimization_response

# 创建路由器
router = APIRouter(prefix="/api/v1/optimizer", tags=["optimizer"])

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 缓存管理器已移至 cache_manager.py 模块

def generate_cache_key(text: str) -> str:
    """生成缓存键"""
    return hashlib.md5(text.encode('utf-8')).hexdigest()

def split_into_batches(subtitles: List[SubtitleItem], batch_size: int) -> List[List[SubtitleItem]]:
    """将字幕列表分成批次"""
    batches = []
    for i in range(0, len(subtitles), batch_size):
        batches.append(subtitles[i:i + batch_size])
    return batches

def build_system_prompt(reference_info: Optional[str] = None) -> str:
    """构建系统提示"""
    base_prompt = """你是一个专业的字幕优化助手。你的任务是优化字幕文本，使其更加准确、流畅和自然。

优化原则：
1. 保持原意不变
2. 修正语法和拼写错误
3. 改善语言流畅度
4. 确保时间同步性
5. 保持简洁明了

请返回优化后的字幕文本，保持原有的编号格式。"""

    if reference_info:
        base_prompt += f"\n\n参考信息：{reference_info}"

    return base_prompt

def build_json_input(subtitles: List[SubtitleItem]) -> str:
    """构建JSON输入格式"""
    subtitle_data = []
    for sub in subtitles:
        subtitle_data.append({
            "id": sub.id,
            "text": sub.text
        })
    
    return json.dumps(subtitle_data, ensure_ascii=False, indent=2)

async def call_llm_api(system_prompt: str, user_prompt: str, model: str = "gpt-3.5-turbo", temperature: float = 0.7, max_tokens: int = 2000) -> LLMResponse:
    """调用LLM API"""
    # 从配置中获取LLM设置
    llm_config = get_llm_config()
    
    # 验证配置
    if not validate_config():
        logger.warning("LLM配置验证失败，使用默认配置")
    
    # 创建配置对象
    config = LLMConfiguration(
        api_key=llm_config["api_key"],
        endpoint=llm_config["endpoint"],
        model=model,
        timeout=llm_config["timeout"],
        max_retries=llm_config["max_retries"]
    )
    
    # 设置默认配置
    llm_manager.set_default_config(config)
    
    # 获取客户端
    client = llm_manager.get_client(config)
    
    try:
        async with client:
            response = await client.generate_response(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response
    except Exception as e:
        logger.error(f"LLM API调用失败: {e}")
        return LLMResponse(
            content="",
            model=model,
            usage={},
            latency=0.0,
            success=False,
            error=str(e)
        )

# 差异计算已移至 response_parser.py 模块

async def process_batch(batch: List[SubtitleItem], reference_info: Optional[str] = None, model: str = "gpt-3.5-turbo", temperature: float = 0.7, max_tokens: int = 2000) -> List[OptimizedSubtitleItem]:
    """处理单个批次的字幕"""
    # 生成缓存键
    batch_text = " ".join([sub.text for sub in batch])
    subtitles_hash = generate_cache_key(batch_text)
    reference_hash = generate_cache_key(reference_info or "")
    
    # 检查缓存
    cached_result = get_cached_optimization(subtitles_hash, reference_hash)
    if cached_result:
        logger.info(f"缓存命中: {subtitles_hash}")
        # 解析缓存结果
        try:
            cached_data = json.loads(cached_result)
            return [OptimizedSubtitleItem(**item) for item in cached_data]
        except Exception as e:
            logger.warning(f"缓存解析失败: {e}")
    
    # 构建提示和输入
    system_prompt = build_system_prompt(reference_info)
    user_prompt = f"""请优化以下字幕文本：

{build_json_input(batch)}

请返回优化后的字幕文本，保持原有的JSON格式，但将'text'字段改为'optimized_text'。"""
    
    # 调用LLM API
    try:
        response = await call_llm_api(system_prompt, user_prompt, model, temperature, max_tokens)
        
        if not response.success:
            logger.error(f"LLM API调用失败: {response.error}")
            raise HTTPException(status_code=500, detail=f"LLM API调用失败: {response.error}")
        
        # 使用响应解析器解析结果
        optimized_items = parse_optimization_response(response.content, batch)
        
        # 缓存结果
        cache_optimization_result(subtitles_hash, reference_hash, json.dumps([item.dict() for item in optimized_items]))
        
        return optimized_items
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批次处理失败: {e}")
        raise HTTPException(status_code=500, detail=f"批次处理失败: {str(e)}")

@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_subtitles(request: OptimizationRequest):
    """优化字幕文本"""
    start_time = time.time()
    
    try:
        # 验证输入
        if not request.subtitles:
            raise HTTPException(status_code=400, detail="字幕列表不能为空")
        
        # 分批处理
        batches = split_into_batches(request.subtitles, request.batch_size)
        logger.info(f"将 {len(request.subtitles)} 条字幕分成 {len(batches)} 个批次")
        
        # 并行处理批次
        tasks = []
        for batch in batches:
            task = process_batch(
                batch, 
                request.reference_info, 
                request.model,
                request.temperature,
                request.max_tokens
            )
            tasks.append(task)
        
        # 等待所有批次完成
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理结果
        optimized_subtitles = []
        error_count = 0
        
        for result in batch_results:
            if isinstance(result, Exception):
                logger.error(f"批次处理异常: {result}")
                error_count += 1
            else:
                optimized_subtitles.extend(result)
        
        # 构建响应
        processing_time = time.time() - start_time
        cache_stats = get_cache_stats()
        metadata = {
            "total_subtitles": len(request.subtitles),
            "batches_processed": len(batches),
            "cache_hits": cache_stats['hits'],
            "cache_hit_rate": cache_stats['hit_rate'],
            "processing_time": processing_time,
            "model_used": request.model,
            "errors_count": error_count
        }
        
        return OptimizationResponse(
            data=optimized_subtitles,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"优化请求处理失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"优化请求处理失败: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "optimizer"}

@router.get("/config")
async def get_config():
    """获取配置信息"""
    return {
        "default_batch_size": 10,
        "default_model": "gpt-3.5-turbo",
        "default_temperature": 0.7,
        "default_max_tokens": 2000,
        "supported_models": [
            "gpt-3.5-turbo",
            "gpt-4",
            "gpt-4-turbo",
            "claude-3-sonnet",
            "claude-3-opus"
        ]
    }


@router.get("/cache/stats")
async def get_cache_statistics():
    """获取缓存统计信息"""
    return get_cache_stats()


@router.delete("/cache/clear")
async def clear_cache():
    """清空缓存"""
    from cache_manager import clear_optimization_cache
    clear_optimization_cache()
    return {"message": "缓存已清空"}