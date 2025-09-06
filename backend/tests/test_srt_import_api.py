import pytest
import sys
import os
import json

# 添加backend目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestSrtImportApi:
    """测试SRT导入API端点"""
    
    def test_import_valid_srt_file(self):
        """测试导入有效的SRT文件"""
        srt_content = """1
00:00:01,000 --> 00:00:03,000
Hello, world!

2
00:00:04,000 --> 00:00:06,000
This is a test.
"""
        
        payload = {
            "content": srt_content,
            "fileName": "test.srt"
        }
        
        response = client.post("/api/v1/subtitles/import/srt", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        
        # 验证返回的数据结构
        result_data = data["data"]
        assert result_data["fileName"] == "test.srt"
        assert "subtitles" in result_data
        assert "metadata" in result_data
        assert result_data["metadata"]["format"] == "srt"
        
        # 验证字幕内容
        subtitles = result_data["subtitles"]
        assert len(subtitles) == 2
        
        first_subtitle = subtitles[0]
        assert first_subtitle["id"] == 1
        assert first_subtitle["startTimecode"] == "00:00:01.000"
        assert first_subtitle["endTimecode"] == "00:00:03.000"
        assert first_subtitle["text"] == "Hello, world!"
    
    def test_import_srt_with_dot_separator(self):
        """测试导入使用点分隔符的SRT文件"""
        srt_content = """1
00:00:01.000 --> 00:00:03.000
Hello, world!
"""
        
        payload = {
            "content": srt_content,
            "fileName": "test.srt"
        }
        
        response = client.post("/api/v1/subtitles/import/srt", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        subtitles = data["data"]["subtitles"]
        assert subtitles[0]["startTimecode"] == "00:00:01.000"
        assert subtitles[0]["endTimecode"] == "00:00:03.000"
    
    def test_import_empty_srt_content(self):
        """测试导入空的SRT内容"""
        payload = {
            "content": "",
            "fileName": "empty.srt"
        }
        
        response = client.post("/api/v1/subtitles/import/srt", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        detail = data["detail"]
        assert detail["status"] == "error"
        assert "SRT文件格式错误" in detail["message"]
        assert detail["code"] == "invalid_srt_format"
    
    def test_import_invalid_srt_format(self):
        """测试导入无效的SRT格式"""
        srt_content = """This is not a valid SRT file
It has no timecodes
"""
        
        payload = {
            "content": srt_content,
            "fileName": "invalid.srt"
        }
        
        response = client.post("/api/v1/subtitles/import/srt", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        detail = data["detail"]
        assert detail["status"] == "error"
        assert "SRT文件格式错误" in detail["message"]
        assert detail["code"] == "invalid_srt_format"
    
    def test_import_srt_with_invalid_timecode(self):
        """测试导入包含无效时间码的SRT文件"""
        srt_content = """1
00:00:01 --> 00:00:03
This has invalid timecode format
"""
        
        payload = {
            "content": srt_content,
            "fileName": "invalid.srt"
        }
        
        response = client.post("/api/v1/subtitles/import/srt", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        detail = data["detail"]
        assert detail["status"] == "error"
        assert "SRT文件格式错误" in detail["message"]
        assert detail["code"] == "invalid_srt_format"
    
    def test_import_oversized_file(self):
        """测试导入过大的文件"""
        # 创建一个超过10MB的内容
        large_content = "1\n00:00:01,000 --> 00:00:02,000\nLarge content line\n" * 300000
        
        payload = {
            "content": large_content,
            "fileName": "large.srt"
        }
        
        response = client.post("/api/v1/subtitles/import/srt", json=payload)
        
        assert response.status_code == 413
        data = response.json()
        assert "detail" in data
        detail = data["detail"]
        assert detail["status"] == "error"
        assert "文件内容过大" in detail["message"]
        assert detail["code"] == "file_too_large"
    
    def test_import_srt_with_bom(self):
        """测试导入包含BOM标记的SRT文件"""
        srt_content = "\uFEFF1\n00:00:01,000 --> 00:00:03,000\nHello, world!"
        
        payload = {
            "content": srt_content,
            "fileName": "bom.srt"
        }
        
        response = client.post("/api/v1/subtitles/import/srt", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        subtitles = data["data"]["subtitles"]
        assert len(subtitles) == 1
        assert subtitles[0]["text"] == "Hello, world!"
    
    def test_import_srt_with_multiple_text_lines(self):
        """测试导入包含多行文本的SRT文件"""
        srt_content = """1
00:00:01,000 --> 00:00:03,000
First line
Second line
Third line
"""
        
        payload = {
            "content": srt_content,
            "fileName": "multiline.srt"
        }
        
        response = client.post("/api/v1/subtitles/import/srt", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        subtitles = data["data"]["subtitles"]
        assert subtitles[0]["text"] == "First line\nSecond line\nThird line"
    
    def test_import_srt_missing_required_fields(self):
        """测试导入缺少必需字段的请求"""
        # 缺少content字段
        payload = {
            "fileName": "test.srt"
        }
        
        response = client.post("/api/v1/subtitles/import/srt", json=payload)
        assert response.status_code == 422  # Unprocessable Entity
        
        # 缺少fileName字段
        payload = {
            "content": "1\n00:00:01,000 --> 00:00:03,000\nHello"
        }
        
        response = client.post("/api/v1/subtitles/import/srt", json=payload)
        assert response.status_code == 422  # Unprocessable Entity
    
    def test_import_srt_with_mixed_valid_invalid_blocks(self):
        """测试导入包含有效和无效字幕块的SRT文件"""
        srt_content = """1
00:00:01,000 --> 00:00:03,000
Valid subtitle

Invalid block without timecode

2
00:00:04,000 --> 00:00:06,000
Another valid subtitle
"""
        
        payload = {
            "content": srt_content,
            "fileName": "mixed.srt"
        }
        
        response = client.post("/api/v1/subtitles/import/srt", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        # 应该只有两个有效的字幕（跳过无效块）
        subtitles = data["data"]["subtitles"]
        assert len(subtitles) == 2
        assert subtitles[0]["text"] == "Valid subtitle"
        assert subtitles[1]["text"] == "Another valid subtitle"


if __name__ == "__main__":
    pytest.main([__file__])