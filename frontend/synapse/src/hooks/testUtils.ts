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

// Create mock useSubtitleStore implementation
export const createMockSubtitleStore = (subtitles: Subtitle[] = [], setSubtitles = vi.fn()) => {
  return vi.fn((selector) => {
    const mockState = {
      subtitles,
      setSubtitles,
      updateSubtitleText: vi.fn(),
      getModifiedSubtitleIndices: vi.fn(() => []),
    };
    
    if (typeof selector !== 'function') {
      return mockState;
    }
    return selector(mockState);
  });
};

// Create mock useProjectStore implementation
export const createMockProjectStore = () => {
  return vi.fn((selector) => {
    const mockState = {
      subtitleTracks: [],
      projectInfo: null,
      frameRate: 24,
      importedSubtitleFiles: [],
      currentSubtitleSource: null,
      currentImportedFileName: null,
      setProjectInfo: vi.fn(),
      setSubtitleTracks: vi.fn(),
      setFrameRate: vi.fn(),
      setImportedSubtitleFiles: vi.fn(),
      addImportedSubtitleFile: vi.fn(),
      removeImportedSubtitleFile: vi.fn(),
      updateImportedSubtitleFile: vi.fn(),
      clearImportedSubtitleFiles: vi.fn(),
      setCurrentSubtitleSource: vi.fn(),
      setCurrentImportedFileName: vi.fn(),
    };
    
    if (typeof selector !== 'function') {
      return mockState;
    }
    return selector(mockState);
  });
};

// Create mock useConnectionStore implementation
export const createMockConnectionStore = () => {
  return vi.fn((selector) => {
    const mockState = {
      connectionStatus: 'disconnected' as const,
      errorMessage: null,
      userInfo: null,
      setConnectionStatus: vi.fn(),
      setErrorMessage: vi.fn(),
      setUserInfo: vi.fn(),
    };
    
    if (typeof selector !== 'function') {
      return mockState;
    }
    return selector(mockState);
  });
};

// Legacy mock for backward compatibility
export const createMockDataStore = (subtitles: Subtitle[] = [], setSubtitles = vi.fn()) => {
  return createMockSubtitleStore(subtitles, setSubtitles);
};

// Setup all common mocks for tests
export const setupCommonTestMocks = (subtitles: Subtitle[] = []) => {
  const mockSetSubtitles = createMockSetSubtitles();
  
  mockTauriWindowApi();
  
  vi.mock('../stores/useSubtitleStore', () => ({
    useSubtitleStore: createMockSubtitleStore(subtitles, mockSetSubtitles),
  }));
  
  vi.mock('../stores/useProjectStore', () => ({
    useProjectStore: createMockProjectStore(),
  }));
  
  vi.mock('../stores/useConnectionStore', () => ({
    useConnectionStore: createMockConnectionStore(),
  }));
  
  return { mockSetSubtitles };
};

// Clear all mocks
export const clearAllMocks = () => {
  vi.clearAllMocks();
};