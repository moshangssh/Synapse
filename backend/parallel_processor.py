# 并行处理优化器的临时实现
# 这个文件包含了优化并行处理的核心逻辑

import asyncio
import time
import json
import logging
from typing import List, Dict, Any, Optional
from functools import lru_cache, wraps
import hashlib

logger = logging.getLogger(__name__)

def split_into_parallel_chunks(batches: List, parallelism_count: int) -> List[List]:
    """将批次分成并行处理块"""
    if parallelism_count <= 0:
        # 无限制并行，返回一个包含所有批次的大块
        return [batches]
    
    parallel_chunks = []
    for i in range(0, len(batches), parallelism_count):
        chunk = batches[i:i + parallelism_count]
        parallel_chunks.append(chunk)
    
    return parallel_chunks

async def process_batches_parallel(batches: List, request, process_batch_func) -> List:
    """并行处理批次"""
    logger.info(f"开始并行处理 {len(batches)} 个批次")
    
    # 根据并行数量分块
    parallelism_count = getattr(request, 'parallelismCount', 3) or 3
    parallel_chunks = split_into_parallel_chunks(batches, parallelism_count)
    
    logger.info(f"将 {len(batches)} 个批次分成 {len(parallel_chunks)} 个并行块")
    
    all_results = []
    
    for chunk_idx, chunk in enumerate(parallel_chunks):
        logger.info(f"处理并行块 {chunk_idx + 1}/{len(parallel_chunks)}，包含 {len(chunk)} 个批次")
        
        # 创建并行任务
        tasks = []
        for batch in chunk:
            task = process_batch_func(
                batch,
                request.reference_info,
                request.model,
                request.temperature,
                request.max_tokens,
                request.apiKey,
                request.apiUrl
            )
            tasks.append(task)
        
        # 并行执行任务，设置return_exceptions=True以捕获异常
        chunk_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理结果
        for i, result in enumerate(chunk_results):
            if isinstance(result, Exception):
                logger.error(f"批次处理失败: {result}")
                # 为失败的批次创建回退结果
                failed_batch = chunk[i]
                # 这里需要创建回退逻辑
                # 暂时跳过处理
                continue
            else:
                all_results.extend(result)
    
    logger.info(f"并行处理完成，总共处理 {len(all_results)} 条结果")
    return all_results