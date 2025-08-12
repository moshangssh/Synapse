import { create } from 'zustand';

interface SettingsState {
  fillerWords: string[];
  loadFillerWords: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  fillerWords: [],
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
}));