import pytest
import json
import os
from unittest.mock import patch, mock_open
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# 测试数据
TEST_SUBTITLES = [
    {
        "id": 1,
        "startTimecode": "00:00:01:00",
        "endTimecode": "00:00:05:00",
        "text": "嗯，这是一个测试字幕，啊！"
    },
    {
        "id": 2,
        "startTimecode": "00:00:06:00",
        "endTimecode": "00:00:10:00",
        "text": "这是一本《好书》，哦，大家快来看吧。"
    }
]

# 测试配置数据
TEST_CONFIG = {
    "words": ["嗯", "啊", "哦", "呢", "吧", "啦"],
    "preserved_punctuation": ["《", "》", "“", "”"]
}

class TestFillerWordsAPI:
    """测试去口水词API端点"""
    
    @patch('text_utils.load_filler_words_config')
    def test_remove_filler_words_basic(self, mock_load_config):
        """测试基本的水口词移除功能"""
        mock_load_config.return_value = TEST_CONFIG
        
        response = client.post(
            "/api/v1/subtitles/remove-filler-words",
            json={
                "subtitles": TEST_SUBTITLES,
                "removePunctuation": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        processed_subtitles = data["data"]
        # 检查口水词被移除
        assert processed_subtitles[0]["text"] == "，这是一个测试字幕，！"
        assert processed_subtitles[1]["text"] == "这是一本《好书》，，大家快来看。"
    
    @patch('text_utils.load_filler_words_config')
    def test_remove_filler_words_with_punctuation(self, mock_load_config):
        """测试移除口水词和标点符号的功能"""
        mock_load_config.return_value = TEST_CONFIG
        
        response = client.post(
            "/api/v1/subtitles/remove-filler-words",
            json={
                "subtitles": TEST_SUBTITLES,
                "removePunctuation": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        processed_subtitles = data["data"]
        # 检查口水词被移除，标点符号也被移除（保留的除外）
        assert processed_subtitles[0]["text"] == "这是一个测试字幕"
        assert processed_subtitles[1]["text"] == "这是一本《好书》大家快来看"
    
    @patch('text_utils.load_filler_words_config')
    def test_remove_filler_words_no_changes(self, mock_load_config):
        """测试没有口水词需要移除的情况"""
        mock_load_config.return_value = TEST_CONFIG
        
        # 创建没有口水词的字幕
        clean_subtitles = [
            {
                "id": 1,
                "startTimecode": "00:00:01:00",
                "endTimecode": "00:00:05:00",
                "text": "这是一个干净的字幕"
            }
        ]
        
        response = client.post(
            "/api/v1/subtitles/remove-filler-words",
            json={
                "subtitles": clean_subtitles,
                "removePunctuation": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        processed_subtitles = data["data"]
        # 检查字幕没有变化
        assert processed_subtitles[0]["text"] == "这是一个干净的字幕"
    
    @patch('text_utils.load_filler_words_config')
    def test_remove_filler_words_empty_subtitles(self, mock_load_config):
        """测试空字幕列表的情况"""
        mock_load_config.return_value = TEST_CONFIG
        
        response = client.post(
            "/api/v1/subtitles/remove-filler-words",
            json={
                "subtitles": [],
                "removePunctuation": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["data"] == []
    
    def test_remove_filler_words_invalid_request(self):
        """测试无效请求的情况"""
        # 缺少必需字段
        response = client.post(
            "/api/v1/subtitles/remove-filler-words",
            json={
                "subtitles": TEST_SUBTITLES
                # 缺少 removePunctuation 字段
            }
        )
        
        assert response.status_code == 422  # Validation error
    
    @patch('text_utils.load_filler_words_config')
    def test_preserved_punctuation_works(self, mock_load_config):
        """测试保留标点符号功能正常工作"""
        test_config = {
            "words": ["嗯", "啊"],
            "preserved_punctuation": ["《", "》"]
        }
        mock_load_config.return_value = test_config
        
        test_subtitle = [
            {
                "id": 1,
                "startTimecode": "00:00:01:00",
                "endTimecode": "00:00:05:00",
                "text": "嗯，这是一本《好书》，啊！"
            }
        ]
        
        response = client.post(
            "/api/v1/subtitles/remove-filler-words",
            json={
                "subtitles": test_subtitle,
                "removePunctuation": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        processed_subtitles = data["data"]
        
        # 检查《》被保留，但其他标点符号被移除
        assert "《好书》" in processed_subtitles[0]["text"]
        assert "，" not in processed_subtitles[0]["text"]
        assert "！" not in processed_subtitles[0]["text"]

class TestTextUtils:
    """测试文本工具函数"""
    
    def test_remove_filler_words_from_text(self):
        """测试从文本中移除口水词"""
        from text_utils import remove_filler_words_from_text
        
        filler_words = ["嗯", "啊", "哦"]
        text = "嗯，这是一个测试啊！"
        
        result = remove_filler_words_from_text(text, filler_words, False)
        assert result == "，这是一个测试！"
    
    def test_remove_filler_words_with_punctuation_removal(self):
        """测试移除口水词和标点符号"""
        from text_utils import remove_filler_words_from_text
        
        filler_words = ["嗯", "啊"]
        preserved_punctuation = ["《", "》"]
        text = "嗯，这是一本《好书》啊！"
        
        result = remove_filler_words_from_text(text, filler_words, True, preserved_punctuation)
        assert result == "这是一本《好书》"
    
    def test_remove_filler_words_from_text_no_filler_words(self):
        """测试没有口水词的文本"""
        from text_utils import remove_filler_words_from_text
        
        filler_words = ["嗯", "啊"]
        text = "这是干净的文本"
        
        result = remove_filler_words_from_text(text, filler_words, False)
        assert result == "这是干净的文本"
    
    def test_remove_filler_words_multiple_spaces(self):
        """测试多个空格的处理"""
        from text_utils import remove_filler_words_from_text
        
        filler_words = ["嗯", "啊"]
        text = "嗯     啊     测试"
        
        result = remove_filler_words_from_text(text, filler_words, False)
        assert result == "测试"
    
    @patch('builtins.open', new_callable=mock_open, read_data='{"words": ["嗯"], "preserved_punctuation": ["《", "》"]}')
    def test_load_filler_words_config(self, mock_file):
        """测试加载配置文件"""
        from text_utils import load_filler_words_config
        
        config = load_filler_words_config()
        assert config["words"] == ["嗯"]
        assert config["preserved_punctuation"] == ["《", "》"]
    
    @patch('builtins.open', side_effect=FileNotFoundError)
    def test_load_filler_words_config_file_not_found(self, mock_file):
        """测试配置文件不存在时的默认配置"""
        from text_utils import load_filler_words_config
        
        config = load_filler_words_config()
        assert "words" in config
        assert "preserved_punctuation" in config
        assert len(config["words"]) > 0
    
    @patch('builtins.open', new_callable=mock_open, read_data='invalid json')
    def test_load_filler_words_config_invalid_json(self, mock_file):
        """测试配置文件格式错误时的默认配置"""
        from text_utils import load_filler_words_config
        
        config = load_filler_words_config()
        assert "words" in config
        assert "preserved_punctuation" in config
    
    def test_process_subtitles_for_filler_words(self):
        """测试处理字幕列表功能"""
        from text_utils import process_subtitles_for_filler_words
        from text_utils import SubtitleItem
        
        subtitles = [
            SubtitleItem(
                id=1,
                startTimecode="00:00:01:00",
                endTimecode="00:00:05:00",
                text="嗯，测试字幕啊！"
            )
        ]
        
        with patch('text_utils.load_filler_words_config') as mock_load:
            mock_load.return_value = {"words": ["嗯", "啊"], "preserved_punctuation": []}
            
            result = process_subtitles_for_filler_words(subtitles, False)
            
            assert len(result) == 1
            assert result[0].text == "，测试字幕！"
            assert result[0].id == 1