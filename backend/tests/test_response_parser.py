import pytest
import json
from response_parser import ResponseParser
from schemas import SimpleSubtitleItem


class TestResponseParser:
    """响应解析器测试"""
    
    def setup_method(self):
        """设置测试环境"""
        self.parser = ResponseParser()
    
    def test_parse_valid_json(self):
        """测试解析有效的JSON"""
        response_content = '''
        [
            {"id": 1, "optimized_text": "优化后的字幕1"},
            {"id": 2, "optimized_text": "优化后的字幕2"}
        ]
        '''
        
        original_subtitles = [
            SimpleSubtitleItem(id=1, text="原始字幕1"),
            SimpleSubtitleItem(id=2, text="原始字幕2")
        ]
        
        result = self.parser.parse_llm_response(response_content, original_subtitles)
        
        assert result.success is True
        assert result.data is not None
        assert len(result.data) == 2
        assert result.data[0]["id"] == 1
        assert result.data[0]["optimized_text"] == "优化后的字幕1"
        assert result.data[1]["id"] == 2
        assert result.data[1]["optimized_text"] == "优化后的字幕2"
    
    def test_parse_dirty_json_with_partial_valid_objects(self):
        """测试解析脏JSON - 包含部分有效对象"""
        response_content = '''
        这里有一些乱七八糟的文本
        [有{"id": 1, "optimized_text": "优化后的字幕1"}其他字符
        还有一些废话{"id": 2, "optimized_text": "优化后的字幕2"}更多内容
        {"id": 3, "optimized_text": "优化后的字幕3"}  这是完整对象
        '''
        
        original_subtitles = [
            SimpleSubtitleItem(id=1, text="原始字幕1"),
            SimpleSubtitleItem(id=2, text="原始字幕2"),
            SimpleSubtitleItem(id=3, text="原始字幕3")
        ]
        
        result = self.parser.parse_llm_response(response_content, original_subtitles)
        
        assert result.success is True
        assert result.data is not None
        assert len(result.data) == 3
        
        # 验证所有有效对象都被提取出来了
        found_ids = {item["id"] for item in result.data}
        assert 1 in found_ids
        assert 2 in found_ids
        assert 3 in found_ids
        
        # 验证优化文本
        id_to_text = {item["id"]: item["optimized_text"] for item in result.data}
        assert id_to_text[1] == "优化后的字幕1"
        assert id_to_text[2] == "优化后的字幕2"
        assert id_to_text[3] == "优化后的字幕3"
        
        # 验证有备用解析警告
        assert any("从原始文本中提取" in warning for warning in result.warnings)
    
    def test_parse_dirty_json_mixed_valid_and_invalid(self):
        """测试解析脏JSON - 混合有效和无效对象"""
        response_content = '''
        一些前导文本
        [{"id": 1, "optimized_text": "优化后的字幕1"}, 这是完整的
        {"id": 2, "optimized_text": 优化后的字幕2" 缺失引号
        {"id": 3, "optimized_text": "优化后的字幕3"}, 这个也完整
        {id: 4, "optimized_text": "优化后的字幕4"} 这个缺少引号但格式正确
        ]
        '''
        
        original_subtitles = [
            SimpleSubtitleItem(id=1, text="原始字幕1"),
            SimpleSubtitleItem(id=2, text="原始字幕2"),
            SimpleSubtitleItem(id=3, text="原始字幕3"),
            SimpleSubtitleItem(id=4, text="原始字幕4")
        ]
        
        result = self.parser.parse_llm_response(response_content, original_subtitles)
        
        assert result.success is True
        assert result.data is not None
        
        # 应该能解析出3个有效对象（ID 1, 3, 4）
        found_ids = {item["id"] for item in result.data}
        assert 1 in found_ids
        assert 3 in found_ids
        assert 4 in found_ids
        assert 2 not in found_ids  # ID 2的对象格式错误
        
        # 验证提取的内容
        id_to_text = {item["id"]: item["optimized_text"] for item in result.data}
        assert id_to_text[1] == "优化后的字幕1"
        assert id_to_text[3] == "优化后的字幕3"
        assert id_to_text[4] == "优化后的字幕4"
        
        # 应该有备用解析警告
        assert len(result.warnings) > 0
        assert any("从原始文本中提取" in warning for warning in result.warnings)
    
    def test_parse_dirty_json_with_arrays_and_objects(self):
        """测试解析脏JSON - 混合数组和对象"""
        response_content = '''
        文本开始
        [
            {"id": 1, "optimized_text": "优化后的字幕1"}
        ]
        这里有一些废话
        {"id": 2, "optimized_text": "优化后的字幕2"}
        还有更多内容[
            {"id": 3, "optimized_text": "优化后的字幕3"}
        ]
        结束
        '''
        
        original_subtitles = [
            SimpleSubtitleItem(id=1, text="原始字幕1"),
            SimpleSubtitleItem(id=2, text="原始字幕2"),
            SimpleSubtitleItem(id=3, text="原始字幕3")
        ]
        
        result = self.parser.parse_llm_response(response_content, original_subtitles)
        
        assert result.success is True
        assert result.data is not None
        
        # 应该能解析出所有3个对象
        found_ids = {item["id"] for item in result.data}
        assert 1 in found_ids
        assert 2 in found_ids
        assert 3 in found_ids
        
        # 验证提取的内容
        id_to_text = {item["id"]: item["optimized_text"] for item in result.data}
        assert id_to_text[1] == "优化后的字幕1"
        assert id_to_text[2] == "优化后的字幕2"
        assert id_to_text[3] == "优化后的字幕3"
        
        # 应该有备用解析警告
        assert len(result.warnings) > 0
    
    def test_parse_completely_broken_json(self):
        """测试解析完全损坏的JSON"""
        response_content = '''
        这里完全没有任何有效的JSON格式
        只是一些普通的文本内容
        没有花括号也没有方括号
        就是这样而已
        '''
        
        original_subtitles = [
            SimpleSubtitleItem(id=1, text="原始字幕1")
        ]
        
        result = self.parser.parse_llm_response(response_content, original_subtitles)
        
        # 应该解析失败
        assert result.success is False
        assert result.data is None
        assert "无法解析响应格式" in result.error
        assert "将使用原始文本" in str(result.warnings)
    
    def test_parse_json_with_repair_needed(self):
        """测试需要修复的JSON"""
        response_content = '''
        [
            {"id": 1, "optimized_text": "优化后的字幕1",},
            {"id": 2, "optimized_text": "优化后的字幕2" 缺失闭合括号
            {"id": 3, "optimized_text": "优化后的字幕3"}
        ]
        '''
        
        original_subtitles = [
            SimpleSubtitleItem(id=1, text="原始字幕1"),
            SimpleSubtitleItem(id=2, text="原始字幕2"),
            SimpleSubtitleItem(id=3, text="原始字幕3")
        ]
        
        result = self.parser.parse_llm_response(response_content, original_subtitles)
        
        # 应该通过修复成功解析
        assert result.success is True
        assert result.data is not None
        
        # 可能只解析出2个对象（第2个对象格式错误）
        found_ids = {item["id"] for item in result.data}
        assert 1 in found_ids
        assert 3 in found_ids
        
        # 应该有修复警告
        assert any("json_repair" in warning for warning in result.warnings)
    
    def test_parse_empty_response(self):
        """测试解析空响应"""
        result = self.parser.parse_llm_response("", [])
        
        assert result.success is False
        assert "响应内容为空" in result.error
    
    def test_parse_response_with_missing_ids(self):
        """测试解析包含不存在ID的响应"""
        response_content = '''
        [
            {"id": 1, "optimized_text": "优化后的字幕1"},
            {"id": 999, "optimized_text": "不存在的字幕"},
            {"id": 3, "optimized_text": "优化后的字幕3"}
        ]
        '''
        
        original_subtitles = [
            SimpleSubtitleItem(id=1, text="原始字幕1"),
            SimpleSubtitleItem(id=3, text="原始字幕3")
        ]
        
        result = self.parser.parse_llm_response(response_content, original_subtitles)
        
        # 应该解析成功，但会跳过不存在的ID
        assert result.success is True
        assert result.data is not None
        
        found_ids = {item["id"] for item in result.data}
        assert 1 in found_ids
        assert 3 in found_ids
        assert 999 not in found_ids
        
        # 应该有关于缺失ID的警告
        assert any("未找到ID为" in warning for warning in result.warnings)
    
    def test_extract_individual_json_objects_from_large_dirty_response(self):
        """测试从大段脏文本中提取独立JSON对象"""
        response_content = '''
        开始处理字幕列表...
        
        用户要求优化以下字幕：
        
        字幕1: "这是一个测试字幕"
        字幕2: "这是另一个测试字幕"
        字幕3: "这是第三个测试字幕"
        
        优化结果：
        
        {"id": 1, "optimized_text": "优化后的字幕1"}这是第一个优化结果
        还有一些说明文字
        {"id": 2, "optimized_text": "优化后的字幕2"}第二个优化完成
        系统生成了更多的分析报告
        {"id": 3, "optimized_text": "优化后的字幕3"}最后的优化
        任务完成！
        '''
        
        original_subtitles = [
            SimpleSubtitleItem(id=1, text="这是一个测试字幕"),
            SimpleSubtitleItem(id=2, text="这是另一个测试字幕"),
            SimpleSubtitleItem(id=3, text="这是第三个测试字幕")
        ]
        
        result = self.parser.parse_llm_response(response_content, original_subtitles)
        
        assert result.success is True
        assert result.data is not None
        assert len(result.data) == 3
        
        # 验证所有对象都被正确提取
        found_ids = {item["id"] for item in result.data}
        assert 1 in found_ids
        assert 2 in found_ids
        assert 3 in found_ids
        
        # 验证优化文本
        id_to_text = {item["id"]: item["optimized_text"] for item in result.data}
        assert id_to_text[1] == "优化后的字幕1"
        assert id_to_text[2] == "优化后的字幕2"
        assert id_to_text[3] == "优化后的字幕3"
        
        # 应该有从脏文本中提取的警告
        assert len(result.warnings) > 0
        assert any("从原始文本中提取" in warning for warning in result.warnings)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])