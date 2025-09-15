import { DiffPart } from "./components/DiffHighlighter";

/**
 * 时间码格式：HH:MM:SS:FF (小时:分钟:秒:帧)
 * 或 SRT格式：HH:MM:SS,mmm (小时:分钟:秒,毫秒)
 */
type Timecode = string;

/**
 * 字幕条目接口
 */
export interface Subtitle {
  /** 字幕ID */
  id: number;
  /** 起始时间码 */
  startTimecode: Timecode;
  /** 结束时间码 */
  endTimecode: Timecode;
  /** 字幕文本内容 */
  text: string;
  /** 原始字幕文本内容 */
  originalText: string;
  /** 文本差异信息 */
  diffs: DiffPart[];
  /** 是否匹配搜索条件 */
  isMatch?: boolean;
  /** 是否被修改过 */
  isModified?: boolean;
}

/**
* 字幕和帧率信息接口
*/
export interface SubtitlesWithFrameRate {
/** 字幕数组 */
subtitles: Subtitle[];
/** 帧率 */
frameRate: number;
}
/**
 * 字幕轨道信息接口
 */
export interface SubtitleTrack {
  /** 轨道索引 */
  trackIndex: number;
  /** 轨道名称 */
  trackName: string;
}

/**
 * 项目信息接口
 */
export interface ProjectInfo {
  /** 项目名称 */
  projectName: string | null;
  /** 时间线名称 */
  timelineName: string | null;
}

/**
 * SRT字幕条目接口
 */
export interface SrtSubtitleEntry {
  /** 字幕ID */
  id: number;
  /** 起始时间码 */
  startTimecode: Timecode;
  /** 结束时间码 */
  endTimecode: Timecode;
  /** 字幕文本内容 */
  text: string;
}

/**
 * 导入的字幕文件接口
 */
export interface ImportedSubtitleFile {
  /** 文件名 */
  fileName: string;
  /** 字幕条目列表 */
  subtitles: SrtSubtitleEntry[];
  /** 文件元数据 */
  metadata: {
    /** 导入时间 */
    importedAt: string;
    /** 文件大小（可选） */
    fileSize?: number;
    /** 文件格式 */
    format: 'srt';
  };
}

/**
 * API错误信息接口
 */
export interface ApiError {
  /** 错误消息 */
  message: string;
  /** 错误码（可选） */
  code?: string;
}

/**
 * 优化请求接口
 */
export interface ConnectionTestRequest {
  api_url: string;
  api_key: string;
  model: string;
}

export interface ConnectionTestResponse {
  success: boolean;
  message: string;
  details?: {
    model?: string;
    response_length?: number;
    usage?: any;
  };
  response_time?: number;
}

export interface OptimizationRequest {
  subtitles: Array<{
    id: number;
    text: string;
  }>;
  reference_info?: string;
  batchSize?: number;
  parallelismCount?: number;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  apiKey?: string;
  apiUrl?: string;
}

/**
 * 优化响应接口
 */
export interface OptimizationResponse {
  data: Array<{
    id: number;
    original_text: string;
    optimized_text: string;
    diffs: Array<{
      type: 'added' | 'removed' | 'normal';
      value: string;
    }>;
  }>;
  metadata: {
    processing_time: number;
    cache_stats: {
      cache_hits: number;
      cache_misses: number;
    };
    error_count: number;
  };
}

/**
 * 流式优化进度事件接口
 */
export interface OptimizationProgressEvent {
  /** 事件类型 */
  type: 'start' | 'batch_start' | 'batch_complete' | 'batch_error' | 'complete' | 'error';
  /** 事件数据 */
  data: any;
  /** 消息 */
  message: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 流式优化进度事件详情
 */
export interface StartEventData {
  total_subtitles: number;
  total_batches: number;
}

export interface BatchStartEventData {
  batch_number: number;
  total_batches: number;
  batchSize: number;
  processed_count: number;
  total_count: number;
}

export interface BatchCompleteEventData {
  batch_number: number;
  total_batches: number;
  batchSize: number;
  processed_count: number;
  total_count: number;
  batch_results: any[];
  batch_processing_time: number;
}

export interface BatchErrorEventData {
  batch_number: number;
  total_batches: number;
  batchSize: number;
  processed_count: number;
  total_count: number;
  error: string;
  fallback_results: any[];
  batch_processing_time: number;
}

export interface CompleteEventData {
  total_subtitles: number;
  optimized_subtitles: any[];
  metadata: {
    total_subtitles: number;
    batches_processed: number;
    cache_hits: number;
    cache_hit_rate: number;
    processing_time: number;
    model_used: string;
    optimized_count: number;
    fallback_count: number;
    success_rate: number;
  };
}

export interface ErrorEventData {
  error: string;
  message: string;
}