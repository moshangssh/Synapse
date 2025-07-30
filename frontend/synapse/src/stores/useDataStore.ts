import { create } from 'zustand';
import { Subtitle, SubtitleTrack, ProjectInfo } from '../types';

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
}

export const useDataStore = create<DataState>((set) => ({
  subtitles: [],
  subtitleTracks: [],
  projectInfo: null,
  frameRate: 24,
  connectionStatus: 'disconnected',
  errorMessage: '',
  userInfo: null,
  setSubtitles: (subtitles) => set({ subtitles }),
  setSubtitleTracks: (tracks) => set({ subtitleTracks: tracks }),
  setProjectInfo: (info) => set({ projectInfo: info }),
  setFrameRate: (rate) => set({ frameRate: rate }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  updateSubtitleText: (id, newText) =>
    set((state) => ({
      subtitles: state.subtitles.map((sub) =>
        sub.id === id ? { ...sub, text: newText } : sub
      ),
    })),
  setUserInfo: (userInfo) => set({ userInfo }),
}));