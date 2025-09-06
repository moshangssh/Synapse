import { create } from 'zustand';
import { ProjectInfo, SubtitleTrack, ImportedSubtitleFile } from '../types';

type SubtitleSourceType = 'davinci' | 'imported' | null;

interface ProjectState {
  projectInfo: ProjectInfo | null;
  subtitleTracks: SubtitleTrack[];
  frameRate: number;
  importedSubtitleFiles: ImportedSubtitleFile[];
  currentSubtitleSource: SubtitleSourceType;
  currentImportedFileName: string | null;
  setProjectInfo: (info: ProjectInfo | null) => void;
  setSubtitleTracks: (tracks: SubtitleTrack[]) => void;
  setFrameRate: (rate: number) => void;
  setImportedSubtitleFiles: (files: ImportedSubtitleFile[]) => void;
  addImportedSubtitleFile: (file: ImportedSubtitleFile) => void;
  removeImportedSubtitleFile: (fileName: string) => void;
  updateImportedSubtitleFile: (fileName: string, updatedFile: ImportedSubtitleFile) => void;
  clearImportedSubtitleFiles: () => void;
  setCurrentSubtitleSource: (source: SubtitleSourceType) => void;
  setCurrentImportedFileName: (fileName: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => {
  return {
    projectInfo: null,
    subtitleTracks: [],
    frameRate: 24,
    importedSubtitleFiles: [],
    currentSubtitleSource: null,
    currentImportedFileName: null,
    setProjectInfo: (info) => set({ projectInfo: info }),
    setSubtitleTracks: (tracks) => {
      const formattedTracks = tracks.map((track: any) => ({
        trackIndex: track.track_index,
        trackName: track.track_name,
      }));
      set({ subtitleTracks: formattedTracks });
    },
    setFrameRate: (rate) => set({ frameRate: rate }),
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
      return { importedSubtitleFiles: newFiles };
    }),
    updateImportedSubtitleFile: (fileName, updatedFile) => set((state) => ({
      importedSubtitleFiles: state.importedSubtitleFiles.map(file =>
        file.fileName === fileName ? updatedFile : file
      )
    })),
    clearImportedSubtitleFiles: () => set({ importedSubtitleFiles: [] }),
    setCurrentSubtitleSource: (source) => set({ currentSubtitleSource: source }),
    setCurrentImportedFileName: (fileName) => set({ currentImportedFileName: fileName }),
  };
});