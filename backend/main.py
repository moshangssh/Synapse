from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Union

from davinci_api import get_resolve_subtitles, set_resolve_timecode, export_to_davinci, get_resolve_project_info, get_subtitle_tracks
from srt_utils import generate_srt_content
from srt_parser import parse_srt_file, validate_srt_content
from text_utils import process_subtitles_for_filler_words, replace_text_in_subtitles, calculate_text_diff
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
    DiffRequest,
    DiffResponse,
)

# 导入新的路由模块
from routers import timeline, subtitles, utils, project

# 在 ErrorResponse 中更新 code 字段的类型
ErrorResponse.model_rebuild(force=True)


app = FastAPI(
    title="DaVinci Resolve Subtitle Extractor API",
    description="一个用于从DaVinci Resolve提取字幕的API",
    version="1.0.0",
)

# 注册路由
app.include_router(timeline.router)
app.include_router(subtitles.router)
app.include_router(utils.router)
app.include_router(project.router)

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


@app.get("/", include_in_schema=False)
def read_root():
    return {"message": "Welcome to the DaVinci Resolve Subtitle Extractor API!"}