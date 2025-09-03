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


@app.post("/api/v1/import/srt", 
          response_model=Union[SrtImportResponse, ErrorResponse], 
          tags=["Import"], 
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


@app.post("/api/v1/subtitles/remove-filler-words",
          response_model=Union[RemoveFillerWordsResponse, ErrorResponse],
          tags=["Subtitles"],
          summary="移除字幕中的口水词")
def remove_filler_words(request: RemoveFillerWordsRequest):
    """
    移除字幕中的口水词，可选择是否移除标点符号（保留配置文件中指定的标点符号）
    """
    try:
        # 处理字幕，移除口水词
        processed_subtitles = process_subtitles_for_filler_words(
            request.subtitles, 
            request.removePunctuation
        )
        
        return {
            "status": "success",
            "data": processed_subtitles
        }
        
    except Exception as e:
        # 处理其他异常
        raise HTTPException(
            status_code=500, 
            detail={"status": "error", "message": f"处理口水词时发生错误: {str(e)}", "code": "filler_words_processing_error"}
        )


@app.post("/api/v1/subtitles/replace-all",
          response_model=Union[ReplaceAllResponse, ErrorResponse],
          tags=["Subtitles"],
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


@app.post("/api/v1/utils/diff",
          response_model=Union[DiffResponse, ErrorResponse],
          tags=["Utils"],
          summary="计算两个文本之间的差异")
def calculate_diff(request: DiffRequest):
    """
    计算两个文本之间的差异，返回结构化的差异数据
    """
    try:
        # 验证输入参数
        if not isinstance(request.original_text, str) or not isinstance(request.new_text, str):
            raise ValueError("original_text 和 new_text 必须是字符串")
        
        # 计算文本差异
        diff_result = calculate_text_diff(
            request.original_text,
            request.new_text
        )
        
        # 验证结果
        if not isinstance(diff_result, list):
            raise ValueError("diff计算结果必须是列表")
        
        return {
            "status": "success",
            "data": diff_result
        }
        
    except ValueError as e:
        # 处理验证错误
        raise HTTPException(
            status_code=400,
            detail={"status": "error", "message": f"参数验证失败: {str(e)}", "code": "validation_error"}
        )
    except Exception as e:
        # 处理其他异常
        raise HTTPException(
            status_code=500,
            detail={"status": "error", "message": f"计算文本差异时发生错误: {str(e)}", "code": "diff_calculation_error"}
        )