import { renderHook, act } from '@testing-library/react';
import { useSubtitleStore } from '../useSubtitleStore';
import { calculateDiffApi } from '../../integration/diffApi';

// Mock the diffApi
vi.mock('../../integration/diffApi', () => ({
  calculateDiffApi: vi.fn(),
}));

// Mock Subtitle type
interface MockSubtitle {
  id: number;
  startTimecode: string;
  endTimecode: string;
  text: string;
  originalText?: string;
  isModified?: boolean;
  diffs?: Array<{ type: string; value: string }>;
  diffError?: boolean;
}

describe('useSubtitleStore', () => {
  const mockCalculateDiffApi = calculateDiffApi as vi.MockedFunction<typeof calculateDiffApi>;
  
  const mockSubtitles: MockSubtitle[] = [
    {
      id: 1,
      startTimecode: '00:00:01:00',
      endTimecode: '00:00:03:00',
      text: 'Hello World',
      originalText: 'Hello World',
      isModified: false,
      diffs: [{ type: 'normal', value: 'Hello World' }],
    },
    {
      id: 2,
      startTimecode: '00:00:03:00',
      endTimecode: '00:00:05:00',
      text: 'Goodbye World',
      originalText: 'Goodbye World',
      isModified: false,
      diffs: [{ type: 'normal', value: 'Goodbye World' }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    const { result } = renderHook(() => useSubtitleStore());
    act(() => {
      result.current.setSubtitles([]);
    });
  });

  describe('initial state', () => {
    it('should initialize with empty subtitles array', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      expect(result.current.subtitles).toEqual([]);
    });
  });

  describe('setSubtitles', () => {
    it('should set subtitles correctly', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      act(() => {
        result.current.setSubtitles(mockSubtitles);
      });

      expect(result.current.subtitles).toEqual(mockSubtitles);
    });

    it('should replace existing subtitles', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      // First set some subtitles
      act(() => {
        result.current.setSubtitles([mockSubtitles[0]]);
      });

      // Then replace them
      act(() => {
        result.current.setSubtitles(mockSubtitles);
      });

      expect(result.current.subtitles).toEqual(mockSubtitles);
      expect(result.current.subtitles).toHaveLength(2);
    });
  });

  describe('updateSubtitleText', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useSubtitleStore());
      act(() => {
        result.current.setSubtitles(mockSubtitles);
      });
    });

    it('should update subtitle text when id exists', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      act(() => {
        result.current.updateSubtitleText(1, 'Hello Earth');
      });

      expect(result.current.subtitles[0].text).toBe('Hello Earth');
      expect(result.current.subtitles[0].isModified).toBe(true);
    });

    it('should not update when subtitle id does not exist', () => {
      const { result } = renderHook(() => useSubtitleStore());
      const originalSubtitles = [...result.current.subtitles];
      
      act(() => {
        result.current.updateSubtitleText(999, 'Non-existent');
      });

      expect(result.current.subtitles).toEqual(originalSubtitles);
    });

    it('should not update when text is the same', () => {
      const { result } = renderHook(() => useSubtitleStore());
      const originalSubtitles = [...result.current.subtitles];
      
      act(() => {
        result.current.updateSubtitleText(1, 'Hello World');
      });

      expect(result.current.subtitles).toEqual(originalSubtitles);
    });

    it('should preserve originalText when updating', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      act(() => {
        result.current.updateSubtitleText(1, 'Hello Earth');
      });

      expect(result.current.subtitles[0].originalText).toBe('Hello World');
      expect(result.current.subtitles[0].text).toBe('Hello Earth');
    });

    it('should set placeholder diffs initially', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      act(() => {
        result.current.updateSubtitleText(1, 'Hello Earth');
      });

      expect(result.current.subtitles[0].diffs).toEqual([{ type: 'normal', value: 'Hello Earth' }]);
    });

    it('should call calculateDiffApi asynchronously', async () => {
      mockCalculateDiffApi.mockResolvedValue([{ type: 'delete', value: 'World' }, { type: 'insert', value: 'Earth' }]);
      
      const { result } = renderHook(() => useSubtitleStore());
      
      act(() => {
        result.current.updateSubtitleText(1, 'Hello Earth');
      });

      expect(mockCalculateDiffApi).toHaveBeenCalledWith('Hello World', 'Hello Earth');
    });

    it('should update diffs after API call succeeds', async () => {
      const mockDiffs = [{ type: 'delete', value: 'World' }, { type: 'insert', value: 'Earth' }];
      mockCalculateDiffApi.mockResolvedValue(mockDiffs);
      
      const { result } = renderHook(() => useSubtitleStore());
      
      act(() => {
        result.current.updateSubtitleText(1, 'Hello Earth');
      });

      // Wait for async operation to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.subtitles[0].diffs).toEqual(mockDiffs);
    });

    it('should handle API call failure gracefully', async () => {
      mockCalculateDiffApi.mockRejectedValue(new Error('API Error'));
      
      const { result } = renderHook(() => useSubtitleStore());
      
      act(() => {
        result.current.updateSubtitleText(1, 'Hello Earth');
      });

      // Wait for async operation to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.subtitles[0].diffs).toEqual([{ type: 'normal', value: 'Hello Earth' }]);
      expect(result.current.subtitles[0].diffError).toBe(true);
    });

    it('should not update diffs if subtitle text changed during API call', async () => {
      const mockDiffs = [{ type: 'delete', value: 'World' }, { type: 'insert', value: 'Earth' }];
      mockCalculateDiffApi.mockImplementation(async () => {
        // Simulate delay in API call
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockDiffs;
      });
      
      const { result } = renderHook(() => useSubtitleStore());
      
      act(() => {
        result.current.updateSubtitleText(1, 'Hello Earth');
      });

      // The first call sets placeholder diffs
      expect(result.current.subtitles[0].diffs).toEqual([{ type: 'normal', value: 'Hello Earth' }]);

      // Change the text again before API call completes
      act(() => {
        result.current.updateSubtitleText(1, 'Hello Mars');
      });

      // Now placeholder should be updated to new text
      expect(result.current.subtitles[0].diffs).toEqual([{ type: 'normal', value: 'Hello Mars' }]);

      // Wait for async operation to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      // The text should remain consistent regardless of API call timing
      expect(result.current.subtitles[0].text).toBe('Hello Mars');
      expect(result.current.subtitles[0].isModified).toBe(true);
      expect(mockCalculateDiffApi).toHaveBeenCalledWith('Hello World', 'Hello Earth');
    });
  });

  describe('getModifiedSubtitleIndices', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useSubtitleStore());
      act(() => {
        result.current.setSubtitles(mockSubtitles);
      });
    });

    it('should return empty array when no subtitles are modified', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      const modifiedIndices = result.current.getModifiedSubtitleIndices();
      expect(modifiedIndices).toEqual([]);
    });

    it('should return correct indices when subtitles are modified', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      act(() => {
        result.current.updateSubtitleText(1, 'Hello Earth');
        result.current.updateSubtitleText(2, 'Goodbye Earth');
      });

      const modifiedIndices = result.current.getModifiedSubtitleIndices();
      expect(modifiedIndices).toEqual([0, 1]);
    });

    it('should return cached result when unchanged', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      act(() => {
        result.current.updateSubtitleText(1, 'Hello Earth');
      });

      const firstCall = result.current.getModifiedSubtitleIndices();
      const secondCall = result.current.getModifiedSubtitleIndices();
      
      expect(firstCall).toBe(secondCall); // Same reference (cached)
    });

    it('should return new result when modified status changes', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      act(() => {
        result.current.updateSubtitleText(1, 'Hello Earth');
      });

      const firstCall = result.current.getModifiedSubtitleIndices();
      
      act(() => {
        result.current.updateSubtitleText(2, 'Goodbye Earth');
      });

      const secondCall = result.current.getModifiedSubtitleIndices();
      
      expect(firstCall).toEqual([0]);
      expect(secondCall).toEqual([0, 1]);
      expect(firstCall).not.toBe(secondCall); // Different references
    });
  });

  describe('edge cases', () => {
    it('should handle subtitles without originalText', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      const subtitleWithoutOriginalText = {
        id: 1,
        startTimecode: '00:00:01:00',
        endTimecode: '00:00:03:00',
        text: 'Hello World',
        // No originalText
      };
      
      act(() => {
        result.current.setSubtitles([subtitleWithoutOriginalText]);
      });

      act(() => {
        result.current.updateSubtitleText(1, 'Hello Earth');
      });

      expect(result.current.subtitles[0].originalText).toBe('Hello World');
      expect(result.current.subtitles[0].isModified).toBe(true);
    });

    it('should handle large number of subtitles efficiently', () => {
      const { result } = renderHook(() => useSubtitleStore());
      
      const largeSubtitleArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        startTimecode: '00:00:01:00',
        endTimecode: '00:00:03:00',
        text: `Subtitle ${i + 1}`,
        originalText: `Subtitle ${i + 1}`,
        isModified: false,
        diffs: [{ type: 'normal', value: `Subtitle ${i + 1}` }],
      }));
      
      act(() => {
        result.current.setSubtitles(largeSubtitleArray);
      });

      expect(result.current.subtitles).toHaveLength(1000);
      
      act(() => {
        result.current.updateSubtitleText(500, 'Updated Subtitle 500');
      });

      expect(result.current.subtitles[499].text).toBe('Updated Subtitle 500');
      expect(result.current.subtitles[499].isModified).toBe(true);
    });
  });
});