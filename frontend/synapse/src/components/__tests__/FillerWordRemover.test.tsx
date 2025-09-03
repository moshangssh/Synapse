import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { FillerWordRemover } from '../FillerWordRemover';

// Mock the stores and hooks
const mockUseDataStore = vi.fn();
const mockUseSettingsStore = vi.fn();
const mockUseNotifier = vi.fn();

vi.mock('../../stores/useDataStore', () => ({
  useDataStore: () => mockUseDataStore()
}));

vi.mock('../../stores/useSettingsStore', () => ({
  useSettingsStore: () => mockUseSettingsStore()
}));

vi.mock('../../hooks/useNotifier', () => ({
  default: () => mockUseNotifier()
}));

describe('FillerWordRemover', () => {
  const mockSetSubtitles = vi.fn();
  const mockNotify = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  };
  const mockLoadFillerWords = vi.fn();

  const mockSubtitles = [
    {
      id: 1,
      startTimecode: '00:00:01:00',
      endTimecode: '00:00:05:00',
      text: '嗯，这是一个测试字幕，啊！',
      originalText: '嗯，这是一个测试字幕，啊！',
      diffs: [],
      isModified: false
    }
  ];

  const mockFillerWords = ['嗯', '啊', '哦'];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock implementations
    mockUseDataStore.mockReturnValue({
      subtitles: mockSubtitles,
      setSubtitles: mockSetSubtitles
    });

    mockUseSettingsStore.mockReturnValue({
      fillerWords: mockFillerWords,
      loadFillerWords: mockLoadFillerWords
    });

    mockUseNotifier.mockReturnValue(mockNotify);

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    (global.fetch as any).mockClear();
  });

  it('renders correctly', () => {
    render(<FillerWordRemover />);
    
    expect(screen.getByText('同时移除标点符号 (谨慎操作)')).toBeInTheDocument();
    expect(screen.getByText('一键去口水词')).toBeInTheDocument();
  });

  it('disables button when no filler words', () => {
    mockUseSettingsStore.mockReturnValue({
      fillerWords: [],
      loadFillerWords: mockLoadFillerWords
    });

    render(<FillerWordRemover />);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when no subtitles', () => {
    mockUseDataStore.mockReturnValue({
      subtitles: [],
      setSubtitles: mockSetSubtitles
    });

    render(<FillerWordRemover />);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls API when button is clicked', async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        data: mockSubtitles.map(sub => ({ ...sub, text: sub.text }))
      })
    });

    render(<FillerWordRemover />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/subtitles/remove-filler-words',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });
  });

  it('shows loading state during API call', async () => {
    const mockFetch = global.fetch as any;
    
    // Mock a delayed response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            status: 'success',
            data: mockSubtitles
          })
        }), 100);
      })
    );

    render(<FillerWordRemover />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Check loading state
    await waitFor(() => {
      expect(button).toHaveTextContent('处理中...');
      expect(button).toBeDisabled();
    });
  });

  it('handles API errors', async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        detail: { message: '服务器错误' }
      })
    });

    render(<FillerWordRemover />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockNotify.error).toHaveBeenCalledWith('服务器错误');
    });
  });

  it('toggles punctuation removal option', () => {
    render(<FillerWordRemover />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});