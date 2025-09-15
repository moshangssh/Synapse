import { API_BASE_URL, API_ENDPOINTS, handleNetworkError } from './apiConfig';

/**
 * 导出字幕为SRT格式
 * @param exportData 导出数据
 * @returns Promise<string> SRT文件内容
 */
export const exportToSrt = async (exportData: any): Promise<string> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.EXPORT_SRT}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "导出失败";

      switch (response.status) {
        case 400:
          errorMessage = `请求参数错误: ${errorText || "请检查字幕数据格式"}`;
          break;
        case 404:
          errorMessage = "导出接口未找到，请检查后端服务是否正常运行";
          break;
        case 500:
          errorMessage = `服务器内部错误: ${errorText || "请联系开发者"}`;
          break;
        default:
          errorMessage = errorText || `导出失败 (HTTP ${response.status})`;
      }

      throw new Error(errorMessage);
    }

    return await response.text();
  } catch (error) {
    console.error('导出SRT文件时发生错误:', error);
    throw handleNetworkError(error, '导出SRT文件');
  }
};

/**
 * 导出字幕到DaVinci Resolve
 * @param exportData 导出数据
 * @returns Promise<void>
 */
export const exportToDavinci = async (exportData: any): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.EXPORT_DAVINCI}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportData),
      }
    );

    if (!response.ok) {
      try {
        const errorData = await response.json();
        let errorMessage = "导出至达芬奇失败";

        switch (response.status) {
          case 400:
            errorMessage = `请求参数错误: ${errorData.message || "请检查字幕数据格式"}`;
            break;
          case 404:
            errorMessage = "导出至达芬奇接口未找到，请检查后端服务是否正常运行";
            break;
          case 500:
            errorMessage = `服务器内部错误: ${errorData.message || "请联系开发者"}`;
            break;
          default:
            errorMessage = errorData.message || `导出至达芬奇失败 (HTTP ${response.status})`;
        }

        throw new Error(errorMessage);
      } catch (parseError) {
        let errorMessage = "导出至达芬奇失败";

        switch (response.status) {
          case 404:
            errorMessage = "导出至达芬奇接口未找到，请检查后端服务是否正常运行";
            break;
          case 500:
            errorMessage = `服务器内部错误: ${response.statusText || "请联系开发者"}`;
            break;
          default:
            errorMessage = response.statusText || `导出至达芬奇失败 (HTTP ${response.status})`;
        }

        throw new Error(errorMessage);
      }
    }
  } catch (error) {
    console.error('导出至达芬奇时发生错误:', error);
    throw handleNetworkError(error, '导出至达芬奇');
  }
};