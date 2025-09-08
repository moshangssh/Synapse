import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useSettingsStore } from '../useSettingsStore';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useSettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      expect(result.current.theme).toBe('dark');
      expect(result.current.fillerWords).toEqual([]);
      expect(result.current.apiConfig).toEqual({
        endpoint: '',
        apiKey: '',
      });
    });
  });

  describe('API configuration management', () => {
    it('should update API config partially', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      act(() => {
        result.current.updateApiConfig({ endpoint: 'https://api.example.com' });
      });
      
      expect(result.current.apiConfig).toEqual({
        endpoint: 'https://api.example.com',
        apiKey: '',
      });
    });

    it('should update API config completely', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      act(() => {
        result.current.updateApiConfig({
          endpoint: 'https://api.example.com',
          apiKey: 'test-key',
        });
      });
      
      expect(result.current.apiConfig).toEqual({
        endpoint: 'https://api.example.com',
        apiKey: 'test-key',
      });
    });

    it('should validate API endpoint URL', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      expect(result.current.validateApiEndpoint('https://api.example.com')).toBe(true);
      expect(result.current.validateApiEndpoint('http://localhost:8000')).toBe(true);
      expect(result.current.validateApiEndpoint('invalid-url')).toBe(false);
      expect(result.current.validateApiEndpoint('')).toBe(false);
      expect(result.current.validateApiEndpoint('not-a-url')).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should save API config to localStorage', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      act(() => {
        result.current.updateApiConfig({
          endpoint: 'https://api.example.com',
          apiKey: 'test-key',
        });
        result.current.saveApiConfig();
      });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'apiConfig',
        JSON.stringify({
          endpoint: 'https://api.example.com',
          apiKey: 'test-key',
        })
      );
    });

    it('should load API config from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        endpoint: 'https://loaded.example.com',
        apiKey: 'loaded-key',
      }));
      
      const { result } = renderHook(() => useSettingsStore());
      
      act(() => {
        result.current.loadApiConfig();
      });
      
      expect(result.current.apiConfig).toEqual({
        endpoint: 'https://loaded.example.com',
        apiKey: 'loaded-key',
      });
    });

    it('should handle invalid JSON in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      
      const { result } = renderHook(() => useSettingsStore());
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      act(() => {
        result.current.loadApiConfig();
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading API config from localStorage:',
        expect.any(Error)
      );
      
      // Should keep default values
      expect(result.current.apiConfig).toEqual({
        endpoint: '',
        apiKey: '',
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle localStorage quota exceeded error', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      // Mock localStorage to throw quota exceeded error
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw error;
      });
      
      act(() => {
        result.current.updateApiConfig({
          endpoint: 'https://api.example.com',
          apiKey: 'test-key',
        });
        
        expect(() => {
          result.current.saveApiConfig();
        }).toThrow('Local storage quota exceeded. Please clear some data or reduce the API key size.');
      });
    });
  });

  describe('theme management', () => {
    it('should toggle theme between light and dark', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      expect(result.current.theme).toBe('dark');
      
      act(() => {
        result.current.toggleTheme();
      });
      
      expect(result.current.theme).toBe('light');
      
      act(() => {
        result.current.toggleTheme();
      });
      
      expect(result.current.theme).toBe('dark');
    });
  });

  describe('filler words management', () => {
    it('should load filler words from API', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ words: ['um', 'ah', 'like'] }),
      };
      
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useSettingsStore());
      
      await act(async () => {
        await result.current.loadFillerWords();
      });
      
      expect(result.current.fillerWords).toEqual(['um', 'ah', 'like']);
      expect(fetch).toHaveBeenCalledWith('/filler_words.json');
    });

    it('should handle API error when loading filler words', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Not Found',
      };
      
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useSettingsStore());
      
      await act(async () => {
        await result.current.loadFillerWords();
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('Error loading filler words:', expect.any(Error));
      expect(result.current.fillerWords).toEqual([]);
      
      consoleSpy.mockRestore();
    });

    it('should handle network error when loading filler words', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useSettingsStore());
      
      await act(async () => {
        await result.current.loadFillerWords();
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('Error loading filler words:', expect.any(Error));
      expect(result.current.fillerWords).toEqual([]);
      
      consoleSpy.mockRestore();
    });
  });
});