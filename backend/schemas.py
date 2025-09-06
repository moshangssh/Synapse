from pydantic import BaseModel, Field
from typing import List, Union, Dict, Any, Optional
from enum import Enum

# --- Models for SRT Export ---

class DiffPartModel(BaseModel):
    type: str # 'added', 'removed', or 'normal'
    value: str

class SubtitleModel(BaseModel):
    id: int
    startTimecode: str
    endTimecode: str
    diffs: List[DiffPartModel]

class SubtitleExportRequest(BaseModel):
    frameRate: float
    subtitles: List[SubtitleModel]

# --- Models for Timeline ---

class SubtitleTrackInfo(BaseModel):
    track_index: int = Field(..., example=1, description="字幕轨道的索引（从1开始）")
    track_name: str = Field(..., example="Subtitle 1", description="字幕轨道的名称")

class SubtitleTrackListResponse(BaseModel):
    status: str = "success"
    data: List[SubtitleTrackInfo]


# --- Existing Models from main.py ---

class SubtitleItem(BaseModel):
    id: int
    startTimecode: str = Field(..., example="01:00:02:10")
    endTimecode: str = Field(..., example="01:00:05:15")
    text: str = Field(..., example="这是一条字幕。")
    diffs: Optional[List[DiffPartModel]] = None

class SuccessResponse(BaseModel):
    status: str = "success"
    frameRate: float
    data: List[SubtitleItem]

class ResolveErrorCode(str, Enum):
    RESOLVE_NOT_RUNNING = "resolve_not_running"
    CONNECTION_ERROR = "connection_error"
    NO_PROJECT_OPEN = "no_project_open"
    NO_ACTIVE_TIMELINE = "no_active_timeline"
    DVR_SCRIPT_NOT_FOUND = "dvr_script_not_found"
    GET_INFO_FAILED = "get_info_failed"
    CREATE_TRACK_FAILED = "create_track_failed"
    UNKNOWN_ERROR = "unknown_error"

class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    code: Union[ResolveErrorCode, str]

class JumpToOptions(str, Enum):
    start = "start"
    end = "end"
    middle = "middle"

class TimecodeRequest(BaseModel):
    in_point: str = Field(..., example="01:00:00:00", description="入点时间码，格式为 HH:MM:SS:FF")
    out_point: str = Field(..., example="01:00:10:00", description="出点时间码，格式为 HH:MM:SS:FF")
    jump_to: JumpToOptions = Field(..., description="跳转位置，可选值为 'start', 'end', 'middle'")

# --- Models for SRT Import ---

class SrtSubtitleEntryModel(BaseModel):
    id: int
    startTimecode: str = Field(..., example="00:00:01.000")
    endTimecode: str = Field(..., example="00:00:03.000")
    text: str = Field(..., example="这是一条字幕。")

class ImportedSubtitleFileModel(BaseModel):
    fileName: str = Field(..., example="subtitle.srt")
    subtitles: List[SrtSubtitleEntryModel]
    metadata: Dict[str, Any] = Field(..., example={
        "importedAt": "2023-12-01T10:30:00",
        "format": "srt"
    })

class SrtImportRequest(BaseModel):
    content: str = Field(..., description="SRT文件的文本内容")
    fileName: str = Field(..., description="SRT文件名")

class SrtImportResponse(BaseModel):
    status: str = "success"
    data: ImportedSubtitleFileModel

# --- Models for Filler Words Removal ---

class RemoveFillerWordsRequest(BaseModel):
    subtitles: List[SubtitleItem]
    removePunctuation: bool = Field(..., description="是否移除标点符号（保留保留列表中的标点）")

class RemoveFillerWordsResponse(BaseModel):
    status: str = "success"
    data: List[SubtitleItem]

# --- Models for Find and Replace ---

class ReplaceSubtitleItem(BaseModel):
    id: int
    text: str
    diffs: List[DiffPartModel]

class ReplaceAllRequest(BaseModel):
    subtitles: List[SubtitleItem]
    searchQuery: str = Field(..., description="要搜索的文本")
    replaceQuery: str = Field(..., description="要替换的文本")

class ReplaceAllResponse(BaseModel):
    status: str = "success"
    data: List[ReplaceSubtitleItem]

# --- Models for Diff Calculation ---

class DiffRequest(BaseModel):
    original_text: str = Field(..., description="原始文本")
    new_text: str = Field(..., description="新的文本")

class DiffResponse(BaseModel):
    status: str = "success"
    data: List[DiffPartModel]

# 为DiffPartModel添加别名，以保持向后兼容性
DiffPart = DiffPartModel