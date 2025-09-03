#!/usr/bin/env python3
"""
性能测试脚本：测试查找替换API的性能
测试1000条字幕的替换操作是否能在2秒内完成
"""

import time
import json
import requests
from typing import List, Dict

def generate_test_subtitles(count: int = 1000) -> List[Dict]:
    """生成测试字幕数据"""
    subtitles = []
    for i in range(count):
        subtitles.append({
            "id": i + 1,
            "startTimecode": f"00:00:{i//60:02d}:{i%60:02d}",
            "endTimecode": f"00:00:{(i+5)//60:02d}:{(i+5)%60:02d}",
            "text": f"这是第{i+1}条测试字幕，包含一些重复的内容。"
        })
    return subtitles

def test_performance():
    """执行性能测试"""
    # API 端点
    url = "http://localhost:8000/api/v1/subtitles/replace-all"
    
    # 生成测试数据
    print("正在生成1000条测试字幕数据...")
    subtitles = generate_test_subtitles(1000)
    
    # 准备请求体
    request_data = {
        "subtitles": subtitles,
        "searchQuery": "重复",
        "replaceQuery": "测试替换"
    }
    
    print("开始性能测试...")
    start_time = time.time()
    
    try:
        response = requests.post(url, json=request_data, timeout=10)
        end_time = time.time()
        
        if response.status_code == 200:
            result = response.json()
            elapsed_time = end_time - start_time
            
            print(f" 性能测试完成！")
            print(f"   处理字幕数量: {len(subtitles)} 条")
            print(f"   修改字幕数量: {len(result['data'])} 条")
            print(f"   耗时: {elapsed_time:.3f} 秒")
            print(f"   性能要求: <= 2 秒")
            print(f"   测试结果: {' 通过' if elapsed_time <= 2 else ' 失败'}")
            
            if elapsed_time > 2:
                print(f"  警告：响应时间超过2秒要求，超时 {elapsed_time - 2:.3f} 秒")
            
            return elapsed_time <= 2
        else:
            print(f" API请求失败，状态码: {response.status_code}")
            print(f"   错误信息: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print(" 请求超时！")
        return False
    except requests.exceptions.ConnectionError:
        print(" 无法连接到后端服务器！请确保后端正在运行。")
        return False
    except Exception as e:
        print(f" 测试过程中发生错误: {str(e)}")
        return False

def test_edge_cases():
    """测试边界情况"""
    url = "http://localhost:8000/api/v1/subtitles/replace-all"
    
    test_cases = [
        {
            "name": "空搜索查询",
            "data": {
                "subtitles": [{"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "测试"}],
                "searchQuery": "",
                "replaceQuery": "替换"
            },
            "expected_status": 400
        },
        {
            "name": "正则表达式特殊字符",
            "data": {
                "subtitles": [{"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "Test. with * special + characters?"}],
                "searchQuery": "Test.*",
                "replaceQuery": "Replaced"
            },
            "expected_status": 200
        },
        {
            "name": "Unicode字符",
            "data": {
                "subtitles": [{"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "你好世界，这是一个测试。"}],
                "searchQuery": "世界",
                "replaceQuery": "World"
            },
            "expected_status": 200
        },
        {
            "name": "多次出现替换",
            "data": {
                "subtitles": [{"id": 1, "startTimecode": "00:00:01:00", "endTimecode": "00:00:03:00", "text": "test test test"}],
                "searchQuery": "test",
                "replaceQuery": "exam"
            },
            "expected_status": 200
        }
    ]
    
    print("\n开始边界情况测试...")
    all_passed = True
    
    for case in test_cases:
        print(f"\n测试: {case['name']}")
        try:
            response = requests.post(url, json=case['data'], timeout=5)
            
            if response.status_code == case['expected_status']:
                print(f"    通过")
                if response.status_code == 200:
                    result = response.json()
                    print(f"   修改字幕数: {len(result['data'])}")
            else:
                print(f"    失败 - 期望状态码: {case['expected_status']}, 实际: {response.status_code}")
                if response.status_code != 200:
                    print(f"   错误信息: {response.text}")
                all_passed = False
                
        except Exception as e:
            print(f"    失败 - 异常: {str(e)}")
            all_passed = False
    
    return all_passed

if __name__ == "__main__":
    print("开始查找替换功能性能和集成测试\n")
    
    # 检查后端连接
    print("检查后端服务器连接...")
    try:
        response = requests.get("http://localhost:8000/", timeout=2)
        if response.status_code == 200:
            print(" 后端服务器连接正常\n")
        else:
            print("  后端服务器响应异常\n")
    except:
        print(" 无法连接到后端服务器，请确保后端正在运行在 http://localhost:8000\n")
        exit(1)
    
    # 执行性能测试
    performance_passed = test_performance()
    
    # 执行边界情况测试
    edge_cases_passed = test_edge_cases()
    
    # 总结
    print(f"\n 测试总结")
    print("=" * 50)
    print(f"性能测试: {' 通过' if performance_passed else ' 失败'}")
    print(f"边界情况测试: {' 通过' if edge_cases_passed else ' 失败'}")
    
    if performance_passed and edge_cases_passed:
        print("\n 所有测试通过！")
        exit(0)
    else:
        print("\n 部分测试失败，请检查上述错误信息。")
        exit(1)