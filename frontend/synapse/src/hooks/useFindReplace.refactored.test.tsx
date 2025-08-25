import { renderHook, act } from '@testing-library/react';
import { useFindReplace } from './useFindReplace';
import { Subtitle } from '../types';
import { vi } from 'vitest';
import { useDataStore } from '../stores/useDataStore';
import { 
  setupCommonTestMocks, 
  clearAllMocks,
  createMockDataStore,
  createMockSetSubtitles
} from './testUtils';

// Test data
const mockInitialSubtitles: Subtitle[] = [
  { id: 1, startTimecode: '00:00:00,000', endTimecode: '00:00:01,000', text: 'Hello world, this is a test.', originalText: 'Hello world, this is a test.', diffs: [], isModified: false },
  { id: 2, startTimecode: '00:00:01,000', endTimecode: '00:00:02,000', text: 'Another TEST subtitle.', originalText: 'Another TEST subtitle.', diffs: [], isModified: false },
  { id: 3, startTimecode: '00:00:02,000', endTimecode: '00:00:03,000', text: 'And a third one for testing.', originalText: 'And a third one for testing.', diffs: [], isModified: false },
  { id: 4, startTimecode: '00:00:03,000', endTimecode: '00:00:04,000', text: 'The word test should be found.', originalText: 'The word test should be found.', diffs: [], isModified: false },
];

describe('useFindReplace Hook (Refactored)', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it('should return all subtitles when search query is empty', () => {
    // Setup mocks using test utils
    const { mockSetSubtitles } = setupCommonTestMocks(mockInitialSubtitles);
    
    const { result } = renderHook(() => useFindReplace());

    act(() => {
      result.current.handleSearchChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
    });

    // Case-insensitive search for 'test' should find "test", "TEST", and "testing".
    expect(result.current.filteredSubtitles).toHaveLength(4);
  });

  it('should replace all occurrences when handleReplaceAll is called', () => {
    // Setup mocks
    const mockSetSubtitles = createMockSetSubtitles();
    vi.mocked(useDataStore).mockImplementation(createMockDataStore(mockInitialSubtitles, mockSetSubtitles));
    
    const { result } = renderHook(() => useFindReplace());

    act(() => {
      result.current.handleSearchChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleReplaceChange({ target: { value: 'REPLACED' } } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleReplaceAll();
    });

    expect(mockSetSubtitles).toHaveBeenCalledTimes(1);
    expect(mockSetSubtitles).toHaveBeenCalledWith(expect.any(Array));
  });

  it('should handle empty subtitles list using test utils', () => {
    // Use test utils to setup empty subtitles
    const { mockSetSubtitles } = setupCommonTestMocks([]);
    
    const { result } = renderHook(() => useFindReplace());

    // Should handle empty search query
    expect(result.current.filteredSubtitles).toEqual([]);
    
    // Should handle search with empty subtitles
    act(() => {
      result.current.handleSearchChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.filteredSubtitles).toEqual([]);
    
    // Should handle replace with empty subtitles
    act(() => {
      result.current.handleReplaceChange({ target: { value: 'replace' } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleReplaceAll();
    });
    expect(mockSetSubtitles).not.toHaveBeenCalled();
  });

  it('should handle special characters using test utils', () => {
    const subtitlesWithSpecialChars: Subtitle[] = [
      { id: 1, startTimecode: '00:00:00,000', endTimecode: '00:00:01,000', text: 'Hello [world] test!', originalText: 'Hello [world] test!', diffs: [], isModified: false },
      { id: 2, startTimecode: '00:00:01,000', endTimecode: '00:00:02,000', text: 'Special (chars) here.', originalText: 'Special (chars) here.', diffs: [], isModified: false },
    ];

    const { mockSetSubtitles } = setupCommonTestMocks(subtitlesWithSpecialChars);
    
    const { result } = renderHook(() => useFindReplace());

    // Search with special characters
    act(() => {
      result.current.handleSearchChange({ target: { value: '[world]' } } as React.ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.filteredSubtitles).toHaveLength(1);

    // Replace with special characters
    act(() => {
      result.current.handleReplaceChange({ target: { value: '(universe)' } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleReplaceAll();
    });

    expect(mockSetSubtitles).toHaveBeenCalledTimes(1);
    const updatedSubtitles = mockSetSubtitles.mock.calls[0][0] as Subtitle[];
    expect(updatedSubtitles[0].text).toBe('Hello (universe) test!');
  });
});