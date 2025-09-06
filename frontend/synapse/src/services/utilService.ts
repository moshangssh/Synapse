import { DiffPart } from '../components/DiffHighlighter';
import { API_BASE_URL, API_ENDPOINTS, handleApiError, handleNetworkError } from './apiConfig';

/**
 * 计算文本差异
 * @param originalText 原始文本
 * @param newText 新文本
 * @returns Promise<DiffPart[]> 差异部分数组
 */
export const calculateDiff = async (
  originalText: string,
  newText: string
): Promise<DiffPart[]> => {
  const request = {
    original_text: originalText,
    new_text: newText,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.UTILS_DIFF}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await handleApiError(response, '计算文本差异失败');
    }

    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error('API返回错误状态');
    }

    return result.data;
  } catch (error) {
    console.error('计算文本差异失败:', error);
    throw handleNetworkError(error, '计算文本差异');
  }
};