from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Union

from resolve_utils import get_resolve_subtitles, set_resolve_timecode, generate_srt_content
from schemas import (
    SubtitleItem,
    SuccessResponse,
    ErrorResponse,
    TimecodeRequest,
    SubtitleExportRequest,
)

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

# (Pydantic模型已移至 schemas.py)


# --- API 端点 ---

@app.post("/api/v1/timeline/timecode",
          tags=["Timeline"],
          summary="设置DaVinci Resolve当前时间线的时间码",
          description="连接到正在运行的DaVinci Resolve实例，并设置当前活动时间线的播放头位置。")
def set_timecode(request: TimecodeRequest):
    """
    ## 功能:
    - 接收一个包含入点、出点和跳转选项的POST请求。
    - 根据 `jump_to` 参数的值（'start', 'end', 'middle'），调用 `set_resolve_timecode` 函数来在Resolve中设置时间码。

    ## 请求体:
    - **in_point (str):** 入点时间码，格式为 "HH:MM:SS:FF"。
    - **out_point (str):** 出点时间码，格式为 "HH:MM:SS:FF"。
    - **jump_to (str):** 跳转位置，可选值为 'start', 'end', 'middle'。

    ## 返回:
    - **成功 (200):** 返回成功信息。
    - **失败 (多种状态码):** 返回包含错误信息的JSON对象。
    """
    status, result = set_resolve_timecode(
        in_point=request.in_point,
        out_point=request.out_point,
        jump_to=request.jump_to.value
    )

    if status == "success":
        return {"status": "success", "message": result.get("message")}

    error_code = result.get("code", "unknown_error")
    error_message = result.get("message", "An unknown error occurred.")

    if error_code == "resolve_not_running" or error_code == "connection_error":
        raise HTTPException(status_code=503, detail={"status": "error", "message": error_message, "code": error_code})
    elif error_code == "no_project_open":
        raise HTTPException(status_code=404, detail={"status": "error", "message": error_message, "code": error_code})
    elif error_code == "no_active_timeline":
        raise HTTPException(status_code=404, detail={"status": "error", "message": error_message, "code": error_code})
    elif error_code == "set_timecode_failed":
        raise HTTPException(status_code=400, detail={"status": "error", "message": error_message, "code": error_code})
    else:
        raise HTTPException(status_code=500, detail={"status": "error", "message": error_message, "code": error_code})


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
        return {"status": "success", "frameRate": result.get("frameRate"), "data": result.get("data")}
    
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


@app.post("/api/v1/export/srt", tags=["Export"], summary="导出SRT字幕文件")
def export_subtitles_as_srt(request: SubtitleExportRequest):
    srt_content = generate_srt_content(request)
    return Response(content=srt_content, media_type="text/plain")