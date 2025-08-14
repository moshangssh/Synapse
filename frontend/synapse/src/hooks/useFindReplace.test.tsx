import { renderHook, act } from '@testing-library/react';
import { useFindReplace } from './useFindReplace';
import { Subtitle } from '../types';
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import React from 'react';

const mockInitialSubtitles: Subtitle[] = [
  { id: 1, startTimecode: '00:00:00,000', endTimecode: '00:00:01,000', text: 'Hello world, this is a test.', originalText: 'Hello world, this is a test.', diffs: [] },
  { id: 2, startTimecode: '00:00:01,000', endTimecode: '00:00:02,000', text: 'Another TEST subtitle.', originalText: 'Another TEST subtitle.', diffs: [] },
  { id: 3, startTimecode: '00:00:02,000', endTimecode: '00:00:03,000', text: 'And a third one for testing.', originalText: 'And a third one for testing.', diffs: [] },
  { id: 4, startTimecode: '00:00:03,000', endTimecode: '00:00:04,000', text: 'The word test should be found.', originalText: 'The word test should be found.', diffs: [] },
];

const mockAppSubtitles: Subtitle[] = [
  { id: 1, startTimecode: '00:00:00,000', endTimecode: '00:00:01,000', text: 'Hello world, this is a original.', originalText: 'Hello world, this is a original.', diffs: [] },
  { id: 2, startTimecode: '00:00:01,000', endTimecode: '00:00:02,000', text: 'Another ORIGINAL subtitle.', originalText: 'Another ORIGINAL subtitle.', diffs: [] },
  { id: 3, startTimecode: '00:00:02,000', endTimecode: '00:00:03,000', text: 'And a third one for testing.', originalText: 'And a third one for testing.', diffs: [] },
  { id: 4, startTimecode: '00:00:03,000', endTimecode: '00:00:04,000', text: 'The word original should be found.', originalText: 'The word original should be found.', diffs: [] },
];


// Mock fetch for App integration test
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      status: 'success',
      data: mockAppSubtitles,
      frameRate: 24,
    }),
  } as Response)
));


describe('useFindReplace Hook and App Integration', () => {
  // Mock the zustand store before each test
  beforeEach(() => {
    vi.mock('../stores/useDataStore', () => ({
      useDataStore: vi.fn((selector) => {
        const mockState = {
          subtitles: mockInitialSubtitles,
          setSubtitles: vi.fn(),
        };
        return selector(mockState);
      }),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return all subtitles when search query is empty', () => {
    const { result } = renderHook(() => useFindReplace());

    expect(result.current.filteredSubtitles).toEqual(mockInitialSubtitles);
  });

  it('should filter subtitles based on search query (case-insensitive)', () => {
    const { result } = renderHook(() => useFindReplace());

    act(() => {
      result.current.handleSearchChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
    });

    // Case-insensitive search for 'test' should find "test", "TEST", and "testing".
    expect(result.current.filteredSubtitles).toHaveLength(4);
  });

  it('should filter subtitles with match case enabled', () => {
    const { result } = renderHook(() => useFindReplace());

    act(() => {
      result.current.handleSearchChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
    });
    
    act(() => {
      result.current.toggleMatchCase();
    });
    
    // Case-sensitive search for 'test' should find "test" and "testing", but not "TEST".
    expect(result.current.filteredSubtitles).toHaveLength(3);
  });

  it('should filter subtitles with match whole word enabled', () => {
    const { result } = renderHook(() => useFindReplace());

    act(() => {
      result.current.handleSearchChange({ target: { value: 'TEST' } } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.toggleMatchWholeWord();
    });

    // Case-insensitive, whole-word search for 'TEST' should find "test" and "TEST" but not "testing".
    expect(result.current.filteredSubtitles).toHaveLength(3);
  });

  it('should filter subtitles with regex enabled', () => {
    const { result } = renderHook(() => useFindReplace());

    act(() => {
      result.current.toggleUseRegex();
      // This regex should find "test" or "third"
      result.current.handleSearchChange({ target: { value: 'test|third' } } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.filteredSubtitles).toHaveLength(4);
  });

  it('should handle invalid regex gracefully', () => {
    const { result } = renderHook(() => useFindReplace());

    act(() => {
      result.current.toggleUseRegex();
      // Invalid regex with an unclosed parenthesis
      result.current.handleSearchChange({ target: { value: 'test(' } } as React.ChangeEvent<HTMLInputElement>);
    });

    // Should not crash and should return the original array
    expect(result.current.filteredSubtitles).toEqual(mockInitialSubtitles);
  });

  it('should replace all occurrences when handleReplaceAll is called', () => {
    // Create a spy on the setSubtitles function
    const mockSetSubtitles = vi.fn();
    
    // Re-mock the store with our spy function for this specific test
    vi.mock('../stores/useDataStore', () => ({
      useDataStore: vi.fn((selector) => {
        const mockState = {
          subtitles: mockInitialSubtitles,
          setSubtitles: mockSetSubtitles,
        };
        return selector(mockState);
      }),
    }));
    
    const { result } = renderHook(() => useFindReplace());

    act(() => {
      result.current.handleSearchChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleReplaceChange({ target: { value: 'REPLACED' } } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleReplaceAll();
    });

    expect(mockSetSubtitles).toHaveBeenCalledTimes(1);
    expect(mockSetSubtitles).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should update the UI correctly when handleReplaceAll is called', async () => {
    render(<App />);

    // 1. Wait for subtitles to be loaded
    await waitFor(() => {
      expect(screen.getByText('Hello world, this is a original.')).toBeInTheDocument();
    });

    // 2. Show the find/replace inputs
    const findReplaceButton = screen.getByRole('button', { name: /find/i });
    fireEvent.click(findReplaceButton);
    
    // 3. Simulate user input for find and replace
    const findInput = screen.getByPlaceholderText('Find');
    const replaceInput = screen.getByPlaceholderText('Replace');
    
    act(() => {
      fireEvent.change(findInput, { target: { value: 'original' } });
      fireEvent.change(replaceInput, { target: { value: 'replaced' } });
    });

    // 4. Simulate clicking the "Replace All" button
    const replaceAllButton = screen.getByRole('button', { name: 'Replace All' });
    act(() => {
      fireEvent.click(replaceAllButton);
    });

    // 5. Assert that the subtitles in the UI have been updated
    await waitFor(() => {
      expect(screen.getByText('Hello world, this is a replaced.')).toBeInTheDocument();
      expect(screen.getByText('Another ORIGINAL subtitle.')).toBeInTheDocument(); // This should not be replaced due to case
      expect(screen.getByText('The word replaced should be found.')).toBeInTheDocument();
      // This one should not change
      expect(screen.getByText('And a third one for testing.')).toBeInTheDocument();
    });
  });
});