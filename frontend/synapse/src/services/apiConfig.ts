// API配置文件
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// API端点配置
export const API_ENDPOINTS = {
  // 字幕相关
  SUBTITLES: '/api/v1/subtitles',
  SUBTITLE_TRACKS: '/api/v1/subtitles/tracks',
  REMOVE_FILLER_WORDS: '/api/v1/subtitles/remove-filler-words',
  REPLACE_ALL: '/api/v1/subtitles/replace-all',
  
  // 项目相关
  PROJECT_INFO: '/api/v1/project-info',
  
  // 时间线相关
  SET_TIMECODE: '/api/v1/timeline/timecode',
  
  // 导入导出相关
  EXPORT_SRT: '/api/v1/subtitles/export/srt',
  EXPORT_DAVINCI: '/api/v1/subtitles/export/davinci',
  IMPORT_SRT: '/api/v1/subtitles/import/srt',
  
  // 工具相关
  UTILS_DIFF: '/api/v1/utils/diff',
  
  // 优化相关
  OPTIMIZER_OPTIMIZE: '/api/v1/optimizer/optimize',
} as const;

// HTTP方法
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const;

// 响应状态
export const RESPONSE_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

// 标准化错误处理函数
export interface ApiErrorDetails {
  message?: string;
  code?: string;
  status?: number;
  statusText?: string;
}

export const handleApiError = async (
  response: Response,
  defaultErrorMessage: string = 'API调用失败'
): Promise<never> => {
  let errorMessage = defaultErrorMessage;
  
  try {
    // 尝试解析错误详情
    const errorData = await response.json();
    const errorDetail = errorData.detail || errorData.error || errorData;
    
    if (typeof errorDetail === 'string') {
      errorMessage = errorDetail;
    } else if (errorDetail.message) {
      errorMessage = errorDetail.message;
    } else {
      // 根据HTTP状态码提供更具体的错误消息
      switch (response.status) {
        case 400:
          errorMessage = `请求参数错误: ${errorDetail.message || "请检查请求数据格式"}`;
          break;
        case 401:
          errorMessage = "未授权访问，请检查认证信息";
          break;
        case 403:
          errorMessage = "访问被拒绝，权限不足";
          break;
        case 404:
          errorMessage = "请求的资源未找到";
          break;
        case 500:
          errorMessage = `服务器内部错误: ${errorDetail.message || "请联系开发者"}`;
          break;
        default:
          errorMessage = errorDetail.message || `${defaultErrorMessage} (HTTP ${response.status})`;
      }
    }
  } catch (parseError) {
    // 如果无法解析JSON，使用响应文本或状态文本
    try {
      const errorText = await response.text();
      errorMessage = errorText || response.statusText || `${defaultErrorMessage} (HTTP ${response.status})`;
    } catch (textError) {
      errorMessage = response.statusText || `${defaultErrorMessage} (HTTP ${response.status})`;
    }
  }
  
  throw new Error(errorMessage);
};

// 网络错误处理函数
export const handleNetworkError = (error: unknown, context: string = '网络请求'): Error => {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new Error(`${context}失败，请检查网络连接和后端服务是否正常运行`);
  }
  
  if (error instanceof Error) {
    return error;
  }
  
  return new Error(`${context}时发生未知错误`);
};