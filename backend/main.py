from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Union

from davinci_api import get_resolve_subtitles, set_resolve_timecode, export_to_davinci, get_resolve_project_info, get_subtitle_tracks
from srt_utils import generate_srt_content
from schemas import (
    SubtitleItem,
    SuccessResponse,
    ErrorResponse,
    TimecodeRequest,
    SubtitleExportRequest,
    SubtitleTrackInfo,
    SubtitleTrackListResponse,
    ResolveErrorCode,
)

# 在 ErrorResponse 中更新 code 字段的类型
ErrorResponse.model_rebuild(force=True)


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


# --- 错误处理 ---

def handle_error(error_code: Union[ResolveErrorCode, str], error_message: str):
    """根据错误代码，抛出相应的HTTPException。"""
    if error_code in [ResolveErrorCode.RESOLVE_NOT_RUNNING, ResolveErrorCode.CONNECTION_ERROR]:
        raise HTTPException(status_code=503, detail={"status": "error", "message": error_message, "code": error_code})
    elif error_code in [ResolveErrorCode.NO_PROJECT_OPEN, ResolveErrorCode.NO_ACTIVE_TIMELINE]:
        raise HTTPException(status_code=404, detail={"status": "error", "message": error_message, "code": error_code})
    elif error_code in [ResolveErrorCode.GET_INFO_FAILED, ResolveErrorCode.CREATE_TRACK_FAILED]:
        raise HTTPException(status_code=500, detail={"status": "error", "message": error_message, "code": error_code})
    # For other string-based error codes that are not part of the enum yet
    elif isinstance(error_code, str):
        if error_code == "set_timecode_failed":
            raise HTTPException(status_code=400, detail={"status": "error", "message": error_message, "code": error_code})
        elif error_code == "dvr_script_not_found":
            raise HTTPException(status_code=500, detail={"status": "error", "message": error_message, "code": error_code})
        else: # Default for other string codes
            raise HTTPException(status_code=500, detail={"status": "error", "message": error_message, "code": error_code})
    else: # Default for any other case
        raise HTTPException(status_code=500, detail={"status": "error", "message": error_message, "code": str(error_code)})


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
    handle_error(error_code, error_message)


@app.get("/api/v1/timeline/subtitle_tracks",
          response_model=Union[SubtitleTrackListResponse, ErrorResponse],
          tags=["Timeline"],
          summary="获取DaVinci Resolve时间线上所有的字幕轨道",
          description="连接到正在运行的DaVinci Resolve实例，并返回当前活动时间线上所有字幕轨道的列表，包含轨道索引和名称。")
def get_subtitle_tracks_endpoint():
    """
    ## 功能:
    - 连接到 DaVinci Resolve。
    - 获取当前活动时间线。
    - 遍历并返回所有字幕轨道的索引和名称。

    ## 返回:
    - **成功 (200):** 返回包含字幕轨道列表的JSON对象。
    - **失败 (多种状态码):** 返回包含错误信息的JSON对象。
    """
    status, result = get_subtitle_tracks()

    if status == "success":
        return {"status": "success", "data": result.get("data")}

    error_code = result.get("code", "unknown_error")
    error_message = result.get("message", "An unknown error occurred.")
    handle_error(error_code, error_message)


@app.get("/api/v1/subtitles",
         response_model=Union[SuccessResponse, ErrorResponse],
         tags=["Subtitles"],
         summary="提取DaVinci Resolve当前时间线的字幕",
         description="连接到正在运行的DaVinci Resolve实例，并从当前活动时间线的指定字幕轨道中，提取所有字幕条目的起始时间码、结束时间码和文本内容。")
def get_subtitles(track_index: int = 1):
    """
    ## 功能:
    - 连接到 DaVinci Resolve。
    - 获取当前项目和活动时间线。
    - 从指定字幕轨道提取所有字幕。

    ## 查询参数:
    - **track_index (int):** 要提取字幕的轨道索引，默认为 1。

    ## 返回:
    - **成功 (200):** 返回包含字幕数据的JSON对象。
    - **失败 (多种状态码):** 返回包含错误信息的JSON对象。
    """
    status, result = get_resolve_subtitles(track_index=track_index)

    if status == "success":
        return {"status": "success", "frameRate": result.get("frameRate"), "data": result.get("data")}
    
    # 处理来自 resolve_utils 的错误
    error_code = result.get("code", "unknown_error")
    error_message = result.get("message", "An unknown error occurred.")
    handle_error(error_code, error_message)


@app.get("/api/v1/project-info",
         tags=["Project"],
         summary="获取DaVinci Resolve当前项目和时间线信息",
         description="连接到正在运行的DaVinci Resolve实例，并获取当前项目和时间线的名称。")
def get_project_info():
    """
    ## 功能:
    - 连接到 DaVinci Resolve。
    - 获取当前项目名称和活动时间线名称。

    ## 返回:
    - **成功 (200):** 返回包含项目和时间线名称的JSON对象。
    - **失败 (多种状态码):** 返回包含错误信息的JSON对象。
    """
    status, result = get_resolve_project_info()

    if status == "success":
        return {"status": "success", "data": result}
    
    error_code = result.get("code", "unknown_error")
    error_message = result.get("message", "An unknown error occurred.")
    handle_error(error_code, error_message)


@app.get("/", include_in_schema=False)
def read_root():
    return {"message": "Welcome to the DaVinci Resolve Subtitle Extractor API!"}


@app.post("/api/v1/export/srt", tags=["Export"], summary="导出SRT字幕文件")
def export_subtitles_as_srt(request: SubtitleExportRequest):
    srt_content = generate_srt_content(request)
    return Response(content=srt_content, media_type="text/plain")


@app.post("/api/v1/export/davinci", tags=["Export"], summary="直接导出字幕到DaVinci Resolve时间线")
def export_subtitles_to_davinci(request: SubtitleExportRequest):
    """
    ## 功能:
    - 接收包含字幕数据的POST请求。
    - 调用 `export_to_davinci` 函数，该函数会：
        1. 生成一个临时的SRT文件。
        2. 将该文件导入到DaVinci Resolve的媒体池中。
        3. 将导入的字幕媒体项附加到当前时间线。
        4. 清理临时文件。

    ## 请求体:
    - **frameRate (float):** 时间线的帧率。
    - **subtitles (List[SubtitleItem]):** 包含字幕条目的列表。

    ## 返回:
    - **成功 (200):** 返回成功信息。
    - **失败 (多种状态码):** 返回包含错误信息的JSON对象。
    """
    status, result = export_to_davinci(request)

    if status == "success":
        return {"status": "success", "message": result.get("message")}

    error_code = result.get("code", "unknown_error")
    error_message = result.get("message", "An unknown error occurred.")
    handle_error(error_code, error_message)