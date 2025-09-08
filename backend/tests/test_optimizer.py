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
    process_batch
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
        assert "You are a subtitle correction expert" in prompt
        assert "Correction Rules" in prompt
        
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
            "batch_size": 5,
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

if __name__ == "__main__":
    pytest.main([__file__, "-v"])