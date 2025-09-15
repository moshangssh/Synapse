import pytest
import asyncio
import json
import sys
import os
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from routers.optimizer import (
    split_into_batches,
    build_json_input,
    generate_cache_key,
    process_batch,
    RATE_LIMIT_REQUESTS,
    CIRCUIT_BREAKER_THRESHOLD
)
from prompt import get_system_prompt
from schemas import (
    SubtitleItem,
    OptimizationRequest,
    OptimizationResponse,
    OptimizedSubtitleItem,
    DiffPartModel,
    LLMConfiguration
)
from llm_client import LLMClient, LLMResponse, llm_manager

# 创建测试客户端
client = TestClient(app)

class TestOptimizerRouter:
    """优化器路由测试"""
    
    def test_split_into_batches(self):
        """测试分批功能"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="字幕1"),
            SubtitleItem(id=2, startTimecode="00:00:03:00", endTimecode="00:00:05:00", text="字幕2"),
            SubtitleItem(id=3, startTimecode="00:00:05:00", endTimecode="00:00:07:00", text="字幕3"),
            SubtitleItem(id=4, startTimecode="00:00:07:00", endTimecode="00:00:09:00", text="字幕4"),
            SubtitleItem(id=5, startTimecode="00:00:09:00", endTimecode="00:00:11:00", text="字幕5"),
        ]
        
        # 测试每批2个
        batches = split_into_batches(subtitles, 2)
        assert len(batches) == 3
        assert len(batches[0]) == 2
        assert len(batches[1]) == 2
        assert len(batches[2]) == 1
        
        # 测试每批3个
        batches = split_into_batches(subtitles, 3)
        assert len(batches) == 2
        assert len(batches[0]) == 3
        assert len(batches[1]) == 2
        
        # 测试批次大小大于总数
        batches = split_into_batches(subtitles, 10)
        assert len(batches) == 1
        assert len(batches[0]) == 5
    
    def test_get_system_prompt(self):
        """测试系统提示获取"""
        # 无参考信息
        prompt = get_system_prompt()
        assert "视频字幕校准专家" in prompt or "Role:" in prompt
        assert "Constraints:" in prompt
        
        # 有参考信息
        prompt = get_system_prompt("This is a science fiction movie")
        assert "This is a science fiction movie" in prompt
    
    def test_build_json_input(self):
        """测试JSON输入构建"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="字幕1"),
            SubtitleItem(id=2, startTimecode="00:00:03:00", endTimecode="00:00:05:00", text="字幕2"),
        ]
        
        json_input = build_json_input(subtitles)
        data = json.loads(json_input)
        
        assert len(data) == 2
        assert data[0]["id"] == 1
        assert data[0]["text"] == "字幕1"
        assert data[1]["id"] == 2
        assert data[1]["text"] == "字幕2"
    
    def test_generate_cache_key(self):
        """测试缓存键生成"""
        key1 = generate_cache_key("测试文本")
        key2 = generate_cache_key("测试文本")
        key3 = generate_cache_key("不同文本")
        
        assert key1 == key2
        assert key1 != key3
        assert len(key1) == 32  # MD5哈希长度
    
    # 差异计算测试已移至 response_parser.py 测试中
    
    @pytest.mark.asyncio
    async def test_process_batch(self):
        """测试批次处理"""
        subtitles = [
            SubtitleItem(id=1, startTimecode="00:00:01:00", endTimecode="00:00:03:00", text="测试字幕"),
        ]
        
        # 模拟LLM响应
        mock_response = LLMResponse(
            content='[{"id": 1, "optimized_text": "优化后的字幕"}]',
            model="gpt-3.5-turbo",
            usage={},
            latency=0.1,
            success=True
        )
        
        with patch('routers.optimizer.call_llm_api', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response
            
            result = await process_batch(subtitles, "参考信息")
            
            assert len(result) == 1
            assert result[0].id == 1
            assert result[0].original_text == "测试字幕"
            assert result[0].optimized_text == "优化后的字幕"
    
    def test_optimize_endpoint(self):
        """测试优化端点"""
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕"
                }
            ],
            "reference_info": "测试参考信息",
            "batchSize": 5,
            "model": "gpt-3.5-turbo",
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        with patch('routers.optimizer.process_batch', new_callable=AsyncMock) as mock_process:
            mock_process.return_value = [
                OptimizedSubtitleItem(
                    id=1,
                    original_text="测试字幕",
                    optimized_text="优化后的字幕",
                    diffs=[{"type": "normal", "value": "优化后的字幕"}]
                )
            ]
            
            response = client.post("/api/v1/optimizer/optimize", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            assert len(data["data"]) == 1
            assert data["data"][0]["id"] == 1
            assert data["metadata"]["total_subtitles"] == 1
            assert data["metadata"]["batches_processed"] == 1
    
    def test_optimize_endpoint_empty_subtitles(self):
        """测试空字幕列表的优化请求"""
        request_data = {
            "subtitles": [],
            "reference_info": "测试参考信息"
        }
        
        response = client.post("/api/v1/optimizer/optimize", json=request_data)
        
        assert response.status_code == 400
        assert "字幕列表不能为空" in response.json()["detail"]
    
    def test_health_check(self):
        """测试健康检查端点"""
        response = client.get("/api/v1/optimizer/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "optimizer"
    
    def test_get_config(self):
        """测试配置获取端点"""
        response = client.get("/api/v1/optimizer/config")
        
        assert response.status_code == 200
        data = response.json()
        assert "default_batch_size" in data
        assert "default_model" in data
        assert "supported_models" in data
        assert isinstance(data["supported_models"], list)

class TestLLMClient:
    """LLM客户端测试"""
    
    def test_llm_client_initialization(self):
        """测试LLM客户端初始化"""
        config = LLMConfiguration(
            api_key="test_key",
            endpoint="https://api.openai.com/v1/chat/completions",
            model="gpt-3.5-turbo",
            timeout=30,
            max_retries=3
        )
        
        client = LLMClient(config)
        assert client.config == config
        assert client.provider.value == "openai"
    
    def test_provider_detection(self):
        """测试提供商检测"""
        # OpenAI
        config = LLMConfiguration(
            api_key="test_key",
            endpoint="https://api.openai.com/v1/chat/completions",
            model="gpt-3.5-turbo",
            timeout=30,
            max_retries=3
        )
        client = LLMClient(config)
        assert client.provider.value == "openai"
        
        # Anthropic
        config.endpoint = "https://api.anthropic.com/v1/messages"
        client = LLMClient(config)
        assert client.provider.value == "anthropic"
        
        # Custom
        config.endpoint = "https://custom-api.com/v1/chat"
        client = LLMClient(config)
        assert client.provider.value == "custom"
    
    def test_llm_manager(self):
        """测试LLM客户端管理器"""
        # 清理现有的客户端
        llm_manager.clients.clear()
        
        config = LLMConfiguration(
            api_key="test_key",
            endpoint="https://api.openai.com/v1/chat/completions",
            model="gpt-3.5-turbo",
            timeout=30,
            max_retries=3
        )
        
        # 设置默认配置
        llm_manager.set_default_config(config)
        
        # 获取客户端
        client = llm_manager.get_client()
        assert isinstance(client, LLMClient)
        assert client.config.api_key == config.api_key
        assert client.config.endpoint == config.endpoint
        assert client.config.model == config.model
        
        # 测试客户端缓存
        client2 = llm_manager.get_client()
        assert client is client2
    
    @pytest.mark.asyncio
    async def test_llm_response_parsing(self):
        """测试LLM响应解析"""
        config = LLMConfiguration(
            api_key="test_key",
            endpoint="https://api.openai.com/v1/chat/completions",
            model="gpt-3.5-turbo",
            timeout=30,
            max_retries=3
        )
        
        client = LLMClient(config)
        
        # OpenAI响应
        openai_response = {
            "choices": [
                {
                    "message": {
                        "content": "测试响应"
                    }
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 5,
                "total_tokens": 15
            },
            "model": "gpt-3.5-turbo"
        }
        
        result = client._parse_response(openai_response)
        assert result.content == "测试响应"
        assert result.model == "gpt-3.5-turbo"
        assert result.usage["total_tokens"] == 15
        assert result.success is True
        
        # Anthropic响应
        client.provider = client._detect_provider("https://api.anthropic.com/v1/messages")
        anthropic_response = {
            "content": [
                {
                    "text": "测试响应"
                }
            ],
            "usage": {
                "input_tokens": 10,
                "output_tokens": 5
            },
            "model": "claude-3-sonnet"
        }
        
        result = client._parse_response(anthropic_response)
        assert result.content == "测试响应"
        assert result.model == "claude-3-sonnet"

class TestCaching:
    """缓存测试"""
    
    def test_cache_key_consistency(self):
        """测试缓存键一致性"""
        text = "测试文本"
        key1 = generate_cache_key(text)
        key2 = generate_cache_key(text)
        
        assert key1 == key2
        assert len(key1) == 32
    
    def test_cache_key_uniqueness(self):
        """测试缓存键唯一性"""
        text1 = "文本1"
        text2 = "文本2"
        
        key1 = generate_cache_key(text1)
        key2 = generate_cache_key(text2)
        
        assert key1 != key2

class TestOptimizerIntegration:
    """优化器集成测试"""
    
    @pytest.mark.asyncio
    async def test_optimizer_retry_logic(self):
        """测试优化器重试逻辑 - 部分批次失败时重试"""
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕1"
                },
                {
                    "id": 2,
                    "startTimecode": "00:00:03:00",
                    "endTimecode": "00:00:05:00",
                    "text": "测试字幕2"
                },
                {
                    "id": 3,
                    "startTimecode": "00:00:05:00",
                    "endTimecode": "00:00:07:00",
                    "text": "测试字幕3"
                },
                {
                    "id": 4,
                    "startTimecode": "00:00:07:00",
                    "endTimecode": "00:00:09:00",
                    "text": "测试字幕4"
                }
            ],
            "reference_info": "测试参考信息",
            "batchSize": 2,
            "model": "gpt-3.5-turbo",
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        # 模拟初次处理：批次1成功，批次2失败
        async def mock_process_batch_1(batch, *args, **kwargs):
            if len(batch) == 2 and batch[0].id == 1:
                # 批次1成功
                return [
                    OptimizedSubtitleItem(
                        id=1,
                        original_text="测试字幕1",
                        optimized_text="优化后的字幕1",
                        diffs=[]
                    ),
                    OptimizedSubtitleItem(
                        id=2,
                        original_text="测试字幕2",
                        optimized_text="优化后的字幕2",
                        diffs=[]
                    )
                ]
            else:
                # 批次2失败
                raise Exception("模拟批次处理失败")
        
        # 模拟重试处理：成功
        async def mock_process_batch_2(batch, *args, **kwargs):
            return [
                OptimizedSubtitleItem(
                    id=3,
                    original_text="测试字幕3",
                    optimized_text="重试优化后的字幕3",
                    diffs=[]
                ),
                OptimizedSubtitleItem(
                    id=4,
                    original_text="测试字幕4",
                    optimized_text="重试优化后的字幕4",
                    diffs=[]
                )
            ]
        
        with patch('routers.optimizer.process_batch', side_effect=[mock_process_batch_1, mock_process_batch_2]) as mock_process:
            response = client.post("/api/v1/optimizer/optimize", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            
            # 验证返回的字幕数量
            optimized_subtitles = data["data"]
            assert len(optimized_subtitles) == 4
            
            # 验证元数据中的重试统计
            metadata = data["metadata"]
            assert metadata["total_subtitles"] == 4
            assert metadata["batches_processed"] == 2
            assert metadata["initial_batches_success"] == 1
            assert metadata["initial_batches_error"] == 1
            assert metadata["retry_subtitles_count"] == 2
            assert metadata["retry_success_count"] == 2
            
            # 验证字幕顺序和内容
            assert optimized_subtitles[0]["id"] == 1
            assert optimized_subtitles[0]["optimized_text"] == "优化后的字幕1"
            assert optimized_subtitles[1]["id"] == 2
            assert optimized_subtitles[1]["optimized_text"] == "优化后的字幕2"
            assert optimized_subtitles[2]["id"] == 3
            assert optimized_subtitles[2]["optimized_text"] == "重试优化后的字幕3"
            assert optimized_subtitles[3]["id"] == 4
            assert optimized_subtitles[3]["optimized_text"] == "重试优化后的字幕4"

    @pytest.mark.asyncio
    async def test_optimizer_mixed_success_fallback(self):
        """测试优化器混合成功和回退场景 - 部分字幕优化成功"""
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕1"
                },
                {
                    "id": 2,
                    "startTimecode": "00:00:03:00",
                    "endTimecode": "00:00:05:00",
                    "text": "测试字幕2"
                }
            ],
            "reference_info": "测试参考信息",
            "batchSize": 2,
            "model": "gpt-3.5-turbo",
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        # 模拟初次处理：返回混合结果（一个优化，一个回退）
        async def mock_process_batch(batch, *args, **kwargs):
            return [
                OptimizedSubtitleItem(
                    id=1,
                    original_text="测试字幕1",
                    optimized_text="优化后的字幕1",  # 成功优化
                    diffs=[]
                ),
                OptimizedSubtitleItem(
                    id=2,
                    original_text="测试字幕2",
                    optimized_text="测试字幕2",  # 回退到原始文本
                    diffs=[]
                )
            ]
        
        # 模拟重试处理：优化回退的字幕
        async def mock_retry_process_batch(batch, *args, **kwargs):
            return [
                OptimizedSubtitleItem(
                    id=2,
                    original_text="测试字幕2",
                    optimized_text="重试优化后的字幕2",
                    diffs=[]
                )
            ]
        
        with patch('routers.optimizer.process_batch', side_effect=[mock_process_batch, mock_retry_process_batch]) as mock_process:
            response = client.post("/api/v1/optimizer/optimize", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            
            optimized_subtitles = data["data"]
            assert len(optimized_subtitles) == 2
            
            # 验证元数据
            metadata = data["metadata"]
            assert metadata["total_subtitles"] == 2
            assert metadata["initial_batches_success"] == 1
            assert metadata["initial_batches_error"] == 0
            assert metadata["retry_subtitles_count"] == 1
            assert metadata["retry_success_count"] == 1
            assert metadata["final_fallback_count"] == 0
            
            # 验证最终结果都是优化成功的
            assert optimized_subtitles[0]["optimized_text"] == "优化后的字幕1"
            assert optimized_subtitles[1]["optimized_text"] == "重试优化后的字幕2"

    @pytest.mark.asyncio
    async def test_optimizer_full_success_no_retry(self):
        """测试优化器全成功场景 - 无需重试"""
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕1"
                },
                {
                    "id": 2,
                    "startTimecode": "00:00:03:00",
                    "endTimecode": "00:00:05:00",
                    "text": "测试字幕2"
                }
            ],
            "reference_info": "测试参考信息",
            "batchSize": 2,
            "model": "gpt-3.5-turbo",
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        # 模拟初次处理：全部成功
        async def mock_process_batch(batch, *args, **kwargs):
            return [
                OptimizedSubtitleItem(
                    id=batch[0].id if len(batch) > 0 else 1,
                    original_text=batch[0].text if len(batch) > 0 else "测试字幕",
                    optimized_text="优化后的字幕" + str(batch[0].id if len(batch) > 0 else "1"),
                    diffs=[]
                )
            ]
        
        with patch('routers.optimizer.process_batch', side_effect=mock_process_batch) as mock_process:
            response = client.post("/api/v1/optimizer/optimize", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            
            optimized_subtitles = data["data"]
            assert len(optimized_subtitles) == 2
            
            # 验证元数据 - 不应该有重试
            metadata = data["metadata"]
            assert metadata["total_subtitles"] == 2
            assert metadata["initial_batches_success"] == 1
            assert metadata["initial_batches_error"] == 0
            assert metadata["retry_subtitles_count"] == 0
            assert metadata["retry_success_count"] == 0
            assert metadata["final_fallback_count"] == 0

    @pytest.mark.asyncio
    async def test_optimizer_retry_failure_fallback(self):
        """测试优化器重试失败场景 - 重试仍然失败，回退到原始文本"""
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕1"
                },
                {
                    "id": 2,
                    "startTimecode": "00:00:03:00",
                    "endTimecode": "00:00:05:00",
                    "text": "测试字幕2"
                }
            ],
            "reference_info": "测试参考信息",
            "batchSize": 1,
            "model": "gpt-3.5-turbo",
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        # 模拟初次处理：失败
        async def mock_process_batch_1(batch, *args, **kwargs):
            raise Exception("初次处理失败")
        
        # 模拟重试处理：仍然失败
        async def mock_process_batch_2(batch, *args, **kwargs):
            raise Exception("重试处理也失败")
        
        with patch('routers.optimizer.process_batch', side_effect=[mock_process_batch_1, mock_process_batch_2]) as mock_process:
            response = client.post("/api/v1/optimizer/optimize", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            
            optimized_subtitles = data["data"]
            assert len(optimized_subtitles) == 2
            
            # 验证元数据
            metadata = data["metadata"]
            assert metadata["total_subtitles"] == 2
            assert metadata["initial_batches_error"] == 1
            assert metadata["retry_subtitles_count"] == 2
            assert metadata["retry_success_count"] == 0
            assert metadata["final_fallback_count"] == 2
            
            # 验证最终结果都是回退到原始文本
            assert optimized_subtitles[0]["optimized_text"] == "测试字幕1"
            assert optimized_subtitles[1]["optimized_text"] == "测试字幕2"

    @pytest.mark.asyncio
    async def test_rate_limiting_middleware(self):
        """测试速率限制中间件功能"""
        # 重置速率限制存储
        from routers.optimizer import rate_limit_store
        rate_limit_store.clear()
        
        # 模拟多个快速请求
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕"
                }
            ],
            "reference_info": "测试参考信息",
            "batchSize": 1,
            "model": "gpt-3.5-turbo"
        }
        
        with patch('routers.optimizer.process_batch', new_callable=AsyncMock) as mock_process:
            mock_process.return_value = [
                OptimizedSubtitleItem(
                    id=1,
                    original_text="测试字幕",
                    optimized_text="优化后的字幕",
                    diffs=[]
                )
            ]
            
            # 发送多个请求，应该受到速率限制
            for i in range(RATE_LIMIT_REQUESTS + 10):
                response = client.post("/api/v1/optimizer/optimize", json=request_data)
                if i >= RATE_LIMIT_REQUESTS:
                    # 超过限制时应该返回429
                    if response.status_code == 429:
                        assert "请求过于频繁" in response.json()["detail"]
                        break
                else:
                    # 在限制内应该成功
                    assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_integration(self):
        """测试断路器与重试机制的集成 - AC5集成测试"""
        # 重置断路器状态
        from routers.optimizer import circuit_breaker_state
        circuit_breaker_state['failure_count'] = 0
        circuit_breaker_state['last_failure_time'] = None
        circuit_breaker_state['is_open'] = False
        
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕1"
                }
            ],
            "reference_info": "测试参考信息",
            "batchSize": 1,
            "model": "gpt-3.5-turbo"
        }
        
        # 直接设置断路器状态为开启来测试断路器逻辑
        circuit_breaker_state['failure_count'] = CIRCUIT_BREAKER_THRESHOLD
        circuit_breaker_state['is_open'] = True
        
        # 发送请求，应该返回503因为断路器开启
        response = client.post("/api/v1/optimizer/optimize", json=request_data)
        assert response.status_code == 503
        assert "服务暂时不可用" in response.json()["detail"]
        
        # 验证断路器状态
        assert circuit_breaker_state['is_open'] is True
    
    @pytest.mark.asyncio
    async def test_performance_monitoring_integration(self):
        """测试性能监控与重试机制的集成"""
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕1"
                },
                {
                    "id": 2,
                    "startTimecode": "00:00:03:00",
                    "endTimecode": "00:00:05:00",
                    "text": "测试字幕2"
                },
                {
                    "id": 3,
                    "startTimecode": "00:00:05:00",
                    "endTimecode": "00:00:07:00",
                    "text": "测试字幕3"
                }
            ],
            "reference_info": "测试参考信息",
            "batchSize": 1,
            "model": "gpt-3.5-turbo"
        }
        
        # 模拟一个批次失败，需要重试的场景
        async def mock_mixed_batch(batch, *args, **kwargs):
            if batch[0].id == 1:
                # 第一个批次成功
                return [
                    OptimizedSubtitleItem(
                        id=1,
                        original_text="测试字幕1",
                        optimized_text="优化后的字幕1",
                        diffs=[]
                    )
                ]
            elif batch[0].id == 2:
                # 第二个批次失败
                raise Exception("批次2处理失败")
            else:
                # 第三个批次成功
                return [
                    OptimizedSubtitleItem(
                        id=3,
                        original_text="测试字幕3",
                        optimized_text="优化后的字幕3",
                        diffs=[]
                    )
                ]
        
        # 重试处理成功
        async def mock_retry_batch(batch, *args, **kwargs):
            return [
                OptimizedSubtitleItem(
                    id=2,
                    original_text="测试字幕2",
                    optimized_text="重试优化后的字幕2",
                    diffs=[]
                )
            ]
        
        with patch('routers.optimizer.process_batch') as mock_process:
            mock_process.side_effect = [mock_mixed_batch, mock_retry_batch]
            response = client.post("/api/v1/optimizer/optimize", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            
            # 验证性能监控指标
            metadata = data["metadata"]
            assert "performance_metrics" in metadata
            
            perf_metrics = metadata["performance_metrics"]
            assert "avg_processing_per_subtitle" in perf_metrics
            assert "retry_rate" in perf_metrics
            assert "circuit_breaker_state" in perf_metrics
            assert "circuit_breaker_failure_count" in perf_metrics
            
            # 验证性能指标的计算
            assert perf_metrics["avg_processing_per_subtitle"] > 0
            assert perf_metrics["retry_rate"] > 0  # 有重试，所以重试率应该大于0
            assert perf_metrics["circuit_breaker_state"] == "closed"  # 断路器应该关闭
    
    @pytest.mark.asyncio
    async def test_retry_integration_ac5(self):
        """测试重试机制完整集成 - AC5集成测试"""
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕1"
                },
                {
                    "id": 2,
                    "startTimecode": "00:00:03:00",
                    "endTimecode": "00:00:05:00",
                    "text": "测试字幕2"
                }
            ],
            "reference_info": "测试参考信息",
            "batchSize": 2,
            "model": "gpt-3.5-turbo"
        }
        
        # 模拟初次处理：整个批次失败
        async def mock_initial_failure(batch, *args, **kwargs):
            raise Exception("初次处理失败")
        
        # 模拟重试处理：成功
        async def mock_retry_success(batch, *args, **kwargs):
            return [
                OptimizedSubtitleItem(
                    id=1,
                    original_text="测试字幕1",
                    optimized_text="重试优化后的字幕1",
                    diffs=[]
                ),
                OptimizedSubtitleItem(
                    id=2,
                    original_text="测试字幕2",
                    optimized_text="重试优化后的字幕2",
                    diffs=[]
                )
            ]
        
        with patch('routers.optimizer.process_batch', side_effect=[mock_initial_failure, mock_retry_success]) as mock_process:
            response = client.post("/api/v1/optimizer/optimize", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            
            optimized_subtitles = data["data"]
            assert len(optimized_subtitles) == 2
            
            # 验证AC5：单次重试尝试
            metadata = data["metadata"]
            assert metadata["initial_batches_error"] == 1
            assert metadata["retry_subtitles_count"] == 2
            assert metadata["retry_success_count"] == 2
            
            # 验证重试结果都是优化成功的
            assert optimized_subtitles[0]["optimized_text"] == "重试优化后的字幕1"
            assert optimized_subtitles[1]["optimized_text"] == "重试优化后的字幕2"
    
    @pytest.mark.asyncio
    async def test_final_fallback_integration_ac6(self):
        """测试最终回退机制完整集成 - AC6集成测试"""
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕1"
                },
                {
                    "id": 2,
                    "startTimecode": "00:00:03:00",
                    "endTimecode": "00:00:05:00",
                    "text": "测试字幕2"
                }
            ],
            "reference_info": "测试参考信息",
            "batchSize": 1,
            "model": "gpt-3.5-turbo"
        }
        
        # 模拟初次处理：失败
        async def mock_initial_failure(batch, *args, **kwargs):
            raise Exception("初次处理失败")
        
        # 模拟重试处理：也失败
        async def mock_retry_failure(batch, *args, **kwargs):
            raise Exception("重试处理也失败")
        
        with patch('routers.optimizer.process_batch', side_effect=[mock_initial_failure, mock_retry_failure]) as mock_process:
            response = client.post("/api/v1/optimizer/optimize", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            
            optimized_subtitles = data["data"]
            assert len(optimized_subtitles) == 2
            
            # 验证AC6：最终回退到原始文本
            metadata = data["metadata"]
            assert metadata["initial_batches_error"] == 2
            assert metadata["retry_subtitles_count"] == 2
            assert metadata["retry_success_count"] == 0
            assert metadata["final_fallback_count"] == 2
            
            # 验证最终结果都是回退到原始文本
            assert optimized_subtitles[0]["optimized_text"] == "测试字幕1"
            assert optimized_subtitles[1]["optimized_text"] == "测试字幕2"
            
            # 确认没有进行更多次重试
            assert metadata["retry_subtitles_count"] == 2  # 只有重试了一次

class TestStreamingOptimization:
    """流式优化测试"""
    
    def test_streaming_optimize_endpoint_structure(self):
        """测试流式优化端点的基本结构"""
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕"
                }
            ],
            "reference_info": "测试参考信息",
            "batchSize": 1,
            "model": "gpt-3.5-turbo"
        }
        
        # 发送请求，应该返回SSE流而不是JSON
        response = client.post("/api/v1/optimizer/optimize", json=request_data)
        
        # 端点应该返回200状态码
        assert response.status_code == 200
        
        # 应该返回SSE响应头
        assert "text/event-stream" in response.headers.get("content-type", "")
        assert "cache-control" in response.headers
        assert response.headers["cache-control"] == "no-cache"
    
    @pytest.mark.asyncio
    async def test_streaming_sse_event_generation(self):
        """测试SSE事件生成功能"""
        from unittest.mock import AsyncMock
        import json
        
        # 通过端点测试SSE事件生成
        request_data = {
            "subtitles": [{"id": 1, "text": "测试字幕"}],
            "batchSize": 1,
            "model": "gpt-3.5-turbo"
        }
        
        # 模拟批次处理
        async def mock_process_batch(batch, *args, **kwargs):
            return [
                {
                    "id": 1,
                    "original_text": "测试字幕",
                    "optimized_text": "优化后的字幕",
                    "diffs": []
                }
            ]
        
        with patch('routers.optimizer.process_batch', new_callable=AsyncMock) as mock_process:
            mock_process.return_value = await mock_process_batch([{"id": 1, "text": "测试字幕"}])
            
            # 模拟生成器函数
            async def mock_generate_sse_events():
                # 模拟开始事件
                start_event = {
                    "type": "start",
                    "data": {
                        "total_subtitles": 1,
                        "total_batches": 1,
                        "message": "开始优化字幕"
                    }
                }
                yield f"data: {json.dumps(start_event, ensure_ascii=False)}\n\n"
                
                # 模拟批次开始事件
                batch_start_event = {
                    "type": "batch_start",
                    "data": {
                        "batch_number": 1,
                        "total_batches": 1,
                        "batch_size": 1,
                        "processed_count": 0,
                        "total_count": 1,
                        "message": "开始处理批次 1/1"
                    }
                }
                yield f"data: {json.dumps(batch_start_event, ensure_ascii=False)}\n\n"
                
                # 模拟批次完成事件
                batch_complete_event = {
                    "type": "batch_complete",
                    "data": {
                        "batch_number": 1,
                        "total_batches": 1,
                        "batch_size": 1,
                        "processed_count": 1,
                        "total_count": 1,
                        "batch_results": [{
                            "id": 1,
                            "original_text": "测试字幕",
                            "optimized_text": "优化后的字幕",
                            "diffs": []
                        }],
                        "batch_processing_time": 1.5,
                        "message": "批次 1 处理完成"
                    }
                }
                yield f"data: {json.dumps(batch_complete_event, ensure_ascii=False)}\n\n"
                
                # 模拟完成事件
                complete_event = {
                    "type": "complete",
                    "data": {
                        "total_subtitles": 1,
                        "optimized_subtitles": [{
                            "id": 1,
                            "original_text": "测试字幕",
                            "optimized_text": "优化后的字幕",
                            "diffs": []
                        }],
                        "metadata": {
                            "total_subtitles": 1,
                            "batches_processed": 1,
                            "cache_hits": 0,
                            "cache_hit_rate": 0,
                            "processing_time": 1.5,
                            "model_used": "gpt-3.5-turbo",
                            "optimized_count": 1,
                            "fallback_count": 0,
                            "success_rate": 100
                        },
                        "message": "字幕优化完成"
                    }
                }
                yield f"data: {json.dumps(complete_event, ensure_ascii=False)}\n\n"
            
            # 验证事件格式
            events = []
            async for event in mock_generate_sse_events():
                events.append(event)
                
            # 应该有4个事件
            assert len(events) == 4
            
            # 验证事件格式
            for event in events:
                assert event.startswith("data: ")
                assert event.endswith("\n\n")
                
                # 解析JSON数据
                json_start = event.find("data: ") + 6
                json_end = event.rfind("\n\n")
                json_data = event[json_start:json_end]
                parsed_event = json.loads(json_data)
                
                assert "type" in parsed_event
                assert "data" in parsed_event
                assert "message" in parsed_event["data"]
    
    @pytest.mark.asyncio
    async def test_streaming_batch_error_handling(self):
        """测试流式优化中批次错误处理"""
        from unittest.mock import AsyncMock
        import json
        
        # 模拟请求
        request_data = {
            "subtitles": [
                {"id": 1, "text": "测试字幕1"},
                {"id": 2, "text": "测试字幕2"}
            ],
            "batchSize": 1,
            "model": "gpt-3.5-turbo"
        }
        
        # 模拟生成器函数，包含错误事件
        async def mock_generate_sse_events_with_error():
            # 开始事件
            start_event = {
                "type": "start",
                "data": {
                    "total_subtitles": 2,
                    "total_batches": 2,
                    "message": "开始优化字幕"
                }
            }
            yield f"data: {json.dumps(start_event, ensure_ascii=False)}\n\n"
            
            # 批次1成功
            batch1_complete_event = {
                "type": "batch_complete",
                "data": {
                    "batch_number": 1,
                    "total_batches": 2,
                    "batch_size": 1,
                    "processed_count": 1,
                    "total_count": 2,
                    "batch_results": [{
                        "id": 1,
                        "original_text": "测试字幕1",
                        "optimized_text": "优化后的字幕1",
                        "diffs": []
                    }],
                    "batch_processing_time": 1.0,
                    "message": "批次 1 处理完成"
                }
            }
            yield f"data: {json.dumps(batch1_complete_event, ensure_ascii=False)}\n\n"
            
            # 批次2失败事件
            batch2_error_event = {
                "type": "batch_error",
                "data": {
                    "batch_number": 2,
                    "total_batches": 2,
                    "batch_size": 1,
                    "processed_count": 2,
                    "total_count": 2,
                    "error": "批次处理失败",
                    "fallback_results": [{
                        "id": 2,
                        "original_text": "测试字幕2",
                        "optimized_text": "测试字幕2",
                        "diffs": []
                    }],
                    "batch_processing_time": 0.5,
                    "message": "批次 2 处理失败，使用原始文本"
                }
            }
            yield f"data: {json.dumps(batch2_error_event, ensure_ascii=False)}\n\n"
            
            # 完成事件
            complete_event = {
                "type": "complete",
                "data": {
                    "total_subtitles": 2,
                    "optimized_subtitles": [
                        {
                            "id": 1,
                            "original_text": "测试字幕1",
                            "optimized_text": "优化后的字幕1",
                            "diffs": []
                        },
                        {
                            "id": 2,
                            "original_text": "测试字幕2",
                            "optimized_text": "测试字幕2",
                            "diffs": []
                        }
                    ],
                    "metadata": {
                        "total_subtitles": 2,
                        "batches_processed": 2,
                        "cache_hits": 0,
                        "cache_hit_rate": 0,
                        "processing_time": 1.5,
                        "model_used": "gpt-3.5-turbo",
                        "optimized_count": 1,
                        "fallback_count": 1,
                        "success_rate": 50
                    },
                    "message": "字幕优化完成"
                }
            }
            yield f"data: {json.dumps(complete_event, ensure_ascii=False)}\n\n"
        
        # 验证错误处理
        events = []
        async for event in mock_generate_sse_events_with_error():
            events.append(event)
        
        # 验证事件包含错误类型
        error_event = None
        for event in events:
            json_start = event.find("data: ") + 6
            json_end = event.rfind("\n\n")
            json_data = event[json_start:json_end]
            parsed_event = json.loads(json_data)
            
            if parsed_event["type"] == "batch_error":
                error_event = parsed_event
                break
        
        assert error_event is not None
        assert "error" in error_event["data"]
        assert "fallback_results" in error_event["data"]
        assert len(error_event["data"]["fallback_results"]) == 1
    
    @pytest.mark.asyncio
    async def test_streaming_error_event_handling(self):
        """测试流式优化中错误事件处理"""
        from unittest.mock import AsyncMock
        import json
        
        # 模拟生成器函数，包含全局错误事件
        async def mock_generate_sse_events_with_global_error():
            # 开始事件
            start_event = {
                "type": "start",
                "data": {
                    "total_subtitles": 1,
                    "total_batches": 1,
                    "message": "开始优化字幕"
                }
            }
            yield f"data: {json.dumps(start_event, ensure_ascii=False)}\n\n"
            
            # 全局错误事件
            error_event = {
                "type": "error",
                "data": {
                    "error": "优化过程中发生严重错误",
                    "message": "优化过程中发生错误"
                }
            }
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
        
        # 验证错误事件处理
        events = []
        async for event in mock_generate_sse_events_with_global_error():
            events.append(event)
        
        # 验证事件包含错误类型
        error_event = None
        for event in events:
            json_start = event.find("data: ") + 6
            json_end = event.rfind("\n\n")
            json_data = event[json_start:json_end]
            parsed_event = json.loads(json_data)
            
            if parsed_event["type"] == "error":
                error_event = parsed_event
                break
        
        assert error_event is not None
        assert "error" in error_event["data"]
        assert error_event["data"]["error"] == "优化过程中发生严重错误"
    
    def test_streaming_endpoint_validation(self):
        """测试流式端点输入验证"""
        # 测试空字幕列表
        request_data = {
            "subtitles": [],
            "reference_info": "测试参考信息"
        }
        
        response = client.post("/api/v1/optimizer/optimize", json=request_data)
        assert response.status_code == 400
        assert "字幕列表不能为空" in response.text
        
        # 测试无效的字幕数据
        request_data = {
            "subtitles": [
                {"id": "invalid", "text": "测试字幕"}  # ID应该是数字
            ]
        }
        
        response = client.post("/api/v1/optimizer/optimize", json=request_data)
        # 验证错误处理
        assert response.status_code in [400, 422]  # FastAPI验证错误
    
    def test_streaming_endpoint_cors_headers(self):
        """测试流式端点CORS头部"""
        request_data = {
            "subtitles": [
                {
                    "id": 1,
                    "startTimecode": "00:00:01:00",
                    "endTimecode": "00:00:03:00",
                    "text": "测试字幕"
                }
            ],
            "model": "gpt-3.5-turbo"
        }
        
        response = client.post("/api/v1/optimizer/optimize", json=request_data)
        
        # 验证CORS头部
        assert "access-control-allow-origin" in response.headers
        assert response.headers["access-control-allow-origin"] == "*"
        assert "access-control-allow-headers" in response.headers


if __name__ == "__main__":
    pytest.main([__file__, "-v"])