import { DiffPart } from '../components/DiffHighlighter';
import { calculateDiff } from '../services/utilService';

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
  try {
    return await calculateDiff(originalText, newText);
  } catch (error) {
    console.error('计算文本差异失败:', error);
    throw error instanceof Error ? error : new Error('计算文本差异失败');
  }
};