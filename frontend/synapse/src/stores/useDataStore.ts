import { create } from 'zustand';
import { Subtitle, SubtitleTrack, ProjectInfo } from '../types';
import { calculateDiff } from '../utils/diff';

type Status = 'connected' | 'connecting' | 'error' | 'disconnected';

interface UserInfo {
  name: string;
  email: string;
  avatar: string;
}

interface DataState {
  subtitles: Subtitle[];
  subtitleTracks: SubtitleTrack[];
  projectInfo: ProjectInfo | null;
  frameRate: number;
  connectionStatus: Status;
  errorMessage: string;
  userInfo: UserInfo | null;
  setSubtitles: (subtitles: Subtitle[]) => void;
  setSubtitleTracks: (tracks: SubtitleTrack[]) => void;
  setProjectInfo: (info: ProjectInfo | null) => void;
  setFrameRate: (rate: number) => void;
  setConnectionStatus: (status: Status) => void;
  setErrorMessage: (message: string) => void;
  updateSubtitleText: (id: number, newText: string) => void;
  setUserInfo: (userInfo: UserInfo | null) => void;
  handleExport: () => Promise<string>;
  handleExportToDavinci: () => Promise<{ success: boolean; message: string; }>;
}

export const useDataStore = create<DataState>((set, get) => {
  // 提取公共逻辑到私有函数
  const prepareExportData = () => {
    const { subtitles, frameRate } = get();
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

  return {
  subtitles: [],
  subtitleTracks: [],
  projectInfo: null,
  frameRate: 24,
  connectionStatus: 'disconnected',
  errorMessage: '',
  userInfo: null,
  setSubtitles: (subtitles) => set({ subtitles }),
  setSubtitleTracks: (tracks) => {
    const formattedTracks = tracks.map((track: any) => ({
      trackIndex: track.track_index,
      trackName: track.track_name,
    }));
    set({ subtitleTracks: formattedTracks });
  },
  setProjectInfo: (info) => set({ projectInfo: info }),
  setFrameRate: (rate) => set({ frameRate: rate }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  updateSubtitleText: (id, newText) =>
    set((state) => ({
      subtitles: state.subtitles.map((sub) => {
        if (sub.id === id) {
          // 设置originalText字段在首次编辑时被正确设置
          const originalText = sub.originalText === undefined || sub.originalText === "" ? sub.text : sub.originalText;
          // 使用calculateDiff函数计算新的diffs
          const diffs = calculateDiff(originalText, newText);
          return {
            ...sub,
            text: newText,
            originalText: originalText,
            diffs: diffs
          };
        }
        return sub;
      }),
    })),
  setUserInfo: (userInfo) => set({ userInfo }),
  handleExport: async (): Promise<string> => {
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
        throw new Error(errorText || "导出失败");
      }

      return await response.text();
    } catch (error: any) {
      console.error('导出SRT文件时发生错误:', error);
      throw new Error(error.message || '导出SRT文件时发生未知错误');
    }
  },

  handleExportToDavinci: async () => {
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
        // 尝试解析错误响应
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || "导出至达芬奇失败");
        } catch (parseError) {
          // 如果解析错误响应失败，使用状态文本
          throw new Error(response.statusText || "导出至达芬奇失败");
        }
      }

      return { success: true, message: '成功导出至达芬奇！' };
    } catch (error: any) {
      console.error('导出至达芬奇时发生错误:', error);
      return { success: false, message: error.message || '导出至达芬奇时发生未知错误' };
    }
  },
}});