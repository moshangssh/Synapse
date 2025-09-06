from fastapi import APIRouter, HTTPException
from typing import Union

from davinci_api import set_resolve_timecode, get_subtitle_tracks
from davinci_connector import get_current_timeline
from schemas import (
    TimecodeRequest,
    SuccessResponse,
    ErrorResponse,
    ResolveErrorCode,
    SubtitleTrackListResponse
)
from exceptions import ResolveError, ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError

router = APIRouter(
    prefix="/api/v1/timeline",
    tags=["Timeline"]
)


@router.post("/timecode",
             summary="设置DaVinci Resolve当前时间线的时间码")
def set_timecode(request: TimecodeRequest):
    try:
        resolve, project, timeline, frame_rate = get_current_timeline()
        result = set_resolve_timecode(
            project, timeline, frame_rate,
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


@router.get("/subtitle_tracks",
            response_model=Union[SubtitleTrackListResponse, ErrorResponse],
            summary="获取DaVinci Resolve时间线上所有的字幕轨道")
def get_subtitle_tracks_endpoint():
    try:
        resolve, project, timeline, frame_rate = get_current_timeline()
        tracks = get_subtitle_tracks(project, timeline)
        return {"status": "success", "data": tracks}
    except (ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError) as e:
        raise HTTPException(status_code=503, detail={"status": "error", "message": str(e)})
    except ResolveError as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})