from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Union
import logging

logger = logging.getLogger(__name__)

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
    OptimizationRequest,
    OptimizationResponse,
    OptimizationErrorCode,
)

# 导入新的路由模块
from routers import timeline, subtitles, utils, project, optimizer
from config import get_app_config, get_cors_origins, validate_config
from cache_manager import start_cache_cleanup_task

# 在 ErrorResponse 中更新 code 字段的类型
ErrorResponse.model_rebuild(force=True)


# 配置日志
app_config = get_app_config()
logging.basicConfig(level=getattr(logging, app_config["log_level"].upper()))
logger = logging.getLogger(__name__)

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
app.include_router(optimizer.router)

# CORS (Cross-Origin Resource Sharing) 中间件配置
origins = get_cors_origins()
# 添加这行日志
logger.info(f"CORS origins allowed: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 启动时验证配置
@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logger.info("应用启动中...")
    
    # 验证配置
    if not validate_config():
        logger.warning("配置验证失败，请检查环境变量")
    
    # 启动缓存清理任务
    try:
        start_cache_cleanup_task()
        logger.info("缓存清理任务已启动")
    except Exception as e:
        logger.error(f"启动缓存清理任务失败: {e}")
    
    logger.info("应用启动完成")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    logger.info("应用关闭中...")
    # 可以在这里添加清理逻辑
    logger.info("应用关闭完成")

# (Pydantic模型已移至 schemas.py)


# --- API 端点 ---


@app.get("/", include_in_schema=False)
def read_root():
    return {"message": "Welcome to the DaVinci Resolve Subtitle Extractor API!"}