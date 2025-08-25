import { vi } from 'vitest';
import { Subtitle } from '../types';

// Mock Tauri window API
export const mockTauriWindowApi = () => {
  vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: vi.fn(() => ({
      isMaximized: vi.fn().mockResolvedValue(false),
      setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
      minimize: vi.fn().mockResolvedValue(undefined),
      maximize: vi.fn().mockResolvedValue(undefined),
      unmaximize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      onResized: vi.fn().mockResolvedValue(() => {}),
    })),
  }));
};

// Mock fetch API
export const mockFetchApi = (responseData: any) => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(responseData),
    } as Response)
  ));
};

// Create mock subtitles
export const createMockSubtitles = (count: number = 4): Subtitle[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    startTimecode: `00:00:${i.toString().padStart(2, '0')},000`,
    endTimecode: `00:00:${(i + 1).toString().padStart(2, '0')},000`,
    text: `Subtitle ${i + 1}`,
    originalText: `Subtitle ${i + 1}`,
    diffs: [{ type: "normal", value: `Subtitle ${i + 1}` }],
    isModified: false,
  }));
};

// Create mock setSubtitles function
export const createMockSetSubtitles = () => vi.fn();

// Create mock useDataStore implementation
export const createMockDataStore = (subtitles: Subtitle[] = [], setSubtitles = vi.fn()) => {
  return vi.fn((selector) => {
    const mockState = {
      subtitles,
      subtitleTracks: [],
      projectInfo: null,
      frameRate: 24,
      connectionStatus: 'disconnected',
      errorMessage: null,
      userInfo: null,
      importedSubtitleFiles: [],
      setSubtitles,
      setSubtitleTracks: vi.fn(),
      setProjectInfo: vi.fn(),
      setFrameRate: vi.fn(),
      setConnectionStatus: vi.fn(),
      setErrorMessage: vi.fn(),
      updateSubtitleText: vi.fn(),
      setUserInfo: vi.fn(),
      setImportedSubtitleFiles: vi.fn(),
      addImportedSubtitleFile: vi.fn(),
      removeImportedSubtitleFile: vi.fn(),
      updateImportedSubtitleFile: vi.fn(),
      clearImportedSubtitleFiles: vi.fn(),
      getModifiedSubtitleIndices: vi.fn(() => []),
    };
    
    if (typeof selector !== 'function') {
      return mockState;
    }
    return selector(mockState);
  });
};

// Setup all common mocks for tests
export const setupCommonTestMocks = (subtitles: Subtitle[] = []) => {
  const mockSetSubtitles = createMockSetSubtitles();
  
  mockTauriWindowApi();
  
  vi.mock('../stores/useDataStore', () => ({
    useDataStore: createMockDataStore(subtitles, mockSetSubtitles),
  }));
  
  return { mockSetSubtitles };
};

// Clear all mocks
export const clearAllMocks = () => {
  vi.clearAllMocks();
};