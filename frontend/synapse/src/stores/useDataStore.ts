import { create } from 'zustand';
import { Subtitle, SubtitleTrack, ProjectInfo, ImportedSubtitleFile, ApiError } from '../types';
import { calculateDiffApi } from '../integration/diffApi';


type Status = 'connected' | 'connecting' | 'error' | 'disconnected' | 'standalone';

interface UserInfo {
  name: string;
  email: string;
  avatar: string;
}

type SubtitleSourceType = 'davinci' | 'imported' | null;

interface DataState {
  subtitles: Subtitle[];
  subtitleTracks: SubtitleTrack[];
  projectInfo: ProjectInfo | null;
  frameRate: number;
  connectionStatus: Status;
  errorMessage: ApiError | null;
  userInfo: UserInfo | null;
  importedSubtitleFiles: ImportedSubtitleFile[];
  currentSubtitleSource: SubtitleSourceType;
  currentImportedFileName: string | null;
  setSubtitles: (subtitles: Subtitle[]) => void;
  setSubtitleTracks: (tracks: SubtitleTrack[]) => void;
  setProjectInfo: (info: ProjectInfo | null) => void;
  setFrameRate: (rate: number) => void;
  setConnectionStatus: (status: Status) => void;
  setErrorMessage: (error: ApiError | null) => void;
  setCurrentSubtitleSource: (source: SubtitleSourceType) => void;
  setCurrentImportedFileName: (fileName: string | null) => void;
  updateSubtitleText: (id: number, newText: string) => void;
  setUserInfo: (userInfo: UserInfo | null) => void;
  setImportedSubtitleFiles: (files: ImportedSubtitleFile[]) => void;
  addImportedSubtitleFile: (file: ImportedSubtitleFile) => void;
  removeImportedSubtitleFile: (fileName: string) => void;
  updateImportedSubtitleFile: (fileName: string, updatedFile: ImportedSubtitleFile) => void;
  clearImportedSubtitleFiles: () => void;
  getModifiedSubtitleIndices: () => number[];
}

export const useDataStore = create<DataState>((set, get) => {

  return {
    subtitles: [],
    subtitleTracks: [],
    projectInfo: null,
    frameRate: 24,
    connectionStatus: 'disconnected',
    errorMessage: null,
    userInfo: null,
    importedSubtitleFiles: [],
    currentSubtitleSource: null,
    currentImportedFileName: null,
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
    removeImportedSubtitleFile: (fileName) => set((state) => {
        const newFiles = state.importedSubtitleFiles.filter(file => file.fileName !== fileName);
        // 如果当前是独立模式且删除了最后一个导入文件，回到 disconnected 状态
        if (state.connectionStatus === 'standalone' && newFiles.length === 0) {
            return { importedSubtitleFiles: newFiles, connectionStatus: 'disconnected' };
        }
        return { importedSubtitleFiles: newFiles };
    }),
    updateImportedSubtitleFile: (fileName, updatedFile) => set((state) => ({
        importedSubtitleFiles: state.importedSubtitleFiles.map(file =>
            file.fileName === fileName ? updatedFile : file
        )
    })),
    clearImportedSubtitleFiles: () => set((state) => {
        // 如果当前是独立模式且清空了导入文件，回到 disconnected 状态
        if (state.connectionStatus === 'standalone') {
            return { importedSubtitleFiles: [], connectionStatus: 'disconnected' };
        }
        return { importedSubtitleFiles: [] };
    }),
    updateSubtitleText: (id, newText) => {
        const state = get();
        const index = state.subtitles.findIndex((sub) => sub.id === id);
        if (index === -1) return; // 未找到，不作任何事

        const subToUpdate = state.subtitles[index];
        // 如果文本没有实际改变，则不执行任何操作以避免不必要的重渲染
        if (subToUpdate.text === newText) return;

        const originalText = subToUpdate.originalText ?? subToUpdate.text;

        // 创建一个新的字幕对象，先使用占位符差异
        const updatedSubtitle = {
            ...subToUpdate,
            text: newText,
            originalText: originalText, // 确保 originalText 被保留
            isModified: newText !== originalText,
            diffs: [{ type: 'normal' as const, value: newText }], // 临时占位符
        };

        // 创建一个新的字幕数组副本
        const newSubtitles = [...state.subtitles];
        newSubtitles[index] = updatedSubtitle; // 在新数组中替换指定位置的字幕

        // 立即更新UI
        set({ subtitles: newSubtitles });

        // 异步调用API来更新差异数据
        const updateSubtitleDiffs = async () => {
            const currentState = get();
            const sub = currentState.subtitles.find((s) => s.id === id);
            if (!sub || sub.text !== newText) return; // 确保字幕状态没有变化

            const currentOriginalText = sub.originalText ?? sub.text;
            
            try {
                const diffs = await calculateDiffApi(currentOriginalText, newText);
                
                // 更新差异数据
                set((state) => {
                    const currentIndex = state.subtitles.findIndex((s) => s.id === id);
                    if (currentIndex === -1) return {};

                    const updatedSubtitle = {
                        ...state.subtitles[currentIndex],
                        diffs: diffs,
                    };

                    const updatedSubtitles = [...state.subtitles];
                    updatedSubtitles[currentIndex] = updatedSubtitle;

                    return { subtitles: updatedSubtitles };
                });
            } catch (error) {
                console.error('计算文本差异失败:', error);
                // API调用失败时，保留占位符差异但添加错误状态
                set((state) => {
                    const currentIndex = state.subtitles.findIndex((s) => s.id === id);
                    if (currentIndex === -1) return {};

                    const updatedSubtitle = {
                        ...state.subtitles[currentIndex],
                        diffs: [{ type: 'normal' as const, value: newText }], // 保持占位符
                        diffError: true, // 添加错误状态标志
                    };

                    const updatedSubtitles = [...state.subtitles];
                    updatedSubtitles[currentIndex] = updatedSubtitle;

                    return { subtitles: updatedSubtitles };
                });
            }
        };

        updateSubtitleDiffs();
    },
    setUserInfo: (userInfo) => set({ userInfo }),
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
    setCurrentSubtitleSource: (source) => set({ currentSubtitleSource: source }),
    setCurrentImportedFileName: (fileName) => set({ currentImportedFileName: fileName }),
}});