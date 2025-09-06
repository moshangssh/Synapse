from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Union

from davinci_api import get_resolve_subtitles, set_resolve_timecode, export_to_davinci, get_resolve_project_info, get_subtitle_tracks
from srt_utils import generate_srt_content
from srt_parser import parse_srt_file, validate_srt_content
from text_utils import process_subtitles_for_filler_words, replace_text_in_subtitles
from exceptions import ResolveError, ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError
from schemas import (
    SubtitleItem,
    SuccessResponse,
    ErrorResponse,
    TimecodeRequest,
    SubtitleExportRequest,
    SubtitleTrackInfo,
    SubtitleTrackListResponse,
    ResolveErrorCode,
    SrtImportRequest,
    SrtImportResponse,
    RemoveFillerWordsRequest,
    RemoveFillerWordsResponse,
    ReplaceAllRequest,
    ReplaceAllResponse,
)

# 导入新的路由模块
from routers import timeline, subtitles, utils

app = FastAPI(
    title="DaVinci Resolve Subtitle Extractor API",
    description="一个用于从DaVinci Resolve提取字幕的API",
    version="1.0.0",
)

# 在 ErrorResponse 中更新 code 字段的类型
ErrorResponse.model_rebuild(force=True)

# 注册路由
app.include_router(timeline.router)
app.include_router(subtitles.router)
app.include_router(utils.router)

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


