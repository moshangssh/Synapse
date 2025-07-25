from pydantic import BaseModel, Field
from typing import List, Union
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

# --- Existing Models from main.py ---

class SubtitleItem(BaseModel):
    id: int
    startTimecode: str = Field(..., example="01:00:02:10")
    endTimecode: str = Field(..., example="01:00:05:15")
    text: str = Field(..., example="这是一条字幕。")

class SuccessResponse(BaseModel):
    status: str = "success"
    frameRate: float
    data: List[SubtitleItem]

class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    code: str

class JumpToOptions(str, Enum):
    start = "start"
    end = "end"
    middle = "middle"

class TimecodeRequest(BaseModel):
    in_point: str = Field(..., example="01:00:00:00", description="入点时间码，格式为 HH:MM:SS:FF")
    out_point: str = Field(..., example="01:00:10:00", description="出点时间码，格式为 HH:MM:SS:FF")
    jump_to: JumpToOptions = Field(..., description="跳转位置，可选值为 'start', 'end', 'middle'")