import { Subtitle, ProjectInfo, SubtitleTrack } from '../types';
import { API_BASE_URL, API_ENDPOINTS, handleApiError, handleNetworkError } from './apiConfig';

/**
 * 获取字幕数据
 * @param trackIndex 轨道索引
 * @returns Promise<Subtitle[]> 字幕数组
 */
export const fetchSubtitles = async (trackIndex: number = 1): Promise<Subtitle[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SUBTITLES}?track_index=${trackIndex}`);
    const data = await response.json();

    if (response.ok && data.status === "success") {
      const subtitlesWithDiffs = data.data.map((sub: any) => ({
        ...sub,
        originalText: sub.text,
        diffs: [{ type: "normal", value: sub.text }],
      }));
      return subtitlesWithDiffs;
    } else {
      await handleApiError(response, '获取字幕失败');
    }
  } catch (error) {
    console.error('获取字幕失败:', error);
    throw handleNetworkError(error, '获取字幕');
  }
};

/**
 * 获取项目信息
 * @returns Promise<ProjectInfo> 项目信息
 */
export const fetchProjectInfo = async (): Promise<ProjectInfo> => {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PROJECT_INFO}`);
    const result = await response.json();

    if (response.ok && result.status === 'success') {
      return result.data;
    } else {
      console.error(result.message || '获取项目信息失败');
      return { projectName: 'N/A', timelineName: 'N/A' };
    }
  } catch (error) {
    console.error('Failed to fetch project info:', error);
    return { projectName: 'N/A', timelineName: 'N/A' };
  }
};

/**
 * 获取字幕轨道
 * @returns Promise<SubtitleTrack[]> 字幕轨道数组
 */
export const fetchSubtitleTracks = async (): Promise<SubtitleTrack[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SUBTITLE_TRACKS}`);
    const data = await response.json();
    
    if (response.ok && data.status === "success") {
      return data.data;
    } else {
      await handleApiError(response, '获取字幕轨道失败');
    }
  } catch (error) {
    console.error('获取字幕轨道失败:', error);
    throw handleNetworkError(error, '获取字幕轨道');
  }
};