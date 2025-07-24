from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Union

from resolve_utils import get_resolve_subtitles

app = FastAPI(
    title="DaVinci Resolve Subtitle Extractor API",
    description="一个用于从DaVinci Resolve提取字幕的API",
    version="1.0.0",
)

# CORS (Cross-Origin Resource Sharing) 中间件配置
origins = [
    "http://localhost:1420",  # Tauri应用的默认开发服务器地址
    "tauri://localhost",     # Tauri应用的生产环境地址
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic 模型定义 ---

class SubtitleItem(BaseModel):
    id: int
    startTimecode: str = Field(..., example="01:00:02:10")
    endTimecode: str = Field(..., example="01:00:05:15")
    text: str = Field(..., example="这是一条字幕。")

class SuccessResponse(BaseModel):
    status: str = "success"
    data: List[SubtitleItem]

class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    code: str

# --- API 端点 ---

@app.get("/api/v1/subtitles",
         response_model=Union[SuccessResponse, ErrorResponse],
         tags=["Subtitles"],
         summary="提取DaVinci Resolve当前时间线的字幕",
         description="连接到正在运行的DaVinci Resolve实例，并从当前活动时间线的第一个字幕轨道中，提取所有字幕条目的起始时间码、结束时间码和文本内容。")
def get_subtitles():
    """
    ## 功能:
    - 连接到 DaVinci Resolve。
    - 获取当前项目和活动时间线。
    - 从第一个字幕轨道提取所有字幕。

    ## 返回:
    - **成功 (200):** 返回包含字幕数据的JSON对象。
    - **失败 (多种状态码):** 返回包含错误信息的JSON对象。
    """
    status, result = get_resolve_subtitles()

    if status == "success":
        return {"status": "success", "data": result}
    
    # 处理来自 resolve_utils 的错误
    error_code = result.get("code", "unknown_error")
    error_message = result.get("message", "An unknown error occurred.")

    if error_code == "resolve_not_running" or error_code == "connection_error":
        raise HTTPException(status_code=503, detail={"status": "error", "message": error_message, "code": error_code})
    elif error_code == "no_project_open":
        raise HTTPException(status_code=404, detail={"status": "error", "message": error_message, "code": error_code})
    elif error_code == "no_active_timeline":
        raise HTTPException(status_code=404, detail={"status": "error", "message": error_message, "code": error_code})
    elif error_code == "dvr_script_not_found":
        raise HTTPException(status_code=500, detail={"status": "error", "message": error_message, "code": error_code})
    else:
        raise HTTPException(status_code=500, detail={"status": "error", "message": error_message, "code": error_code})

@app.get("/", include_in_schema=False)
def read_root():
    return {"message": "Welcome to the DaVinci Resolve Subtitle Extractor API!"}