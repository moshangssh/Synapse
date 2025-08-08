import { create } from 'zustand';
import { Subtitle, SubtitleTrack, ProjectInfo, ImportedSubtitleFile, ApiError } from '../types';
import { calculateDiff } from '../utils/diff';

// 创建一个WeakMap来缓存diff计算结果
const diffCache = new WeakMap<Subtitle, Map<string, any>>();

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
  errorMessage: ApiError | null;
  userInfo: UserInfo | null;
  importedSubtitleFiles: ImportedSubtitleFile[];
  setSubtitles: (subtitles: Subtitle[]) => void;
  setSubtitleTracks: (tracks: SubtitleTrack[]) => void;
  setProjectInfo: (info: ProjectInfo | null) => void;
  setFrameRate: (rate: number) => void;
  setConnectionStatus: (status: Status) => void;
  setErrorMessage: (error: ApiError | null) => void;
  updateSubtitleText: (id: number, newText: string) => void;
  setUserInfo: (userInfo: UserInfo | null) => void;
  setImportedSubtitleFiles: (files: ImportedSubtitleFile[]) => void;
  addImportedSubtitleFile: (file: ImportedSubtitleFile) => void;
  removeImportedSubtitleFile: (fileName: string) => void;
  updateImportedSubtitleFile: (fileName: string, updatedFile: ImportedSubtitleFile) => void;
  clearImportedSubtitleFiles: () => void;
  handleExport: () => Promise<string>;
  handleExportToDavinci: () => Promise<{ success: boolean; message: string; }>;
  getModifiedSubtitleIndices: () => number[];
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
    errorMessage: null,
    userInfo: null,
    importedSubtitleFiles: [],
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
    setErrorMessage: (error) => set({ errorMessage: error }),
    setImportedSubtitleFiles: (files) => set({ importedSubtitleFiles: files }),
    addImportedSubtitleFile: (file) => set((state) => {
        const existingFileIndex = state.importedSubtitleFiles.findIndex(f => f.fileName === file.fileName);
        const newFiles = [...state.importedSubtitleFiles];
        if (existingFileIndex !== -1) {
            newFiles[existingFileIndex] = file;
        } else {
            newFiles.push(file);
        }
        return { importedSubtitleFiles: newFiles };
    }),
    removeImportedSubtitleFile: (fileName) => set((state) => ({
        importedSubtitleFiles: state.importedSubtitleFiles.filter(file => file.fileName !== fileName)
    })),
    updateImportedSubtitleFile: (fileName, updatedFile) => set((state) => ({
        importedSubtitleFiles: state.importedSubtitleFiles.map(file =>
            file.fileName === fileName ? updatedFile : file
        )
    })),
    clearImportedSubtitleFiles: () => set({ importedSubtitleFiles: [] }),
    updateSubtitleText: (id, newText) =>
        set((state) => {
            const newSubtitles = state.subtitles.map((sub) => {
                if (sub.id === id) {
                    const originalText = sub.originalText ?? sub.text;
                    const isModified = originalText !== newText;

                    if (!isModified && sub.text === newText) {
                        return sub;
                    }
                    
                    let diffs = sub.diffs;
                    if (isModified) {
                        if (!diffCache.has(sub)) {
                            diffCache.set(sub, new Map());
                        }
                        const subCache = diffCache.get(sub)!;
                        const cacheKey = `${originalText}__${newText}`;
                        if (subCache.has(cacheKey)) {
                            diffs = subCache.get(cacheKey);
                        } else {
                            diffs = calculateDiff(originalText, newText);
                            subCache.set(cacheKey, diffs);
                        }
                    }

                    return {
                        ...sub,
                        text: newText,
                        originalText: originalText,
                        diffs: diffs,
                        isModified: isModified,
                    };
                }
                return sub;
            });

            if (state.subtitles !== newSubtitles) {
                return { subtitles: newSubtitles };
            }
            return {};
        }),
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
        } catch (error: any) {
            console.error('导出SRT文件时发生错误:', error);
            
            let errorMessage = '导出SRT文件时发生未知错误';
            if (error instanceof TypeError && error.message.includes('fetch')) {
                errorMessage = '网络连接失败，请检查后端服务是否正常运行';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            throw new Error(errorMessage);
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
            
            return { success: false, message: errorMessage };
        }
    },
    getModifiedSubtitleIndices: (() => {
        let lastResult: number[] = [];
        return () => {
            const { subtitles } = get();
            const modifiedIndices: number[] = [];
            subtitles.forEach((subtitle, index) => {
                if (subtitle.isModified) {
                    modifiedIndices.push(index);
                }
            });

            if (JSON.stringify(lastResult) !== JSON.stringify(modifiedIndices)) {
                lastResult = modifiedIndices;
            }
            
            return lastResult;
        };
    })(),
}});