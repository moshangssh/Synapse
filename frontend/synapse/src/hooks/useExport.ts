import { useSubtitleStore } from '../stores/useSubtitleStore';
import { useProjectStore } from '../stores/useProjectStore';
import useNotifier from './useNotifier';
import { exportToSrt as exportToSrtService, exportToDavinci as exportToDavinciService } from '../services/exportService';

type ExportResult = {
  success: boolean;
  message: string;
  data?: string; // For SRT export, this will contain the file content
};

export const useExport = () => {
  const subtitles = useSubtitleStore((state) => state.subtitles);
  const frameRate = useProjectStore((state) => state.frameRate);
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
      const srtContent = await exportToSrtService(requestBody);
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
      await exportToDavinciService(requestBody);
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