import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type JumpTo = "start" | "end" | "middle";

interface UIState {
  activeView: string;
  selectedFile: string;
  sidebarWidth: number;
  isSidebarOpen: boolean;
  previousSidebarWidth: number;
  activeTrackIndex: number | null;
  selectedSubtitleId: number | null;
  theme: 'light' | 'dark';
  jumpTo: JumpTo;
  setActiveView: (view: string) => void;
  setSelectedFile: (file: string) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setActiveTrackIndex: (index: number | null) => void;
  setSelectedSubtitleId: (id: number | null) => void;
  toggleTheme: () => void;
  setJumpTo: (jumpTo: JumpTo) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeView: 'explorer', // or 'search'
      selectedFile: '',
      sidebarWidth: 250,
      isSidebarOpen: true,
      previousSidebarWidth: 250,
      activeTrackIndex: null,
      selectedSubtitleId: null,
      theme: 'dark', // 默认主题
      jumpTo: 'start',
      setActiveView: (view) => set({ activeView: view }),
      setSelectedFile: (file) => set({ selectedFile: file }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      toggleSidebar: () =>
        set((state) => {
          if (state.isSidebarOpen) {
            // 如果当前是打开状态，记录当前宽度并关闭
            return {
              isSidebarOpen: false,
              previousSidebarWidth: state.sidebarWidth,
              sidebarWidth: 0,
            };
          } else {
            // 如果当前是关闭状态，恢复之前的宽度并打开
            return {
              isSidebarOpen: true,
              sidebarWidth: state.previousSidebarWidth,
            };
          }
        }),
      setActiveTrackIndex: (index) => set({ activeTrackIndex: index }),
      setSelectedSubtitleId: (id) => set({ selectedSubtitleId: id }),
      setJumpTo: (jumpTo) => set({ jumpTo }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
    }),
    {
      name: 'ui-storage', // 存储在 localStorage 中的键名
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
      }),
    }
  )
);