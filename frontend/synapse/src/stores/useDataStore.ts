import { create } from 'zustand';
import { Subtitle, SubtitleTrack, ProjectInfo, ImportedSubtitleFile, ApiError } from '../types';
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
            const index = state.subtitles.findIndex((sub) => sub.id === id);
            if (index === -1) return {}; // 未找到，不作任何事

            const subToUpdate = state.subtitles[index];
            // 如果文本没有实际改变，则不执行任何操作以避免不必要的重渲染
            if (subToUpdate.text === newText) return {};

            const originalText = subToUpdate.originalText ?? subToUpdate.text;

            // 创建一个新的字幕对象，以确保状态的不可变性
            const updatedSubtitle = {
                ...subToUpdate,
                text: newText,
                originalText: originalText, // 确保 originalText 被保留
                isModified: newText !== originalText,
                diffs: calculateDiff(originalText, newText),
            };

            // 创建一个新的字幕数组副本
            const newSubtitles = [...state.subtitles];
            newSubtitles[index] = updatedSubtitle; // 在新数组中替换指定位置的字幕

            return { subtitles: newSubtitles };
        }),
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
}});