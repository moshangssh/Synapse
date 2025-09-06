from fastapi import APIRouter, HTTPException
from typing import Union

from davinci_api import get_resolve_project_info
from davinci_connector import get_current_timeline
from schemas import (
    SuccessResponse,
    ErrorResponse,
    ResolveErrorCode
)
from exceptions import ResolveError, ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError

router = APIRouter(
    prefix="/api/v1",
    tags=["Project"]
)


@router.get("/project-info",
         summary="获取DaVinci Resolve当前项目和时间线信息")
def get_project_info():
    try:
        resolve, project, timeline, frame_rate = get_current_timeline()
        info = get_resolve_project_info(project, timeline)
        return {"status": "success", "data": info}
    except (ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError) as e:
        raise HTTPException(status_code=503, detail={"status": "error", "message": str(e)})
    except ResolveError as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})