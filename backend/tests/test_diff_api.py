import pytest
from fastapi.testclient import TestClient
from main import app
from schemas import DiffRequest, DiffResponse

# 创建测试客户端
client = TestClient(app)

class TestDiffAPI:
    """测试文本差异计算API端点"""

    def test_diff_calculation_success(self):
        """测试成功计算文本差异"""
        # 准备测试数据
        request_data = {
            "original_text": "Hello World",
            "new_text": "Hello Universe"
        }
        
        # 发送请求
        response = client.post("/api/v1/utils/diff", json=request_data)
        
        # 验证响应
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        # 验证返回的差异数据
        diff_parts = data["data"]
        assert len(diff_parts) >= 3  # 至少有3个部分：正常、删除、添加
        
        # 验证差异部分的结构
        for part in diff_parts:
            assert "type" in part
            assert "value" in part
            assert part["type"] in ["added", "removed", "normal"]
            assert isinstance(part["value"], str)
        
        # 验证重构后的文本与输入匹配
        reconstructed_original = ""
        reconstructed_new = ""
        
        for part in diff_parts:
            if part["type"] != "added":
                reconstructed_original += part["value"]
            if part["type"] != "removed":
                reconstructed_new += part["value"]
        
        assert reconstructed_original == request_data["original_text"]
        assert reconstructed_new == request_data["new_text"]

    def test_diff_no_changes(self):
        """测试无变化的情况"""
        request_data = {
            "original_text": "Hello World",
            "new_text": "Hello World"
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        diff_parts = data["data"]
        assert len(diff_parts) == 1
        assert diff_parts[0]["type"] == "normal"
        assert diff_parts[0]["value"] == "Hello World"

    def test_diff_addition_only(self):
        """测试纯添加的情况"""
        request_data = {
            "original_text": "Hello",
            "new_text": "Hello World"
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        diff_parts = data["data"]
        assert len(diff_parts) >= 2
        
        # 验证包含添加的部分
        added_parts = [part for part in diff_parts if part["type"] == "added"]
        assert len(added_parts) >= 1
        assert any("World" in part["value"] for part in added_parts)

    def test_diff_removal_only(self):
        """测试纯删除的情况"""
        request_data = {
            "original_text": "Hello World",
            "new_text": "Hello"
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        diff_parts = data["data"]
        assert len(diff_parts) >= 2
        
        # 验证包含删除的部分
        removed_parts = [part for part in diff_parts if part["type"] == "removed"]
        assert len(removed_parts) >= 1
        assert any("World" in part["value"] for part in removed_parts)

    def test_diff_empty_strings(self):
        """测试空字符串"""
        request_data = {
            "original_text": "",
            "new_text": ""
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        diff_parts = data["data"]
        assert len(diff_parts) == 1
        assert diff_parts[0]["type"] == "normal"
        assert diff_parts[0]["value"] == ""

    def test_diff_empty_to_content(self):
        """测试从空字符串到有内容"""
        request_data = {
            "original_text": "",
            "new_text": "Hello World"
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        diff_parts = data["data"]
        assert len(diff_parts) == 1
        assert diff_parts[0]["type"] == "added"
        assert diff_parts[0]["value"] == "Hello World"

    def test_diff_content_to_empty(self):
        """测试从有内容到空字符串"""
        request_data = {
            "original_text": "Hello World",
            "new_text": ""
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        diff_parts = data["data"]
        assert len(diff_parts) == 1
        assert diff_parts[0]["type"] == "removed"
        assert diff_parts[0]["value"] == "Hello World"

    def test_diff_unicode_characters(self):
        """测试Unicode字符"""
        request_data = {
            "original_text": "你好世界",
            "new_text": "你好，世界"
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        diff_parts = data["data"]
        assert len(diff_parts) >= 2
        
        # 验证包含添加的标点符号
        added_parts = [part for part in diff_parts if part["type"] == "added"]
        assert any("，" in part["value"] for part in added_parts)

    def test_diff_complex_changes(self):
        """测试复杂文本变化"""
        request_data = {
            "original_text": "The quick brown fox jumps over the lazy dog",
            "new_text": "The fast brown fox leaps over the sleepy cat"
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        diff_parts = data["data"]
        
        # 验证重构后的文本与输入匹配
        reconstructed_original = ""
        reconstructed_new = ""
        
        for part in diff_parts:
            if part["type"] != "added":
                reconstructed_original += part["value"]
            if part["type"] != "removed":
                reconstructed_new += part["value"]
        
        assert reconstructed_original == request_data["original_text"]
        assert reconstructed_new == request_data["new_text"]

    def test_diff_special_characters(self):
        """测试特殊字符"""
        request_data = {
            "original_text": "Hello, World!",
            "new_text": "Hello World."
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        diff_parts = data["data"]
        
        # 验证包含标点符号的变化
        types = [part["type"] for part in diff_parts]
        assert "added" in types or "removed" in types

    def test_diff_missing_required_fields(self):
        """测试缺少必需字段"""
        # 缺少 original_text
        request_data = {
            "new_text": "Hello World"
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        assert response.status_code == 422  # 验证错误
        
        # 缺少 new_text
        request_data = {
            "original_text": "Hello World"
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        assert response.status_code == 422  # 验证错误

    def test_diff_invalid_data_types(self):
        """测试无效的数据类型"""
        # original_text 不是字符串
        request_data = {
            "original_text": 123,
            "new_text": "Hello World"
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        assert response.status_code == 422  # 验证错误
        
        # new_text 不是字符串
        request_data = {
            "original_text": "Hello World",
            "new_text": ["array"]
        }
        
        response = client.post("/api/v1/utils/diff", json=request_data)
        assert response.status_code == 422  # 验证错误