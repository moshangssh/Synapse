import { create } from 'zustand';
import { ApiError } from '../types';

type Status = 'connected' | 'connecting' | 'error' | 'disconnected' | 'standalone';

interface UserInfo {
  name: string;
  email: string;
  avatar: string;
}

interface ConnectionState {
  connectionStatus: Status;
  errorMessage: ApiError | null;
  userInfo: UserInfo | null;
  setConnectionStatus: (status: Status) => void;
  setErrorMessage: (error: ApiError | null) => void;
  setUserInfo: (userInfo: UserInfo | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => {
  return {
    connectionStatus: 'disconnected',
    errorMessage: null,
    userInfo: null,
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setErrorMessage: (error) => set({ errorMessage: error }),
    setUserInfo: (userInfo) => set({ userInfo }),
  };
});