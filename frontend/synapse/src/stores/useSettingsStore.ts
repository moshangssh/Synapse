import { create } from 'zustand';

interface ApiConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  batchSize: number;
  parallelismCount: number;
  apiKey: string;
  apiUrl: string;
}

// 开发环境预设配置
const DEVELOPMENT_PRESETS = {
  openai: {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
    batchSize: 10,
    parallelismCount: 3,
    apiKey: '',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
  },
  anthropic: {
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 2000,
    batchSize: 10,
    parallelismCount: 3,
    apiKey: '',
    apiUrl: 'https://api.anthropic.com/v1/messages',
  },
  local: {
    model: 'GLM-4.5',
    temperature: 0.7,
    maxTokens: 2000,
    batchSize: 10,
    parallelismCount: 3,
    apiKey: '',
    apiUrl: 'http://localhost:8000/v1/chat/completions',
  },
} as const;

type PresetType = keyof typeof DEVELOPMENT_PRESETS;

interface SettingsState {
  theme: 'light' | 'dark';
  fillerWords: string[];
  apiConfig: ApiConfig;
  loadFillerWords: () => Promise<void>;
  toggleTheme: () => void;
  updateApiConfig: (config: Partial<ApiConfig>) => void;
  loadApiConfig: () => void;
  saveApiConfig: () => void;
  applyPreset: (presetType: PresetType) => void;
  getAvailablePresets: () => Array<{ key: PresetType; name: string; description: string }>;
  isDevelopmentMode: () => boolean;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark', // Default to dark theme
  fillerWords: [],
  apiConfig: {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
    batchSize: 10,
    parallelismCount: 3,
    apiKey: '',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
  },
  loadFillerWords: async () => {
    try {
      // Note: In a real app, you might want to fetch this from a static asset endpoint
      // or handle it differently depending on your build process.
      // Using a direct fetch assumes that file is in the root of the `public` folder.
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
      throw error;
    }
  },
  applyPreset: (presetType: PresetType) => {
    const preset = DEVELOPMENT_PRESETS[presetType];
    set((state) => ({
      apiConfig: { ...state.apiConfig, ...preset }
    }));
  },
  getAvailablePresets: () => {
    return [
      {
        key: 'openai',
        name: 'OpenAI',
        description: 'OpenAI GPT-4 模型配置'
      },
      {
        key: 'anthropic',
        name: 'Anthropic',
        description: 'Anthropic Claude 3 模型配置'
      },
      {
        key: 'local',
        name: 'Local Server',
        description: '本地服务器模型配置'
      }
    ];
  },
  isDevelopmentMode: () => {
    return import.meta.env.DEV || import.meta.env.MODE === 'development';
  },
}));