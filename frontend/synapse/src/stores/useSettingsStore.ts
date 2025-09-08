import { create } from 'zustand';

interface ApiConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  batchSize: number;
}

interface SettingsState {
  theme: 'light' | 'dark';
  fillerWords: string[];
  apiConfig: ApiConfig;
  loadFillerWords: () => Promise<void>;
  toggleTheme: () => void;
  updateApiConfig: (config: Partial<ApiConfig>) => void;
  loadApiConfig: () => void;
  saveApiConfig: () => void;
  validateApiEndpoint: (endpoint: string) => boolean;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark', // Default to dark theme
  fillerWords: [],
  apiConfig: {
    endpoint: '',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
    batchSize: 10,
  },
  loadFillerWords: async () => {
    try {
      // Note: In a real app, you might want to fetch this from a static asset endpoint
      // or handle it differently depending on your build process.
      // Using a direct fetch assumes the file is in the public directory or accessible via a route.
      // For this project, we'll assume it's in the root of the `public` folder.
      const response = await fetch('/filler_words.json');
      if (!response.ok) {
        throw new Error('Failed to load filler words');
      }
      const data = await response.json();
      set({ fillerWords: data.words || [] });
    } catch (error) {
      console.error('Error loading filler words:', error);
      // Keep fillerWords as an empty array on failure
      set({ fillerWords: [] });
    }
  },
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  updateApiConfig: (config: Partial<ApiConfig>) => {
    set((state) => ({
      apiConfig: { ...state.apiConfig, ...config }
    }));
  },
  loadApiConfig: () => {
    try {
      const savedConfig = localStorage.getItem('apiConfig');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        set({ apiConfig: config });
      }
    } catch (error) {
      console.error('Error loading API config from localStorage:', error);
    }
  },
  saveApiConfig: () => {
    try {
      const { apiConfig } = get();
      localStorage.setItem('apiConfig', JSON.stringify(apiConfig));
    } catch (error) {
      console.error('Error saving API config to localStorage:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('Local storage quota exceeded. Please clear some data or reduce the API key size.');
      }
      throw error;
    }
  },
  validateApiEndpoint: (endpoint: string) => {
    try {
      new URL(endpoint);
      return true;
    } catch {
      return false;
    }
  },
}));