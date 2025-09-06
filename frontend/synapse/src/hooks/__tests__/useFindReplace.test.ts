import { renderHook, act } from '@testing-library/react';
import { useFindReplace } from '../useFindReplace';
import { useSubtitleStore } from '../../stores/useSubtitleStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useUIStore } from '../../stores/useUIStore';

// Mock dependencies
vi.mock('../../stores/useSubtitleStore');
vi.mock('../../stores/useProjectStore');
vi.mock('../../stores/useUIStore');

// Mock subtitle service
const mockReplaceAllSubtitles = vi.fn();
vi.mock('../../services/subtitleService', () => ({
  replaceAllSubtitles: mockReplaceAllSubtitles
}));

// Mock window.alert
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true,
});

// Mock Subtitle type
interface MockSubtitle {
  id: number;
  startTimecode: string;
  endTimecode: string;
  text: string;
  originalText?: string;
  isModified?: boolean;
  diffs?: Array<{ type: string; value: string }>;
}

describe('useFindReplace', () => {
  const mockSetSubtitles = vi.fn();
  const mockSubtitles: MockSubtitle[] = [
    {
      id: 1,
      startTimecode: '00:00:01:00',
      endTimecode: '00:00:03:00',
      text: 'Hello World',
      originalText: 'Hello World',
      isModified: false,
      diffs: [],
    },
    {
      id: 2,
      startTimecode: '00:00:03:00',
      endTimecode: '00:00:05:00',
      text: 'Goodbye World',
      originalText: 'Goodbye World',
      isModified: false,
      diffs: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset stores to initial state
    const useSubtitleStore = require('../../stores/useSubtitleStore').useSubtitleStore;
    const useProjectStore = require('../../stores/useProjectStore').useProjectStore;
    const useUIStore = require('../../stores/useUIStore').useUIStore;
    
    useSubtitleStore.mockReturnValue({
      subtitles: mockSubtitles,
      setSubtitles: mockSetSubtitles,
    });
    
    useProjectStore.mockReturnValue({
      projectInfo: null,
      subtitleTracks: [],
      frameRate: 24,
      importedSubtitleFiles: [],
      currentSubtitleSource: null,
      currentImportedFileName: null,
    });
    
    useUIStore.mockReturnValue({
      activeView: 'editor',
      sidebarCollapsed: false,
    });

    // Setup service mock
    mockReplaceAllSubtitles.mockResolvedValue([
      { id: 1, text: 'Hello Earth' },
      { id: 2, text: 'Goodbye Earth' },
    ]);
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useFindReplace());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.replaceQuery).toBe('');
      expect(result.current.showReplace).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(Array.isArray(result.current.filteredSubtitles)).toBe(true);
    });
  });

  describe('handleSearchChange', () => {
    it('should update search query', () => {
      const { result } = renderHook(() => useFindReplace());
      
      act(() => {
        result.current.handleSearchChange({
          target: { value: 'test' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.searchQuery).toBe('test');
    });
  });

  describe('handleReplaceChange', () => {
    it('should update replace query', () => {
      const { result } = renderHook(() => useFindReplace());
      
      act(() => {
        result.current.handleReplaceChange({
          target: { value: 'replacement' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.replaceQuery).toBe('replacement');
    });
  });

  describe('toggleShowReplace', () => {
    it('should toggle showReplace state', () => {
      const { result } = renderHook(() => useFindReplace());
      
      expect(result.current.showReplace).toBe(false);
      
      act(() => {
        result.current.toggleShowReplace();
      });
      
      expect(result.current.showReplace).toBe(true);
      
      act(() => {
        result.current.toggleShowReplace();
      });
      
      expect(result.current.showReplace).toBe(false);
    });
  });

  describe('handleReplaceAll', () => {
    it('should not call API when search query is empty', async () => {
      const { result } = renderHook(() => useFindReplace());
      
      await act(async () => {
        await result.current.handleReplaceAll();
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should call service with correct parameters', async () => {
      const { result } = renderHook(() => useFindReplace());
      
      act(() => {
        result.current.handleSearchChange({
          target: { value: 'World' }
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleReplaceChange({
          target: { value: 'Earth' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      await act(async () => {
        await result.current.handleReplaceAll();
      });

      expect(mockReplaceAllSubtitles).toHaveBeenCalledWith(
        mockSubtitles,
        'World',
        'Earth'
      );
    });

    it('should handle successful replacement', async () => {
      const { result } = renderHook(() => useFindReplace());
      
      act(() => {
        result.current.handleSearchChange({
          target: { value: 'World' }
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleReplaceChange({
          target: { value: 'Earth' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      await act(async () => {
        await result.current.handleReplaceAll();
      });

      expect(mockSetSubtitles).toHaveBeenCalled();
      expect(result.current.searchQuery).toBe('');
      expect(result.current.replaceQuery).toBe('');
    });

    it('should handle API error', async () => {
      mockReplaceAllSubtitles.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useFindReplace());
      
      act(() => {
        result.current.handleSearchChange({
          target: { value: 'World' }
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleReplaceChange({
          target: { value: 'Earth' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      await act(async () => {
        await result.current.handleReplaceAll();
      });

      // Expect error handling to work
      expect(mockReplaceAllSubtitles).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockReplaceAllSubtitles.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFindReplace());
      
      act(() => {
        result.current.handleSearchChange({
          target: { value: 'World' }
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleReplaceChange({
          target: { value: 'Earth' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      await act(async () => {
        await result.current.handleReplaceAll();
      });

      // Expect error handling to work
      expect(mockReplaceAllSubtitles).toHaveBeenCalled();
    });

    it('should set loading state during API call', async () => {
      let resolveService: any;
      const servicePromise = new Promise((resolve) => {
        resolveService = resolve;
      });

      mockReplaceAllSubtitles.mockReturnValueOnce(servicePromise);

      const { result } = renderHook(() => useFindReplace());
      
      act(() => {
        result.current.handleSearchChange({
          target: { value: 'World' }
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleReplaceChange({
          target: { value: 'Earth' }
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Start the API call
      const promise = act(() => {
        return result.current.handleReplaceAll();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the service call
      await act(async () => {
        resolveService([]);
        await promise;
      });

      // Should not be loading anymore
      expect(result.current.isLoading).toBe(false);
    });
  });
});