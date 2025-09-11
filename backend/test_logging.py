#!/usr/bin/env python3
"""
测试脚本：验证新的日志功能
"""
import requests
import json
import time

def test_logging():
    """测试日志功能"""
    print("=== 开始测试新的日志功能 ===")
    
    # 测试数据
    test_data = {
        "subtitles": [
            {"id": 1, "text": "Hello world"},
            {"id": 2, "text": "This is a test"},
            {"id": 3, "text": "Another subtitle"},
            {"id": 4, "text": "More content here"},
            {"id": 5, "text": "Final subtitle"}
        ],
        "model": "gpt-3.5-turbo",
        "temperature": 0.7,
        "max_tokens": 2000,
        "batch_size": 5
    }
    
    print(f"发送请求数据: {json.dumps(test_data, indent=2)}")
    
    try:
        # 发送请求
        start_time = time.time()
        response = requests.post(
            "http://localhost:8000/api/v1/optimizer/optimize",
            headers={"Content-Type": "application/json"},
            json=test_data
        )
        end_time = time.time()
        
        print(f"请求完成，耗时: {end_time - start_time:.2f}秒")
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"响应数据: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            # 检查结果
            if result.get("status") == "success":
                print("[SUCCESS] 请求成功")
                data = result.get("data", [])
                print(f"[SUCCESS] 返回了 {len(data)} 条优化字幕")
                
                # 检查是否有错误
                metadata = result.get("metadata", {})
                errors_count = metadata.get("errors_count", 0)
                if errors_count > 0:
                    print(f"[WARNING] 有 {errors_count} 个错误")
                else:
                    print("[SUCCESS] 没有错误")
            else:
                print("[ERROR] 请求失败")
        else:
            print(f"[ERROR] HTTP错误: {response.status_code}")
            print(f"错误响应: {response.text}")
            
    except Exception as e:
        print(f"[ERROR] 请求异常: {e}")
        print(f"异常类型: {type(e).__name__}")
    
    print("=== 测试完成 ===")
    print("\n注意：请查看后端控制台输出以查看详细的日志信息")
    print("日志包括：")
    print("1. AI返回的原始内容")
    print("2. 内容格式分析")
    print("3. 解析过程详情")
    print("4. 字幕对齐过程")
    print("5. 数量匹配分析")

if __name__ == "__main__":
    test_logging()