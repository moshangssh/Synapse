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