import pytest
from fastapi.testclient import TestClient
from main import app
from schemas import SubtitleItem, ReplaceAllRequest, ReplaceAllResponse

# 创建测试客户端
client = TestClient(app)

class TestReplaceAllAPI:
    """测试查找替换API端点"""

    def test_replace_all_success(self):
        """测试成功执行查找替换"""
        # 准备测试数据
        request_data = {
            "subtitles": [
                {"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "Hello World"},
                {"id": 2, "startTimecode": "00:00:03:00", "endTimecode": "00:00:05:00", "text": "Goodbye World"},
                {"id": 3, "startTimecode": "00:00:05:00", "endTimecode": "00:00:07:00", "text": "Hello Universe"}
            ],
            "searchQuery": "World",
            "replaceQuery": "Earth"
        }
        
        # 发送请求
        response = client.post("/api/v1/subtitles/replace-all", json=request_data)
        
        # 验证响应
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        # 验证返回的数据
        modified_subtitles = data["data"]
        assert len(modified_subtitles) == 2  # 只有包含"World"的字幕被修改
        
        # 验证修改的字幕
        modified_ids = [item["id"] for item in modified_subtitles]
        assert 1 in modified_ids
        assert 2 in modified_ids
        assert 3 not in modified_ids  # 第三个字幕没有被修改
        
        # 验证文本替换是否正确
        for item in modified_subtitles:
            if item["id"] == 1:
                assert item["text"] == "Hello Earth"
            elif item["id"] == 2:
                assert item["text"] == "Goodbye Earth"

    def test_replace_all_case_insensitive(self):
        """测试不区分大小写的查找替换"""
        request_data = {
            "subtitles": [
                {"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "hello world"},
                {"id": 2, "startTimecode": "00:00:03:00", "endTimecode": "00:00:05:00", "text": "Hello World"},
                {"id": 3, "startTimecode": "00:00:05:00", "endTimecode": "00:00:07:00", "text": "HELLO WORLD"}
            ],
            "searchQuery": "hello",
            "replaceQuery": "Hi"
        }
        
        response = client.post("/api/v1/subtitles/replace-all", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        # 所有字幕都应该被修改（不区分大小写）
        modified_subtitles = data["data"]
        assert len(modified_subtitles) == 3
        
        # 验证替换结果
        for item in modified_subtitles:
            assert "Hi" in item["text"]

    def test_replace_all_special_characters(self):
        """测试包含正则表达式特殊字符的查找替换"""
        request_data = {
            "subtitles": [
                {"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "Test. with dots"},
                {"id": 2, "startTimecode": "00:00:03:00", "endTimecode": "00:00:05:00", "text": "Test* with asterisk"}
            ],
            "searchQuery": "Test.",
            "replaceQuery": "Replaced"
        }
        
        response = client.post("/api/v1/subtitles/replace-all", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        modified_subtitles = data["data"]
        assert len(modified_subtitles) == 1
        assert modified_subtitles[0]["id"] == 1
        assert modified_subtitles[0]["text"] == "Replaced with dots"

    def test_replace_all_empty_search_query(self):
        """测试空搜索查询的错误处理"""
        request_data = {
            "subtitles": [
                {"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "Hello World"}
            ],
            "searchQuery": "",
            "replaceQuery": "Earth"
        }
        
        response = client.post("/api/v1/subtitles/replace-all", json=request_data)
        
        assert response.status_code == 400
        data = response.json()
        assert data["detail"]["status"] == "error"
        assert "搜索查询不能为空" in data["detail"]["message"]
        assert data["detail"]["code"] == "invalid_search_query"

    def test_replace_all_whitespace_search_query(self):
        """测试仅包含空格的搜索查询的错误处理"""
        request_data = {
            "subtitles": [
                {"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "Hello World"}
            ],
            "searchQuery": "   ",
            "replaceQuery": "Earth"
        }
        
        response = client.post("/api/v1/subtitles/replace-all", json=request_data)
        
        assert response.status_code == 400
        data = response.json()
        assert data["detail"]["status"] == "error"
        assert "搜索查询不能为空" in data["detail"]["message"]

    def test_replace_all_no_matches(self):
        """测试没有匹配项的情况"""
        request_data = {
            "subtitles": [
                {"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "Hello World"},
                {"id": 2, "startTimecode": "00:00:03:00", "endTimecode": "00:00:05:00", "text": "Goodbye Universe"}
            ],
            "searchQuery": "Nonexistent",
            "replaceQuery": "Replacement"
        }
        
        response = client.post("/api/v1/subtitles/replace-all", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        # 没有字幕被修改
        modified_subtitles = data["data"]
        assert len(modified_subtitles) == 0

    def test_replace_all_multiple_occurrences(self):
        """测试在同一字幕中多次出现的替换"""
        request_data = {
            "subtitles": [
                {"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "Test Test Test"},
                {"id": 2, "startTimecode": "00:00:03:00", "endTimecode": "00:00:05:00", "text": "Single Test"}
            ],
            "searchQuery": "Test",
            "replaceQuery": "Replaced"
        }
        
        response = client.post("/api/v1/subtitles/replace-all", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        modified_subtitles = data["data"]
        assert len(modified_subtitles) == 2
        
        # 验证多次替换
        for item in modified_subtitles:
            if item["id"] == 1:
                assert item["text"] == "Replaced Replaced Replaced"
            elif item["id"] == 2:
                assert item["text"] == "Single Replaced"

    def test_replace_all_empty_replace_query(self):
        """测试替换查询为空（即删除匹配文本）"""
        request_data = {
            "subtitles": [
                {"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "Hello World"},
            ],
            "searchQuery": "World",
            "replaceQuery": ""
        }
        
        response = client.post("/api/v1/subtitles/replace-all", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        modified_subtitles = data["data"]
        assert len(modified_subtitles) == 1
        assert modified_subtitles[0]["text"] == "Hello "

    def test_replace_all_complex_text(self):
        """测试复杂文本的替换"""
        request_data = {
            "subtitles": [
                {"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "The quick brown fox jumps over the lazy dog."},
                {"id": 2, "startTimecode": "00:00:03:00", "endTimecode": "00:00:05:00", "text": "The quick brown fox is quick."}
            ],
            "searchQuery": "quick",
            "replaceQuery": "fast"
        }
        
        response = client.post("/api/v1/subtitles/replace-all", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        modified_subtitles = data["data"]
        assert len(modified_subtitles) == 2
        
        # 验证复杂文本替换
        for item in modified_subtitles:
            if item["id"] == 1:
                assert item["text"] == "The fast brown fox jumps over the lazy dog."
            elif item["id"] == 2:
                assert item["text"] == "The fast brown fox is fast."