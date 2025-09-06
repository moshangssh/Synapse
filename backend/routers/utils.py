from fastapi import APIRouter, HTTPException
from typing import Union

from text_utils import calculate_text_diff
from schemas import (
    DiffRequest,
    DiffResponse,
    ErrorResponse
)

router = APIRouter(
    prefix="/api/v1/utils",
    tags=["Utils"]
)


@router.post("/diff",
             response_model=Union[DiffResponse, ErrorResponse],
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