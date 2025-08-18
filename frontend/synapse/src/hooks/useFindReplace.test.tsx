import { renderHook, act } from '@testing-library/react';
import { useFindReplace } from './useFindReplace';
import { Subtitle } from '../types';
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import React from 'react';
import { useDataStore } from '../stores/useDataStore';
// Mock Tauri window API
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    isMaximized: vi.fn().mockResolvedValue(false),
    setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
    minimize: vi.fn().mockResolvedValue(undefined),
    maximize: vi.fn().mockResolvedValue(undefined),
    unmaximize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    onResized: vi.fn().mockResolvedValue(() => {}), // Return a function to unsubscribe
  })),
}));

const mockInitialSubtitles: Subtitle[] = [
  { id: 1, startTimecode: '00:00:00,000', endTimecode: '00:00:01,000', text: 'Hello world, this is a test.', originalText: 'Hello world, this is a test.', diffs: [], isModified: false },
  { id: 2, startTimecode: '00:00:01,000', endTimecode: '00:00:02,000', text: 'Another TEST subtitle.', originalText: 'Another TEST subtitle.', diffs: [], isModified: false },
  { id: 3, startTimecode: '00:00:02,000', endTimecode: '00:00:03,000', text: 'And a third one for testing.', originalText: 'And a third one for testing.', diffs: [], isModified: false },
  { id: 4, startTimecode: '00:00:03,000', endTimecode: '00:00:04,000', text: 'The word test should be found.', originalText: 'The word test should be found.', diffs: [], isModified: false },
];

const mockSetSubtitles = vi.fn();

const mockAppSubtitles: Subtitle[] = [
  { id: 1, startTimecode: '00:00:00,000', endTimecode: '00:00:01,000', text: 'Hello world, this is a original.', originalText: 'Hello world, this is a original.', diffs: [{ type: "normal", value: 'Hello world, this is a original.' }], isModified: false },
  { id: 2, startTimecode: '00:00:01,000', endTimecode: '00:00:02,000', text: 'Another ORIGINAL subtitle.', originalText: 'Another ORIGINAL subtitle.', diffs: [{ type: "normal", value: 'Another ORIGINAL subtitle.' }], isModified: false },
  { id: 3, startTimecode: '00:00:02,000', endTimecode: '00:00:03,000', text: 'And a third one for testing.', originalText: 'And a third one for testing.', diffs: [{ type: "normal", value: 'And a third one for testing.' }], isModified: false },
  { id: 4, startTimecode: '00:00:03,000', endTimecode: '00:00:04,000', text: 'The word original should be found.', originalText: 'The word original should be found.', diffs: [{ type: "normal", value: 'The word original should be found.' }], isModified: false },
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


// Simple mock implementation
vi.mock('../stores/useDataStore', () => ({
  useDataStore: vi.fn((selector) => {
    const mockState = {
      subtitles: [],
      subtitleTracks: [],
      projectInfo: null,
      frameRate: 24,
      connectionStatus: 'disconnected',
      errorMessage: null,
      userInfo: null,
      importedSubtitleFiles: [],
      setSubtitles: mockSetSubtitles,
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
    // If no selector is provided, return the entire mock state
    if (typeof selector !== 'function') {
      return mockState;
    }
    return selector(mockState);
  }),
}));

describe('useFindReplace Hook and App Integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return all subtitles when search query is empty', () => {
    // Set up mock data for this test
    vi.mocked(useDataStore).mockImplementation((selector: any) => {
      const mockState = {
        subtitles: mockInitialSubtitles,
        subtitleTracks: [],
        projectInfo: null,
        frameRate: 24,
        connectionStatus: 'disconnected',
        errorMessage: null,
        userInfo: null,
        importedSubtitleFiles: [],
        setSubtitles: mockSetSubtitles,
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
    
    const { result } = renderHook(() => useFindReplace());

    expect(result.current.filteredSubtitles).toEqual(mockInitialSubtitles);
  });

  it('should filter subtitles based on search query (case-insensitive)', () => {
    // Set up mock data for this test
    vi.mocked(useDataStore).mockImplementation((selector: any) => {
      const mockState = {
        subtitles: mockInitialSubtitles,
        subtitleTracks: [],
        projectInfo: null,
        frameRate: 24,
        connectionStatus: 'disconnected',
        errorMessage: null,
        userInfo: null,
        importedSubtitleFiles: [],
        setSubtitles: mockSetSubtitles,
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
    
    const { result } = renderHook(() => useFindReplace());

    act(() => {
      result.current.handleSearchChange({ target: { value: 'test' } } as React.ChangeEvent<HTMLInputElement>);
    });

    // Case-insensitive search for 'test' should find "test", "TEST", and "testing".
    expect(result.current.filteredSubtitles).toHaveLength(4);
  });

  it('should filter subtitles with match case enabled', () => {
    // Set up mock data for this test
    vi.mocked(useDataStore).mockImplementation((selector: any) => {
      const mockState = {
        subtitles: mockInitialSubtitles,
        subtitleTracks: [],
        projectInfo: null,
        frameRate: 24,
        connectionStatus: 'disconnected',
        errorMessage: null,
        userInfo: null,
        importedSubtitleFiles: [],
        setSubtitles: mockSetSubtitles,
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
    // Set up mock data for this test
    vi.mocked(useDataStore).mockImplementation((selector: any) => {
      const mockState = {
        subtitles: mockInitialSubtitles,
        subtitleTracks: [],
        projectInfo: null,
        frameRate: 24,
        connectionStatus: 'disconnected',
        errorMessage: null,
        userInfo: null,
        importedSubtitleFiles: [],
        setSubtitles: mockSetSubtitles,
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
    // Set up mock data for this test
    vi.mocked(useDataStore).mockImplementation((selector: any) => {
      const mockState = {
        subtitles: mockInitialSubtitles,
        subtitleTracks: [],
        projectInfo: null,
        frameRate: 24,
        connectionStatus: 'disconnected',
        errorMessage: null,
        userInfo: null,
        importedSubtitleFiles: [],
        setSubtitles: mockSetSubtitles,
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
    
    const { result } = renderHook(() => useFindReplace());

    act(() => {
      result.current.toggleUseRegex();
      // This regex should find "test" or "third"
      result.current.handleSearchChange({ target: { value: 'test|third' } } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.filteredSubtitles).toHaveLength(4);
  });

  it('should handle invalid regex gracefully', () => {
    // Set up mock data for this test
    vi.mocked(useDataStore).mockImplementation((selector: any) => {
      const mockState = {
        subtitles: mockInitialSubtitles,
        subtitleTracks: [],
        projectInfo: null,
        frameRate: 24,
        connectionStatus: 'disconnected',
        errorMessage: null,
        userInfo: null,
        importedSubtitleFiles: [],
        setSubtitles: mockSetSubtitles,
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
    // Set up mock data for this test
    vi.mocked(useDataStore).mockImplementation((selector: any) => {
      const mockState = {
        subtitles: mockInitialSubtitles,
        subtitleTracks: [],
        projectInfo: null,
        frameRate: 24,
        connectionStatus: 'disconnected',
        errorMessage: null,
        userInfo: null,
        importedSubtitleFiles: [],
        setSubtitles: mockSetSubtitles,
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

  it('should update the UI correctly when handleReplaceAll is called', async () => {
    // For this specific test, we need to use the mockAppSubtitles
    vi.mocked(useDataStore).mockImplementation((selector: any) => {
      const mockState = {
        subtitles: mockAppSubtitles,
        subtitleTracks: [],
        projectInfo: null,
        frameRate: 24,
        connectionStatus: 'disconnected',
        errorMessage: null,
        userInfo: null,
        importedSubtitleFiles: [],
        setSubtitles: mockSetSubtitles,
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

    render(<App />);

    // 1. Wait for subtitles to be loaded
    await waitFor(() => {
      expect(screen.getByText('Hello world, this is a original.')).toBeInTheDocument();
    }, { timeout: 5000 });

    // 2. Show the find/replace inputs
    const findReplaceButton = screen.getByRole('button', { name: /find/i });
    fireEvent.click(findReplaceButton);
    
    // 3. Simulate user input for find and replace
    const findInput = screen.getByPlaceholderText('搜索');
    const replaceInput = screen.getByPlaceholderText('替换');
    
    act(() => {
      fireEvent.change(findInput, { target: { value: 'original' } });
      fireEvent.change(replaceInput, { target: { value: 'replaced' } });
    });

    // 4. Simulate clicking the "Replace All" button
    const replaceAllButton = screen.getByTitle('全部替换');
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
    }, { timeout: 5000 });
  });
});