import { renderHook, act } from '@testing-library/react';
import { useFindReplace } from '../useFindReplace';

// Mock the dependencies
vi.mock('../../stores/useDataStore', () => ({
  useDataStore: vi.fn(),
}));

// Mock global fetch
global.fetch = vi.fn();

// Mock window.alert
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true,
});

describe('useFindReplace', () => {
  const mockSetSubtitles = vi.fn();
  const mockSubtitles = [
    {
      id: 1,
      startTimecode: '00:00:01:00',
      endTimecode: '00:00:03:00',
      text: 'Hello World',
      originalText: 'Hello World',
      diffs: [],
      isModified: false,
    },
    {
      id: 2,
      startTimecode: '00:00:03:00',
      endTimecode: '00:00:05:00',
      text: 'Goodbye World',
      originalText: 'Goodbye World',
      diffs: [],
      isModified: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the useDataStore hook
    const { useDataStore } = require('../../stores/useDataStore');
    useDataStore.mockReturnValue({
      subtitles: mockSubtitles,
      setSubtitles: mockSetSubtitles,
    });

    // Setup fetch mock
    (fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: 'success',
        data: [
          { id: 1, text: 'Hello Earth' },
          { id: 2, text: 'Goodbye Earth' },
        ],
      }),
    });
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
      expect(window.alert).toHaveBeenCalledWith('搜索查询不能为空');
    });

    it('should call API with correct request body', async () => {
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

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/subtitles/replace-all',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subtitles: mockSubtitles.map(sub => ({
              id: sub.id,
              startTimecode: sub.startTimecode,
              endTimecode: sub.endTimecode,
              text: sub.text,
            })),
            searchQuery: 'World',
            replaceQuery: 'Earth',
          }),
        }
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
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({
          detail: { message: 'API Error' },
        }),
      });

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

      expect(window.alert).toHaveBeenCalledWith('API Error');
    });

    it('should handle network error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

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

      expect(window.alert).toHaveBeenCalledWith('替换操作失败，请重试');
    });

    it('should set loading state during API call', async () => {
      let resolveFetch: any;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      (fetch as any).mockReturnValueOnce(fetchPromise);

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

      // Resolve the fetch
      await act(async () => {
        resolveFetch({
          ok: true,
          json: vi.fn().mockResolvedValue({
            status: 'success',
            data: [],
          }),
        });
        await promise;
      });

      // Should not be loading anymore
      expect(result.current.isLoading).toBe(false);
    });
  });
});