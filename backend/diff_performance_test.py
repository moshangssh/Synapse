#!/usr/bin/env python3
"""
性能测试脚本：测试Diff API的性能
测试不同长度文本的差异计算性能
"""

import time
import json
import requests
from typing import List, Dict

def generate_test_texts() -> List[Dict]:
    """生成测试文本数据"""
    test_cases = [
        {
            "name": "短文本",
            "original": "Hello World",
            "new": "Hello Universe"
        },
        {
            "name": "中等文本",
            "original": "The quick brown fox jumps over the lazy dog. " * 10,
            "new": "The fast brown fox leaps over the sleepy cat. " * 10
        },
        {
            "name": "长文本",
            "original": "这是一个测试文本，包含多个重复的句子。" * 100,
            "new": "这是一个测试文本，包含多个修改的句子。" * 100
        },
        {
            "name": "超长文本",
            "original": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 500,
            "new": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 500
        },
        {
            "name": "Unicode混合文本",
            "original": "你好世界Hello Worldこんにちは世界" * 50,
            "new": "你好UniverseこんにちはWorld" * 50
        }
    ]
    return test_cases

def test_diff_performance():
    """测试Diff API性能"""
    url = "http://localhost:8000/api/v1/utils/diff"
    
    test_cases = generate_test_texts()
    results = []
    
    print("开始Diff API性能测试...")
    
    for case in test_cases:
        print(f"\n测试: {case['name']}")
        print(f"  原始文本长度: {len(case['original'])} 字符")
        print(f"  新文本长度: {len(case['new'])} 字符")
        
        request_data = {
            "original_text": case["original"],
            "new_text": case["new"]
        }
        
        # 执行多次测试取平均值
        times = []
        for i in range(5):
            try:
                start_time = time.time()
                response = requests.post(url, json=request_data, timeout=10)
                end_time = time.time()
                
                if response.status_code == 200:
                    elapsed_time = end_time - start_time
                    times.append(elapsed_time)
                    
                    result = response.json()
                    diff_parts = len(result['data'])
                    
                    if i == 0:  # 只在第一次显示详细信息
                        print(f"    差异部分数量: {diff_parts}")
                else:
                    print(f"    请求失败，状态码: {response.status_code}")
                    break
                    
            except requests.exceptions.Timeout:
                print("    请求超时！")
                break
            except Exception as e:
                print(f"    请求异常: {str(e)}")
                break
        
        if times:
            avg_time = sum(times) / len(times)
            max_time = max(times)
            min_time = min(times)
            
            print(f"  平均响应时间: {avg_time:.4f} 秒")
            print(f"  最快响应时间: {min_time:.4f} 秒")
            print(f"  最慢响应时间: {max_time:.4f} 秒")
            
            # 性能标准：大多数文本应该在100ms内完成
            passed = avg_time <= 0.1
            print(f"  性能标准: <= 0.1 秒")
            print(f"  测试结果: {' 通过' if passed else ' 失败'}")
            
            results.append({
                "name": case["name"],
                "original_length": len(case["original"]),
                "new_length": len(case["new"]),
                "avg_time": avg_time,
                "passed": passed
            })
        else:
            results.append({
                "name": case["name"],
                "original_length": len(case["original"]),
                "new_length": len(case["new"]),
                "avg_time": None,
                "passed": False
            })
    
    return results

def test_edge_cases():
    """测试边界情况"""
    url = "http://localhost:8000/api/v1/utils/diff"
    
    test_cases = [
        {
            "name": "空字符串",
            "data": {
                "original_text": "",
                "new_text": ""
            },
            "expected_status": 200
        },
        {
            "name": "从空到有内容",
            "data": {
                "original_text": "",
                "new_text": "Hello World"
            },
            "expected_status": 200
        },
        {
            "name": "从有内容到空",
            "data": {
                "original_text": "Hello World",
                "new_text": ""
            },
            "expected_status": 200
        },
        {
            "name": "完全相同",
            "data": {
                "original_text": "Hello World",
                "new_text": "Hello World"
            },
            "expected_status": 200
        },
        {
            "name": "只有标点符号差异",
            "data": {
                "original_text": "Hello, World!",
                "new_text": "Hello World."
            },
            "expected_status": 200
        },
        {
            "name": "特殊字符",
            "data": {
                "original_text": "Special chars: @#$%^&*()",
                "new_text": "Special chars: !@#$%^&*()"
            },
            "expected_status": 200
        },
        {
            "name": "缺少original_text字段",
            "data": {
                "new_text": "Hello World"
            },
            "expected_status": 422
        },
        {
            "name": "缺少new_text字段",
            "data": {
                "original_text": "Hello World"
            },
            "expected_status": 422
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
                    print(f"    差异部分数量: {len(result['data'])}")
            else:
                print(f"    失败 - 期望状态码: {case['expected_status']}, 实际: {response.status_code}")
                if response.status_code != 200:
                    print(f"    错误信息: {response.text}")
                all_passed = False
                
        except Exception as e:
            print(f"    失败 - 异常: {str(e)}")
            all_passed = False
    
    return all_passed

def test_concurrent_requests():
    """测试并发请求"""
    import threading
    import queue
    
    url = "http://localhost:8000/api/v1/utils/diff"
    request_data = {
        "original_text": "Hello World",
        "new_text": "Hello Universe"
    }
    
    print("\n开始并发请求测试...")
    
    results = queue.Queue()
    errors = []
    
    def make_request():
        try:
            start_time = time.time()
            response = requests.post(url, json=request_data, timeout=10)
            end_time = time.time()
            
            if response.status_code == 200:
                results.put(end_time - start_time)
            else:
                errors.append(f"状态码: {response.status_code}")
        except Exception as e:
            errors.append(str(e))
    
    # 创建10个并发请求
    threads = []
    for _ in range(10):
        thread = threading.Thread(target=make_request)
        threads.append(thread)
        thread.start()
    
    # 等待所有线程完成
    for thread in threads:
        thread.join()
    
    # 分析结果
    successful_requests = results.qsize()
    total_errors = len(errors)
    
    print(f"  成功请求数: {successful_requests}")
    print(f"  失败请求数: {total_errors}")
    
    if successful_requests > 0:
        times = []
        while not results.empty():
            times.append(results.get())
        
        avg_time = sum(times) / len(times)
        max_time = max(times)
        min_time = min(times)
        
        print(f"  平均响应时间: {avg_time:.4f} 秒")
        print(f"  最快响应时间: {min_time:.4f} 秒")
        print(f"  最慢响应时间: {max_time:.4f} 秒")
    
    if errors:
        print(f"  错误信息: {errors[:3]}")  # 只显示前3个错误
    
    return successful_requests == 10 and total_errors == 0

if __name__ == "__main__":
    print("开始Diff API性能和集成测试\n")
    
    # 检查后端连接
    print("检查后端服务器连接...")
    try:
        response = requests.get("http://localhost:8000/", timeout=2)
        if response.status_code == 200:
            print(" 后端服务器连接正常\n")
        else:
            print(" 后端服务器响应异常\n")
    except:
        print(" 无法连接到后端服务器，请确保后端正在运行在 http://localhost:8000\n")
        exit(1)
    
    # 执行性能测试
    performance_results = test_diff_performance()
    
    # 执行边界情况测试
    edge_cases_passed = test_edge_cases()
    
    # 执行并发请求测试
    concurrent_passed = test_concurrent_requests()
    
    # 总结
    print(f"\n 测试总结")
    print("=" * 50)
    
    performance_passed = all(result["passed"] for result in performance_results if result["avg_time"] is not None)
    print(f"性能测试: {' 通过' if performance_passed else ' 失败'}")
    print(f"边界情况测试: {' 通过' if edge_cases_passed else ' 失败'}")
    print(f"并发请求测试: {' 通过' if concurrent_passed else ' 失败'}")
    
    # 详细性能报告
    print(f"\n 详细性能报告:")
    print("-" * 50)
    for result in performance_results:
        status = "通过" if result["passed"] else "失败"
        avg_time = result["avg_time"]
        time_str = f"{avg_time:.4f}秒" if avg_time is not None else "N/A"
        print(f"  {result['name']}: {time_str} - {status}")
    
    if performance_passed and edge_cases_passed and concurrent_passed:
        print("\n 所有测试通过！")
        exit(0)
    else:
        print("\n 部分测试失败，请检查上述错误信息。")
        exit(1)