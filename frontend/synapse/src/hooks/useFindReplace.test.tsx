import { renderHook, act } from '@testing-library/react';
import { useFindReplace } from './useFindReplace';
import { Subtitle } from '../types';
import { vi } from 'vitest';

const mockInitialSubtitles: Subtitle[] = [
  { id: 1, startTimecode: '00:00:00,000', endTimecode: '00:00:01,000', text: 'Hello world, this is a test.', originalText: 'Hello world, this is a test.', diffs: [] },
  { id: 2, startTimecode: '00:00:01,000', endTimecode: '00:00:02,000', text: 'Another TEST subtitle.', originalText: 'Another TEST subtitle.', diffs: [] },
  { id: 3, startTimecode: '00:00:02,000', endTimecode: '00:00:03,000', text: 'And a third one for testing.', originalText: 'And a third one for testing.', diffs: [] },
  { id: 4, startTimecode: '00:00:03,000', endTimecode: '00:00:04,000', text: 'The word test should be found.', originalText: 'The word test should be found.', diffs: [] },
];

describe('useFindReplace Hook', () => {
  it('should return all subtitles when search query is empty', () => {
    const setSubtitles = vi.fn();
    const { result } = renderHook(() => useFindReplace({ subtitles: mockInitialSubtitles, setSubtitles }));

    expect(result.current.filteredSubtitles).toEqual(mockInitialSubtitles);
  });

  it('should filter subtitles based on search query (case-insensitive)', () => {
    const setSubtitles = vi.fn();
    const { result } = renderHook(() => useFindReplace({ subtitles: mockInitialSubtitles, setSubtitles }));

    act(() => {
      result.current.handleSearchChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.filteredSubtitles).toHaveLength(3);
    expect(result.current.filteredSubtitles.map(s => s.id)).toEqual([1, 2, 4]);
  });

  it('should filter subtitles with match case enabled', () => {
    const setSubtitles = vi.fn();
    const { result } = renderHook(() => useFindReplace({ subtitles: mockInitialSubtitles, setSubtitles }));

    act(() => {
      result.current.toggleMatchCase();
      result.current.handleSearchChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
    });
    
    expect(result.current.filteredSubtitles).toHaveLength(2);
    expect(result.current.filteredSubtitles.map(s => s.id)).toEqual([1, 4]);
  });

  it('should filter subtitles with match whole word enabled', () => {
    const setSubtitles = vi.fn();
    const { result } = renderHook(() => useFindReplace({ subtitles: mockInitialSubtitles, setSubtitles }));

    act(() => {
      result.current.toggleMatchWholeWord();
      result.current.handleSearchChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.filteredSubtitles).toHaveLength(2);
    expect(result.current.filteredSubtitles.map(s => s.id)).toEqual([2, 4]);
  });

  it('should filter subtitles with regex enabled', () => {
    const setSubtitles = vi.fn();
    const { result } = renderHook(() => useFindReplace({ subtitles: mockInitialSubtitles, setSubtitles }));

    act(() => {
      result.current.toggleUseRegex();
      // This regex should find "test" or "third"
      result.current.handleSearchChange({ target: { value: 'test|third' } } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.filteredSubtitles).toHaveLength(4);
    expect(result.current.filteredSubtitles.map(s => s.id)).toEqual([1, 2, 3, 4]);
  });

  it('should handle invalid regex gracefully', () => {
    const setSubtitles = vi.fn();
    const { result } = renderHook(() => useFindReplace({ subtitles: mockInitialSubtitles, setSubtitles }));

    act(() => {
      result.current.toggleUseRegex();
      // Invalid regex with an unclosed parenthesis
      result.current.handleSearchChange({ target: { value: 'test(' } } as React.ChangeEvent<HTMLInputElement>);
    });

    // Should not crash and should return the original array
    expect(result.current.filteredSubtitles).toEqual(mockInitialSubtitles);
  });

  it('should replace all occurrences when handleReplaceAll is called', () => {
    const setSubtitles = vi.fn();
    const { result } = renderHook(() => useFindReplace({ subtitles: mockInitialSubtitles, setSubtitles }));

    act(() => {
      result.current.handleSearchChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleReplaceChange({ target: { value: 'REPLACED' } } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleReplaceAll();
    });

    expect(setSubtitles).toHaveBeenCalledTimes(1);
    const updatedSubtitles = setSubtitles.mock.calls[0][0];
    
    // Check the subtitles that should have been changed
    expect(updatedSubtitles[0].text).toBe('Hello world, this is a REPLACED.');
    expect(updatedSubtitles[1].text).toBe('Another REPLACED subtitle.');
    expect(updatedSubtitles[3].text).toBe('The word REPLACED should be found.');

    // Check the subtitle that should NOT have been changed
    expect(updatedSubtitles[2].text).toBe('And a third one for testing.');
  });
});