#!/usr/bin/env python3
"""
启动后端服务器的脚本
"""

import uvicorn
import sys
import os

# 将当前目录添加到Python路径中
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # 导入应用
    from main import app
    
    # 启动服务器
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )