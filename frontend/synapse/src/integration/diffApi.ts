import { DiffPart } from '../components/DiffHighlighter';

export interface DiffRequest {
  original_text: string;
  new_text: string;
}

export interface DiffResponse {
  status: string;
  data: DiffPart[];
}

/**
 * 调用后端API计算文本差异
 * @param originalText 原始文本
 * @param newText 新文本
 * @returns Promise<DiffPart[]> 差异部分数组
 */
export const calculateDiffApi = async (
  originalText: string,
  newText: string
): Promise<DiffPart[]> => {
  const request: DiffRequest = {
    original_text: originalText,
    new_text: newText,
  };

  try {
    const response = await fetch('http://localhost:8000/api/v1/utils/diff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail?.message || '计算文本差异失败');
    }

    const result: DiffResponse = await response.json();
    
    if (result.status !== 'success') {
      throw new Error('API返回错误状态');
    }

    return result.data;
  } catch (error) {
    console.error('计算文本差异失败:', error);
    throw error instanceof Error ? error : new Error('计算文本差异失败');
  }
};