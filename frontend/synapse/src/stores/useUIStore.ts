import { create } from 'zustand';

interface UIState {
  activeView: string;
  selectedFile: string;
  sidebarWidth: number;
  activeTrackIndex: number | null;
  selectedSubtitleId: number | null;
  theme: 'light' | 'dark';
  setActiveView: (view: string) => void;
  setSelectedFile: (file: string) => void;
  setSidebarWidth: (width: number) => void;
  setActiveTrackIndex: (index: number | null) => void;
  setSelectedSubtitleId: (id: number | null) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activeView: 'fileExplorer', // or 'search'
  selectedFile: '',
  sidebarWidth: 250,
  activeTrackIndex: null,
  selectedSubtitleId: null,
  theme: 'dark', // 默认主题
  setActiveView: (view) => set({ activeView: view }),
  setSelectedFile: (file) => set({ selectedFile: file }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setActiveTrackIndex: (index) => set({ activeTrackIndex: index }),
  setSelectedSubtitleId: (id) => set({ selectedSubtitleId: id }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
}));