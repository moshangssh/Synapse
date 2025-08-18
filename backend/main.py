from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Union

from davinci_api import get_resolve_subtitles, set_resolve_timecode, export_to_davinci, get_resolve_project_info, get_subtitle_tracks
from srt_utils import generate_srt_content
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
          summary="设置DaVinci Resolve当前时间线的时间码")
def set_timecode(request: TimecodeRequest):
    try:
        result = set_resolve_timecode(
            in_point=request.in_point,
            out_point=request.out_point,
            jump_to=request.jump_to.value
        )
        return {"status": "success", "message": result.get("message")}
    except (ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError) as e:
        raise HTTPException(status_code=503, detail={"status": "error", "message": str(e)})
    except ResolveError as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": f"An unexpected error occurred: {e}"})


@app.get("/api/v1/timeline/subtitle_tracks",
          response_model=Union[SubtitleTrackListResponse, ErrorResponse],
          tags=["Timeline"],
          summary="获取DaVinci Resolve时间线上所有的字幕轨道")
def get_subtitle_tracks_endpoint():
    try:
        tracks = get_subtitle_tracks()
        return {"status": "success", "data": tracks}
    except (ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError) as e:
        raise HTTPException(status_code=503, detail={"status": "error", "message": str(e)})
    except ResolveError as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@app.get("/api/v1/subtitles",
         response_model=Union[SuccessResponse, ErrorResponse],
         tags=["Subtitles"],
         summary="提取DaVinci Resolve当前时间线的字幕")
def get_subtitles(track_index: int = 1):
    try:
        result = get_resolve_subtitles(track_index=track_index)
        return {"status": "success", "frameRate": result.get("frameRate"), "data": result.get("data")}
    except (ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError) as e:
        raise HTTPException(status_code=503, detail={"status": "error", "message": str(e)})
    except ResolveError as e:
        raise HTTPException(status_code=400, detail={"status": "error", "message": str(e)}) # 400 for bad track index
    except Exception as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": f"An unexpected error occurred: {e}"})


@app.get("/api/v1/project-info",
         tags=["Project"],
         summary="获取DaVinci Resolve当前项目和时间线信息")
def get_project_info():
    try:
        info = get_resolve_project_info()
        return {"status": "success", "data": info}
    except (ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError) as e:
        raise HTTPException(status_code=503, detail={"status": "error", "message": str(e)})
    except ResolveError as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@app.get("/", include_in_schema=False)
def read_root():
    return {"message": "Welcome to the DaVinci Resolve Subtitle Extractor API!"}


@app.post("/api/v1/export/srt", tags=["Export"], summary="导出SRT字幕文件")
def export_subtitles_as_srt(request: SubtitleExportRequest):
    srt_content = generate_srt_content(request)
    return Response(content=srt_content, media_type="text/plain")


@app.post("/api/v1/export/davinci", tags=["Export"], summary="直接导出字幕到DaVinci Resolve时间线")
def export_subtitles_to_davinci(request: SubtitleExportRequest):
    try:
        result = export_to_davinci(request)
        return {"status": "success", "message": result.get("message")}
    except (ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError) as e:
        raise HTTPException(status_code=503, detail={"status": "error", "message": str(e)})
    except ResolveError as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": f"An unexpected error occurred: {e}"})