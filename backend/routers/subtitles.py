import logging

from fastapi import APIRouter, HTTPException, Response
from typing import Union, List

from davinci_api import get_resolve_subtitles, export_to_davinci, get_subtitle_tracks
from davinci_connector import get_current_timeline
from srt_utils import generate_srt_content
from srt_parser import parse_srt_file, validate_srt_content
from text_utils import process_subtitles_for_filler_words, replace_text_in_subtitles

# 配置日志
logger = logging.getLogger(__name__)
from schemas import (
    SubtitleItem,
    SuccessResponse,
    ErrorResponse,
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
from exceptions import ResolveError, ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError

# 在 ErrorResponse 中更新 code 字段的类型
ErrorResponse.model_rebuild(force=True)

router = APIRouter(
    prefix="/api/v1/subtitles",
    tags=["Subtitles"]
)


@router.get("/",
            response_model=Union[SuccessResponse, ErrorResponse],
            summary="提取DaVinci Resolve当前时间线的字幕")
def get_subtitles(track_index: int = 1):
    try:
        resolve, project, timeline, frame_rate = get_current_timeline()
        result = get_resolve_subtitles(project, timeline, frame_rate, track_index=track_index)
        return {"status": "success", "frameRate": result.get("frameRate"), "data": result.get("data")}
    except (ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError) as e:
        raise HTTPException(status_code=503, detail={"status": "error", "message": str(e)})
    except ResolveError as e:
        raise HTTPException(status_code=400, detail={"status": "error", "message": str(e)}) # 400 for bad track index
    except Exception as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": f"An unexpected error occurred: {e}"})


@router.get("/tracks",
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


@router.post("/export/srt", summary="导出SRT字幕文件")
def export_subtitles_as_srt(request: SubtitleExportRequest):
    srt_content = generate_srt_content(request)
    return Response(content=srt_content, media_type="text/plain")


@router.post("/export/davinci", summary="直接导出字幕到DaVinci Resolve时间线")
def export_subtitles_to_davinci(request: SubtitleExportRequest):
    try:
        resolve, project, timeline, frame_rate = get_current_timeline()
        result = export_to_davinci(project, timeline, frame_rate, request)
        return {"status": "success", "message": result.get("message")}
    except (ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError) as e:
        raise HTTPException(status_code=503, detail={"status": "error", "message": str(e)})
    except ResolveError as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"status": "error", "message": f"An unexpected error occurred: {e}"})


@router.post("/import/srt", 
             response_model=Union[SrtImportResponse, ErrorResponse], 
             summary="导入SRT文件并解析为字幕数据")
def import_srt_file(request: SrtImportRequest):
    """
    导入SRT文件内容并解析为字幕数据
    接收SRT文件内容字符串，验证并解析后返回字幕数据
    """
    try:
        # 检查内容大小限制（10MB）
        max_size = 10 * 1024 * 1024  # 10MB
        if len(request.content.encode('utf-8')) > max_size:
            raise HTTPException(
                status_code=413, 
                detail={"status": "error", "message": "文件内容过大，最大支持10MB", "code": "file_too_large"}
            )
        
        # 验证SRT文件内容（使用非严格模式，允许跳过无效块）
        validation_result = validate_srt_content(request.content, strict=False)
        if not validation_result["isValid"]:
            raise HTTPException(
                status_code=400, 
                detail={
                    "status": "error", 
                    "message": f"SRT文件格式错误: {'; '.join(validation_result['errors'])}", 
                    "code": "invalid_srt_format"
                }
            )
        
        # 解析SRT文件
        parsed_file = parse_srt_file(request.content, request.fileName)
        
        # 返回解析结果
        return {
            "status": "success",
            "data": parsed_file.to_dict()
        }
        
    except HTTPException:
        # 重新抛出HTTP异常
        raise
    except Exception as e:
        # 处理其他异常
        raise HTTPException(
            status_code=500, 
            detail={"status": "error", "message": f"解析SRT文件时发生错误: {str(e)}", "code": "parse_error"}
        )


@router.post("/remove-filler-words",
             response_model=Union[RemoveFillerWordsResponse, ErrorResponse],
             summary="移除字幕中的口水词")
def remove_filler_words(request: RemoveFillerWordsRequest):
    """
    移除字幕中的口水词，可选择是否移除标点符号（保留配置文件中指定的标点符号）
    """
    logger.info(f"收到去口水词请求，字幕数量: {len(request.subtitles)}, 移除标点符号: {request.removePunctuation}")
    
    try:
        # 处理字幕，移除口水词
        processed_subtitles = process_subtitles_for_filler_words(
            request.subtitles, 
            request.removePunctuation
        )
        
        logger.info(f"去口水词处理完成，返回 {len(processed_subtitles)} 条字幕")
        
        return {
            "status": "success",
            "data": processed_subtitles
        }
        
    except Exception as e:
        logger.error(f"处理口水词时发生错误: {str(e)}", exc_info=True)
        # 处理其他异常
        raise HTTPException(
            status_code=500, 
            detail={"status": "error", "message": f"处理口水词时发生错误: {str(e)}", "code": "filler_words_processing_error"}
        )


@router.post("/replace-all",
             response_model=Union[ReplaceAllResponse, ErrorResponse],
             summary="在字幕中执行查找替换操作")
def replace_all_in_subtitles(request: ReplaceAllRequest):
    """
    在字幕中执行全局查找替换操作，不区分大小写
    """
    try:
        # 执行查找替换操作
        modified_subtitles = replace_text_in_subtitles(
            request.subtitles,
            request.searchQuery,
            request.replaceQuery
        )
        
        return {
            "status": "success",
            "data": modified_subtitles
        }
        
    except ValueError as e:
        # 处理验证错误（如空的搜索查询）
        raise HTTPException(
            status_code=400,
            detail={"status": "error", "message": str(e), "code": "invalid_search_query"}
        )
    except Exception as e:
        # 处理其他异常
        raise HTTPException(
            status_code=500,
            detail={"status": "error", "message": f"执行查找替换时发生错误: {str(e)}", "code": "replace_processing_error"}
        )