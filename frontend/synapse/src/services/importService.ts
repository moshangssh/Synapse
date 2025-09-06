import { API_BASE_URL, API_ENDPOINTS, handleApiError, handleNetworkError } from './apiConfig';

/**
 * 导入并解析SRT文件
 * @param content SRT文件内容
 * @param fileName 文件名
 * @returns Promise<any> 解析后的数据
 */
export const importSrtFile = async (content: string, fileName: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.IMPORT_SRT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        fileName: fileName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      await handleApiError(response, '导入SRT文件时发生错误');
    }

    return data.data;
  } catch (error) {
    console.error('导入SRT文件时发生错误:', error);
    throw handleNetworkError(error, '导入SRT文件');
  }
};