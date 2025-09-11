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
    SimpleSubtitleItem,
    DiffPartModel,
    LLMConfiguration
)
from llm_client import LLMClient, llm_manager, LLMResponse
from config import get_llm_config, get_cache_config, validate_config
from cache_manager import get_cached_optimization, cache_optimization_result, get_cache_stats
from response_parser import parse_optimization_response
from prompt import get_system_prompt, build_user_prompt
from subtitle_aligner import SubtitleAligner

# 创建路由器
router = APIRouter(prefix="/api/v1/optimizer", tags=["optimizer"])

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 支持的模型列表
SUPPORTED_MODELS = [
    "gpt-3.5-turbo",
    "gpt-4",
    "gpt-4-turbo",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1-mini",
    "claude-3-haiku-20240307",
    "claude-3-sonnet-20240229",
    "claude-3-opus-20240229"
]

# 为HTTP请求添加更详细的日志
def log_request_details(request_data: dict, endpoint: str):
    """记录请求详细信息"""
    logger.info(f"=== {endpoint} 请求开始 ===")
    logger.info(f"请求时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"字幕数量: {len(request_data.get('subtitles', []))}")
    logger.info(f"批次大小: {request_data.get('batch_size', 10)}")
    logger.info(f"使用模型: {request_data.get('model', 'gpt-3.5-turbo')}")
    logger.info(f"温度参数: {request_data.get('temperature', 0.7)}")
    logger.info(f"最大令牌数: {request_data.get('max_tokens', 2000)}")
    logger.info(f"参考信息: {'有' if request_data.get('reference_info') else '无'}")
    if request_data.get('reference_info'):
        logger.info(f"参考信息内容: {request_data['reference_info'][:100]}...")

def log_llm_call_details(system_prompt: str, user_prompt: str, model: str, temperature: float, max_tokens: int):
    """记录LLM调用详细信息"""
    logger.info(f"=== LLM API 调用开始 ===")
    logger.info(f"模型: {model}")
    logger.info(f"温度: {temperature}")
    logger.info(f"最大令牌数: {max_tokens}")
    logger.info(f"系统提示词长度: {len(system_prompt)} 字符")
    logger.info(f"用户提示词长度: {len(user_prompt)} 字符")
    logger.debug(f"系统提示词: {system_prompt}")
    logger.debug(f"用户提示词: {user_prompt[:500]}...")

def log_llm_response_details(response: LLMResponse, start_time: float):
    """记录LLM响应详细信息"""
    latency = time.time() - start_time
    logger.info(f"=== LLM API 响应 ===")
    logger.info(f"成功状态: {response.success}")
    logger.info(f"响应延迟: {latency:.2f}秒")
    logger.info(f"响应模型: {response.model}")
    logger.info(f"响应内容长度: {len(response.content)} 字符")
    logger.info(f"令牌使用: {response.usage}")
    if response.error:
        logger.error(f"错误信息: {response.error}")
    
    # 详细记录AI返回的原始内容
    logger.info(f"=== AI返回原始内容 ===")
    if response.content:
        logger.info(f"原始内容长度: {len(response.content)} 字符")
        logger.info(f"原始内容预览: {response.content[:200]}...")
        
        # 记录完整内容到DEBUG级别
        logger.debug(f"AI返回完整内容:\n{response.content}")
        
        # 分析内容结构
        content_lines = response.content.split('\n')
        logger.info(f"内容行数: {len(content_lines)}")
        
        # 检查是否包含JSON格式
        import json
        try:
            # 尝试解析JSON
            if response.content.strip().startswith('[') or response.content.strip().startswith('{'):
                json.loads(response.content)
                logger.info("内容格式: 有效JSON")
            else:
                logger.info("内容格式: 非JSON文本")
        except json.JSONDecodeError:
            logger.info("内容格式: 无效JSON")
        
        # 检查内容特征
        has_numbers = any(char.isdigit() for char in response.content)
        has_quotes = '"' in response.content or "'" in response.content
        has_brackets = '[' in response.content or ']' in response.content or '{' in response.content or '}' in response.content
        
        logger.info(f"内容特征: 包含数字={has_numbers}, 包含引号={has_quotes}, 包含括号={has_brackets}")
        
        # 记录前几行内容用于分析
        for i, line in enumerate(content_lines[:5]):
            logger.info(f"第{i+1}行: {line.strip()}")
        
        if len(content_lines) > 5:
            logger.info(f"... 还有 {len(content_lines) - 5} 行")
    else:
        logger.warning("AI返回内容为空")

def log_batch_processing_details(batch_num: int, total_batches: int, batch_size: int, subtitles_hash: str):
    """记录批次处理详细信息"""
    logger.info(f"=== 批次 {batch_num}/{total_batches} 处理开始 ===")
    logger.info(f"批次大小: {batch_size}")
    logger.info(f"字幕哈希: {subtitles_hash}")
    logger.info(f"处理时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")

def log_cache_operation(operation: str, subtitles_hash: str, reference_hash: str, success: bool = True):
    """记录缓存操作详细信息"""
    status = "成功" if success else "失败"
    logger.info(f"=== 缓存{operation} ===")
    logger.info(f"操作状态: {status}")
    logger.info(f"字幕哈希: {subtitles_hash}")
    logger.info(f"参考哈希: {reference_hash}")
    logger.info(f"操作时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")

# 缓存管理器已移至 cache_manager.py 模块

def generate_cache_key(text: str) -> str:
    """生成缓存键"""
    return hashlib.md5(text.encode('utf-8')).hexdigest()

def split_into_batches(subtitles: List[SimpleSubtitleItem], batch_size: int) -> List[List[SimpleSubtitleItem]]:
    """将字幕列表分成批次"""
    batches = []
    for i in range(0, len(subtitles), batch_size):
        batches.append(subtitles[i:i + batch_size])
    return batches


def build_json_input(subtitles: List[SimpleSubtitleItem]) -> str:
    """构建JSON输入格式"""
    subtitle_data = []
    for sub in subtitles:
        subtitle_data.append({
            "id": sub.id,
            "text": sub.text
        })
    
    return json.dumps(subtitle_data, ensure_ascii=False, indent=2)

async def call_llm_api(system_prompt: str, user_prompt: str, model: str = "gpt-3.5-turbo", temperature: float = 0.7, max_tokens: int = 2000, api_key: str = None, endpoint: str = None) -> LLMResponse:
    """调用LLM API"""
    start_time = time.time()
    
    # 记录LLM调用详细信息
    log_llm_call_details(system_prompt, user_prompt, model, temperature, max_tokens)
    
    # 从配置中获取LLM设置
    llm_config = get_llm_config()
    logger.info(f"LLM配置: endpoint={llm_config['endpoint']}, timeout={llm_config['timeout']}, max_retries={llm_config['max_retries']}")
    
    # 验证配置
    if not validate_config():
        logger.warning("LLM配置验证失败，使用默认配置")
    
    # 使用前端传递的配置（如果有的话），否则使用环境变量配置
    effective_api_key = api_key if api_key else llm_config["api_key"]
    effective_endpoint = endpoint if endpoint else llm_config["endpoint"]
    
    logger.info(f"使用API密钥: {'用户传递的密钥' if api_key else '环境变量密钥'}")
    logger.info(f"使用端点: {effective_endpoint}")
    
    # 创建配置对象
    config = LLMConfiguration(
        api_key=effective_api_key,
        endpoint=effective_endpoint,
        model=model,
        timeout=llm_config["timeout"],
        max_retries=llm_config["max_retries"]
    )
    
    # 设置默认配置
    llm_manager.set_default_config(config)
    
    # 获取客户端
    client = llm_manager.get_client(config)
    logger.info(f"LLM客户端创建成功，提供商: {client.provider}")
    
    try:
        # 创建新的客户端实例，确保正确管理生命周期
        async with LLMClient(config) as client_instance:
            response = await client_instance.generate_response(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # 记录LLM响应详细信息
            log_llm_response_details(response, start_time)
            
            return response
    except Exception as e:
        logger.error(f"LLM API调用失败: {e}")
        logger.error(f"错误类型: {type(e).__name__}")
        logger.error(f"错误详情: {str(e)}")
        return LLMResponse(
            content="",
            model=model,
            usage={},
            latency=0.0,
            success=False,
            error=str(e)
        )

# 差异计算已移至 response_parser.py 模块

async def process_batch(batch: List[SimpleSubtitleItem], reference_info: Optional[str] = None, model: str = "gpt-3.5-turbo", temperature: float = 0.7, max_tokens: int = 2000, api_key: str = None, endpoint: str = None) -> List[OptimizedSubtitleItem]:
    """处理单个批次的字幕"""
    batch_start_time = time.time()
    
    # 生成缓存键
    batch_text = " ".join([sub.text for sub in batch])
    subtitles_hash = generate_cache_key(batch_text)
    reference_hash = generate_cache_key(reference_info or "")
    
    logger.info(f"=== 批次处理开始 ===")
    logger.info(f"批次大小: {len(batch)}")
    logger.info(f"字幕哈希: {subtitles_hash}")
    logger.info(f"参考哈希: {reference_hash}")
    
    # 检查缓存
    cached_result = get_cached_optimization(subtitles_hash, reference_hash)
    if cached_result:
        logger.info(f"缓存命中: {subtitles_hash}")
        log_cache_operation("命中", subtitles_hash, reference_hash, True)
        # 解析缓存结果
        try:
            cached_data = json.loads(cached_result)
            optimized_items = [OptimizedSubtitleItem(**item) for item in cached_data]
            logger.info(f"缓存解析成功，返回 {len(optimized_items)} 条优化字幕")
            return optimized_items
        except Exception as e:
            logger.warning(f"缓存解析失败: {e}")
            log_cache_operation("解析失败", subtitles_hash, reference_hash, False)
    
    logger.info(f"缓存未命中，开始LLM处理")
    
    # 构建提示和输入
    system_prompt = get_system_prompt(reference_info)
    json_input = build_json_input(batch)
    user_prompt = build_user_prompt(json_input)
    
    logger.info(f"提示构建完成，系统提示词长度: {len(system_prompt)}，用户提示词长度: {len(user_prompt)}")
    
    # 调用LLM API
    try:
        response = await call_llm_api(system_prompt, user_prompt, model, temperature, max_tokens, api_key, endpoint)
        
        if not response.success:
            logger.error(f"LLM API调用失败: {response.error}")
            raise HTTPException(status_code=500, detail=f"LLM API调用失败: {response.error}")
        
        logger.info(f"LLM API调用成功，开始解析响应")
        
        # 使用响应解析器解析结果
        optimized_items = parse_optimization_response(response.content, batch)
        logger.info(f"响应解析成功，获得 {len(optimized_items)} 条优化字幕")
        
        # 缓存结果
        cache_optimization_result(subtitles_hash, reference_hash, json.dumps([item.dict() for item in optimized_items]))
        log_cache_operation("存储", subtitles_hash, reference_hash, True)
        
        batch_processing_time = time.time() - batch_start_time
        logger.info(f"批次处理完成，耗时: {batch_processing_time:.2f}秒")
        
        return optimized_items
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批次处理失败: {e}")
        logger.error(f"错误类型: {type(e).__name__}")
        logger.error(f"错误详情: {str(e)}")
        batch_processing_time = time.time() - batch_start_time
        logger.error(f"批次处理失败，耗时: {batch_processing_time:.2f}秒")
        raise HTTPException(status_code=500, detail=f"批次处理失败: {str(e)}")

@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_subtitles(request: OptimizationRequest):
    """优化字幕文本"""
    start_time = time.time()
    
    try:
        # 记录请求详细信息
        log_request_details(request.dict(), "字幕优化")
        
        # 验证输入
        if not request.subtitles:
            logger.error("验证失败: 字幕列表不能为空")
            raise HTTPException(status_code=400, detail="字幕列表不能为空")
        
        logger.info(f"输入验证通过，字幕数量: {len(request.subtitles)}")
        
        # 移除模型验证限制，允许任何模型
        logger.info(f"使用模型: {request.model}")
        
        logger.info(f"模型验证通过: {request.model}")
        
        # 分批处理
        batches = split_into_batches(request.subtitles, request.batch_size)
        logger.info(f"将 {len(request.subtitles)} 条字幕分成 {len(batches)} 个批次")
        
        # 记录批次详细信息
        for i, batch in enumerate(batches):
            logger.info(f"批次 {i+1}: {len(batch)} 条字幕")
        
        # 并行处理批次
        logger.info("开始并行处理批次...")
        tasks = []
        for i, batch in enumerate(batches):
            task = process_batch(
                batch, 
                request.reference_info, 
                request.model,
                request.temperature,
                request.max_tokens,
                request.api_key,  # 添加 API 密钥
                request.endpoint  # 添加 API 端点
            )
            tasks.append(task)
            logger.info(f"批次 {i+1} 任务已创建")
        
        # 等待所有批次完成
        logger.info(f"等待 {len(tasks)} 个批次完成...")
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理结果
        optimized_subtitles = []
        error_count = 0
        
        for i, result in enumerate(batch_results):
            if isinstance(result, Exception):
                logger.error(f"批次 {i+1} 处理异常: {result}")
                logger.error(f"异常类型: {type(result).__name__}")
                logger.error(f"异常详情: {str(result)}")
                error_count += 1
                
                # 为失败的批次创建原始字幕作为备用
                batch_start_idx = i * request.batch_size
                batch_end_idx = min((i + 1) * request.batch_size, len(request.subtitles))
                failed_batch = request.subtitles[batch_start_idx:batch_end_idx]
                
                for sub in failed_batch:
                    aligner = SubtitleAligner()
                    fallback_result = aligner.create_fallback_alignment([sub])
                    optimized_subtitles.extend(fallback_result.aligned_subtitles)
                    
                logger.info(f"为批次 {i+1} 创建了 {len(failed_batch)} 条备用字幕")
            else:
                logger.info(f"批次 {i+1} 处理成功，获得 {len(result)} 条优化字幕")
                optimized_subtitles.extend(result)
        
        logger.info(f"所有批次处理完成，成功: {len(batch_results) - error_count}, 失败: {error_count}")
        
        # 构建响应
        processing_time = time.time() - start_time
        cache_stats = get_cache_stats()
        
        logger.info(f"=== 优化完成 ===")
        logger.info(f"总处理时间: {processing_time:.2f}秒")
        logger.info(f"总字幕数: {len(request.subtitles)}")
        logger.info(f"优化字幕数: {len(optimized_subtitles)}")
        logger.info(f"缓存命中数: {cache_stats['hits']}")
        logger.info(f"缓存命中率: {cache_stats['hit_rate']:.2%}")
        logger.info(f"错误批次数: {error_count}")
        
        metadata = {
            "total_subtitles": len(request.subtitles),
            "batches_processed": len(batches),
            "cache_hits": cache_stats['hits'],
            "cache_hit_rate": cache_stats['hit_rate'],
            "processing_time": processing_time,
            "model_used": request.model,
            "errors_count": error_count
        }
        
        logger.info(f"返回响应，元数据: {metadata}")
        
        return OptimizationResponse(
            data=optimized_subtitles,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"优化请求处理失败: {e}")
        logger.error(f"错误类型: {type(e).__name__}")
        logger.error(f"错误详情: {str(e)}")
        logger.error(f"错误堆栈:", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"优化请求处理失败: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """健康检查端点"""
    logger.info("=== 优化器健康检查 ===")
    logger.info(f"检查时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 检查配置
    try:
        llm_config = get_llm_config()
        logger.info(f"LLM配置状态: {'已配置' if llm_config['api_key'] != 'demo_key' else '使用默认配置'}")
        logger.info(f"LLM端点: {llm_config['endpoint']}")
        logger.info(f"LLM模型: {llm_config['model']}")
    except Exception as e:
        logger.error(f"配置检查失败: {e}")
    
    # 检查缓存
    try:
        cache_stats = get_cache_stats()
        logger.info(f"缓存统计: {cache_stats}")
    except Exception as e:
        logger.error(f"缓存检查失败: {e}")
    
    logger.info("健康检查完成")
    return {"status": "healthy", "service": "optimizer", "timestamp": time.time()}

@router.get("/config")
async def get_config():
    """获取配置信息"""
    logger.info("=== 获取配置信息 ===")
    logger.info(f"请求时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    config_info = {
        "default_batch_size": 10,
        "default_model": "gpt-3.5-turbo",
        "default_temperature": 0.7,
        "default_max_tokens": 2000,
        "supported_models": SUPPORTED_MODELS
    }
    
    logger.info(f"支持的模型数量: {len(SUPPORTED_MODELS)}")
    logger.info(f"默认批次大小: {config_info['default_batch_size']}")
    logger.info(f"默认模型: {config_info['default_model']}")
    
    return config_info


@router.get("/cache/stats")
async def get_cache_statistics():
    """获取缓存统计信息"""
    logger.info("=== 获取缓存统计信息 ===")
    logger.info(f"请求时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        cache_stats = get_cache_stats()
        logger.info(f"缓存统计: {cache_stats}")
        return cache_stats
    except Exception as e:
        logger.error(f"获取缓存统计失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取缓存统计失败: {str(e)}")


@router.delete("/cache/clear")
async def clear_cache():
    """清空缓存"""
    logger.info("=== 清空缓存 ===")
    logger.info(f"请求时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        from cache_manager import clear_optimization_cache
        clear_optimization_cache()
        logger.info("缓存清空成功")
        return {"message": "缓存已清空", "timestamp": time.time()}
    except Exception as e:
        logger.error(f"清空缓存失败: {e}")
        raise HTTPException(status_code=500, detail=f"清空缓存失败: {str(e)}")