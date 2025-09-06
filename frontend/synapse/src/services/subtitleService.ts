import { Subtitle } from '../types';
import { API_BASE_URL, API_ENDPOINTS, handleApiError, handleNetworkError } from './apiConfig';

/**
 * 移除字幕中的口水词
 * @param subtitles 字幕数组
 * @param removePunctuation 是否移除标点符号
 * @returns Promise<Subtitle[]> 处理后的字幕数组
 */
export const removeFillerWords = async (
  subtitles: Subtitle[], 
  removePunctuation: boolean
): Promise<Subtitle[]> => {
  console.log(`[FillerWordService] 开始处理字幕，移除标点符号: ${removePunctuation}`);
  console.log(`[FillerWordService] 字幕参数:`, subtitles);
  
  // 添加参数检查
  if (!subtitles) {
    console.error('[FillerWordService] subtitles 参数为 undefined');
    throw new Error('字幕数据为空');
  }
  
  if (!Array.isArray(subtitles)) {
    console.error('[FillerWordService] subtitles 参数不是数组:', subtitles);
    throw new Error('字幕数据格式错误');
  }
  
  console.log(`[FillerWordService] 字幕数量: ${subtitles.length}`);
  
  try {
    // 准备API请求的数据
    const requestData = {
      subtitles: subtitles.map(subtitle => ({
        id: subtitle.id,
        startTimecode: subtitle.startTimecode,
        endTimecode: subtitle.endTimecode,
        text: subtitle.text
      })),
      removePunctuation: removePunctuation
    };

    console.log('[FillerWordService] 发送请求到后端API');
    
    // 调用后端API
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REMOVE_FILLER_WORDS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const data = await response.json();
    console.log(`[FillerWordService] 收到后端响应，状态: ${response.status}`);

    if (!response.ok) {
      console.error('[FillerWordService] API响应错误:', data);
      await handleApiError(response, '移除口水词时发生错误');
    }

    // 处理成功的响应
    console.log(`[FillerWordService] 处理完成，返回 ${data.data.length} 条字幕`);
    return data.data;
  } catch (error) {
    console.error('[FillerWordService] 移除口水词失败:', error);
    throw handleNetworkError(error, '移除口水词');
  }
};

/**
 * 替换所有字幕中的文本
 * @param subtitles 字幕数组
 * @param searchQuery 搜索文本
 * @param replaceQuery 替换文本
 * @returns Promise<Subtitle[]> 处理后的字幕数组
 */
export const replaceAllSubtitles = async (
  subtitles: Subtitle[],
  searchQuery: string,
  replaceQuery: string
): Promise<Subtitle[]> => {
  if (!searchQuery.trim()) {
    throw new Error('搜索查询不能为空');
  }

  const requestBody = {
    subtitles: subtitles.map(sub => ({
      id: sub.id,
      startTimecode: sub.startTimecode,
      endTimecode: sub.endTimecode,
      text: sub.diffs && sub.diffs.length > 0
        ? sub.diffs.filter(p => p.type !== 'removed').map(p => p.value).join('')
        : sub.text
    })),
    searchQuery,
    replaceQuery
  };

  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPLACE_ALL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      await handleApiError(response, '替换操作失败');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('替换操作失败:', error);
    throw handleNetworkError(error, '替换操作');
  }
};