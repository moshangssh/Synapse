import asyncio
import aiohttp
import json
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import time

from schemas import LLMConfiguration, OptimizationErrorCode

logger = logging.getLogger(__name__)

class LLMProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    CUSTOM = "custom"

@dataclass
class LLMResponse:
    content: str
    model: str
    usage: Dict[str, int]
    latency: float
    success: bool
    error: Optional[str] = None

class LLMClient:
    """LLM API客户端，支持多种提供商"""
    
    def __init__(self, config: LLMConfiguration):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.provider = self._detect_provider(config.endpoint)
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.config.timeout),
            headers=self._get_headers()
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def _detect_provider(self, endpoint: str) -> LLMProvider:
        """检测LLM提供商"""
        if "openai.com" in endpoint or "api.openai.com" in endpoint:
            return LLMProvider.OPENAI
        elif "anthropic.com" in endpoint:
            return LLMProvider.ANTHROPIC
        else:
            return LLMProvider.CUSTOM
    
    def _get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Synapse/1.0.0"
        }
        
        if self.provider == LLMProvider.OPENAI:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        elif self.provider == LLMProvider.ANTHROPIC:
            headers["x-api-key"] = self.config.api_key
            headers["anthropic-version"] = "2023-06-01"
        else:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
            
        return headers
    
    def _build_request_body(self, system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> Dict[str, Any]:
        """构建请求体"""
        if self.provider == LLMProvider.OPENAI:
            return {
                "model": self.config.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": temperature,
                "max_tokens": max_tokens
            }
        elif self.provider == LLMProvider.ANTHROPIC:
            return {
                "model": self.config.model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ]
            }
        else:
            # 自定义提供商，使用OpenAI兼容格式
            return {
                "model": self.config.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": temperature,
                "max_tokens": max_tokens
            }
    
    def _parse_response(self, response_data: Dict[str, Any]) -> LLMResponse:
        """解析响应"""
        if self.provider == LLMProvider.OPENAI:
            content = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            usage = response_data.get("usage", {})
            return LLMResponse(
                content=content,
                model=response_data.get("model", self.config.model),
                usage=usage,
                latency=0.0,
                success=True
            )
        elif self.provider == LLMProvider.ANTHROPIC:
            content = response_data.get("content", [{}])[0].get("text", "")
            usage = response_data.get("usage", {})
            return LLMResponse(
                content=content,
                model=response_data.get("model", self.config.model),
                usage=usage,
                latency=0.0,
                success=True
            )
        else:
            # 自定义提供商，尝试OpenAI兼容格式
            content = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            usage = response_data.get("usage", {})
            return LLMResponse(
                content=content,
                model=response_data.get("model", self.config.model),
                usage=usage,
                latency=0.0,
                success=True
            )
    
    async def _make_request_with_retry(self, url: str, data: Dict[str, Any]) -> LLMResponse:
        """带重试的请求"""
        last_error = None
        
        for attempt in range(self.config.max_retries):
            try:
                start_time = time.time()
                
                async with self.session.post(url, json=data) as response:
                    if response.status == 200:
                        response_data = await response.json()
                        llm_response = self._parse_response(response_data)
                        llm_response.latency = time.time() - start_time
                        return llm_response
                    elif response.status == 429:
                        # 速率限制
                        retry_after = int(response.headers.get("Retry-After", 5))
                        logger.warning(f"速率限制，等待 {retry_after} 秒后重试")
                        await asyncio.sleep(retry_after)
                        continue
                    else:
                        error_text = await response.text()
                        raise Exception(f"HTTP {response.status}: {error_text}")
                        
            except asyncio.TimeoutError:
                last_error = "请求超时"
                logger.warning(f"请求超时 (尝试 {attempt + 1}/{self.config.max_retries})")
            except aiohttp.ClientError as e:
                last_error = f"连接错误: {str(e)}"
                logger.warning(f"连接错误 (尝试 {attempt + 1}/{self.config.max_retries}): {e}")
            except Exception as e:
                last_error = f"请求失败: {str(e)}"
                logger.warning(f"请求失败 (尝试 {attempt + 1}/{self.config.max_retries}): {e}")
            
            if attempt < self.config.max_retries - 1:
                # 指数退避
                wait_time = min(2 ** attempt, 10)
                await asyncio.sleep(wait_time)
        
        # 所有重试都失败了
        return LLMResponse(
            content="",
            model=self.config.model,
            usage={},
            latency=0.0,
            success=False,
            error=last_error or "未知错误"
        )
    
    async def generate_response(self, system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> LLMResponse:
        """生成响应"""
        if not self.session:
            raise RuntimeError("LLMClient未正确初始化，请使用async with语句")
        
        # 构建请求体
        request_body = self._build_request_body(system_prompt, user_prompt, temperature, max_tokens)
        
        # 发送请求
        response = await self._make_request_with_retry(self.config.endpoint, request_body)
        
        if response.success:
            logger.info(f"LLM请求成功，模型: {response.model}，延迟: {response.latency:.2f}s")
        else:
            logger.error(f"LLM请求失败: {response.error}")
        
        return response
    
    async def health_check(self) -> bool:
        """健康检查"""
        if not self.session:
            return False
        
        try:
            # 发送一个简单的健康检查请求
            health_data = self._build_request_body("健康检查", "请回复'OK'", 0.1, 10)
            response = await self._make_request_with_retry(self.config.endpoint, health_data)
            return response.success
        except Exception as e:
            logger.error(f"健康检查失败: {e}")
            return False

class LLMClientManager:
    """LLM客户端管理器"""
    
    def __init__(self):
        self.clients: Dict[str, LLMClient] = {}
        self.default_config: Optional[LLMConfiguration] = None
    
    def set_default_config(self, config: LLMConfiguration):
        """设置默认配置"""
        self.default_config = config
    
    def get_client(self, config: Optional[LLMConfiguration] = None) -> LLMClient:
        """获取LLM客户端"""
        client_config = config or self.default_config
        if not client_config:
            raise ValueError("未配置LLM客户端")
        
        # 生成客户端键
        client_key = f"{client_config.endpoint}_{client_config.model}"
        
        if client_key not in self.clients:
            self.clients[client_key] = LLMClient(client_config)
        
        return self.clients[client_key]
    
    async def close_all(self):
        """关闭所有客户端"""
        for client in self.clients.values():
            if client.session:
                await client.session.close()
        self.clients.clear()

# 全局LLM客户端管理器
llm_manager = LLMClientManager()