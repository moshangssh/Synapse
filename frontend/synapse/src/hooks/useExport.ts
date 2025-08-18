import { useDataStore } from '../stores/useDataStore';
import useNotifier from './useNotifier';

type ExportResult = {
  success: boolean;
  message: string;
  data?: string; // For SRT export, this will contain the file content
};

export const useExport = () => {
  const subtitles = useDataStore((state) => state.subtitles);
  const frameRate = useDataStore((state) => state.frameRate);
  const notify = useNotifier();

  // 提取公共逻辑到私有函数
  const prepareExportData = () => {
    const subtitlesToExport = subtitles.map(({ id, startTimecode, endTimecode, diffs }) => ({
      id,
      startTimecode,
      endTimecode,
      diffs,
    }));

    return {
      frameRate: frameRate,
      subtitles: subtitlesToExport,
    };
  };

  const exportToSrt = async (): Promise<ExportResult> => {
    try {
      const requestBody = prepareExportData();

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/export/srt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
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

      const srtContent = await response.text();
      return { success: true, message: '成功导出SRT文件！', data: srtContent };
    } catch (error: any) {
      console.error('导出SRT文件时发生错误:', error);

      let errorMessage = '导出SRT文件时发生未知错误';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查后端服务是否正常运行';
      } else if (error.message) {
        errorMessage = error.message;
      }

      notify.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const exportToDavinci = async (): Promise<ExportResult> => {
    const requestBody = prepareExportData();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/export/davinci`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
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

      return { success: true, message: '成功导出至达芬奇！' };
    } catch (error: any) {
      console.error('导出至达芬奇时发生错误:', error);

      let errorMessage = '导出至达芬奇时发生未知错误';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查后端服务是否正常运行';
      } else if (error.message) {
        errorMessage = error.message;
      }

      notify.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  return { exportToSrt, exportToDavinci };
};