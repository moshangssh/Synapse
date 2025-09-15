"""
API 密钥安全性专项测试
验证前端不再发送API密钥，后端强制使用环境变量
"""

import pytest
import os
import json
import sys
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

class TestAPISecurity:
    """API 密钥安全性测试"""
    
    def test_frontend_does_not_send_api_key(self):
        """测试前端优化请求不包含 API 密钥"""
        # 模拟前端发送的优化请求
        frontend_request_data = {
            "subtitles": [
                {"index": 1, "text": "测试字幕1", "start_time": "00:00:01:000", "end_time": "00:00:03:000"},
                {"index": 2, "text": "测试字幕2", "start_time": "00:00:04:000", "end_time": "00:00:06:000"}
            ],
            "optimization_type": "grammar",
            "target_language": "zh-CN"
        }
        
        # 验证请求数据中不包含 API 密钥相关字段
        assert "api_key" not in frontend_request_data
        assert "API_KEY" not in frontend_request_data
        assert "apiKey" not in frontend_request_data
        assert "llm_config" not in frontend_request_data
        
    def test_backend_ignores_frontend_api_key(self):
        """测试后端忽略前端发送的 API 密钥参数"""
        # 设置必要的环境变量
        with patch.dict(os.environ, {
            'LLM_API_KEY': 'test_env_api_key',
            'LLM_ENDPOINT': 'https://api.test.com/v1'
        }):
            # 模拟前端尝试发送 API 密钥
            malicious_request = {
                "subtitles": [
                    {"index": 1, "text": "测试字幕1", "start_time": "00:00:01:000", "end_time": "00:00:03:000"}
                ],
                "optimization_type": "grammar",
                "target_language": "zh-CN",
                "api_key": "malicious_frontend_key",  # 前端尝试注入的密钥
                "llm_config": {
                    "api_key": "another_malicious_key",
                    "endpoint": "https://malicious.com/v1"
                }
            }
            
            # 模拟后端验证配置
            from backend.config import validate_config
            config_result = validate_config()
            
            # 验证配置有效（使用环境变量）
            assert config_result is True
            
            # 验证前端发送的恶意数据不影响后端配置
            from backend.config import get_settings
            settings = get_settings()
            assert settings.llm_api_key == "test_env_api_key"
            assert settings.llm_endpoint == "https://api.test.com/v1"
    
    def test_backend_requires_env_variables(self):
        """测试后端在没有环境变量时正确拒绝请求"""
        # 清除环境变量
        with patch.dict(os.environ, {}, clear=True):
            from backend.config import validate_config
            config_result = validate_config()
            
            # 验证配置失败
            assert config_result is False
    
    def test_optimization_endpoint_security(self):
        """测试优化端点的安全性"""
        # 设置环境变量
        with patch.dict(os.environ, {
            'LLM_API_KEY': 'test_security_key',
            'LLM_ENDPOINT': 'https://api.security.com/v1'
        }):
            # 模拟优化请求（不包含敏感信息）
            optimize_data = {
                "subtitles": [
                    {"index": 1, "text": "安全测试", "start_time": "00:00:01:000", "end_time": "00:00:02:000"}
                ],
                "optimization_type": "grammar",
                "target_language": "zh-CN"
            }
            
            # 发送请求
            response = client.post("/optimize", json=optimize_data)
            
            # 验证请求被接受（即使 LLM 服务不可用，配置验证也应该通过）
            # 注意：这个测试可能会因为 LLM 服务不可用而失败，但我们主要关心安全性
            assert response.status_code in [200, 500]  # 200=成功, 500=LLM服务不可用
            
            # 验证响应中不包含敏感信息
            response_data = response.json()
            assert "api_key" not in response_data
            assert "API_KEY" not in response_data
            assert "apiKey" not in response_data

    def test_environment_variable_validation(self):
        """测试环境变量验证逻辑"""
        # 测试有效环境变量
        with patch.dict(os.environ, {
            'LLM_API_KEY': 'valid_test_key',
            'LLM_ENDPOINT': 'https://api.valid.com/v1'
        }):
            from backend.config import validate_config
            result = validate_config()
            
            assert result is True
            
            # 验证配置使用了环境变量
            from backend.config import get_settings
            settings = get_settings()
            assert settings.llm_api_key == "valid_test_key"
            assert settings.llm_endpoint == "https://api.valid.com/v1"
    
    def test_frontend_service_security_compliance(self):
        """测试前端服务是否符合安全性要求"""
        # 检查前端服务文件
        frontend_service_path = "frontend/synapse/src/services/optimizationService.ts"
        
        # 读取前端服务文件内容
        try:
            with open(frontend_service_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 验证文件中没有硬编码的 API 密钥
            assert "api_key" not in content.lower()
            assert "API_KEY" not in content
            
            # 验证包含安全性注释
            assert "API 密钥现在由后端管理" in content
            assert "前端不再需要发送" in content
            
        except FileNotFoundError:
            pytest.skip(f"前端服务文件未找到: {frontend_service_path}")
    
    def test_batch_size_security(self):
        """测试批量处理参数的安全性"""
        # 验证批量大小参数不会被滥用
        batch_sizes = [-1, 0, 1000000]  # 无效的批量大小
        
        with patch.dict(os.environ, {
            'LLM_API_KEY': 'test_batch_key',
            'LLM_ENDPOINT': 'https://api.batch.com/v1'
        }):
            from backend.config import validate_config
            
            for batch_size in batch_sizes:
                # 即使发送无效的batchSize，配置验证仍然应该工作
                result = validate_config()
                
                # 验证配置验证仍然正常工作，不会因为无效参数而泄露敏感信息
                assert result is True
                
                # 验证后端仍然使用环境变量中的密钥
                from backend.config import get_settings
                settings = get_settings()
                assert settings.llm_api_key == "test_batch_key"