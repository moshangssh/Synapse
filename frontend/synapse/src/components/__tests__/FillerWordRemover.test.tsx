import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { FillerWordRemover } from '../FillerWordRemover';

// Mock the subtitleService
const mockRemoveFillerWords = vi.fn();
vi.mock('../../services/subtitleService', () => ({
  removeFillerWords: mockRemoveFillerWords
}));

// Mock the stores and hooks
const mockUseSubtitleStore = vi.fn();
const mockUseSettingsStore = vi.fn();
const mockUseNotifier = vi.fn();

vi.mock('../../stores/useSubtitleStore', () => ({
  useSubtitleStore: () => mockUseSubtitleStore()
}));

vi.mock('../../stores/useSettingsStore', () => ({
  useSettingsStore: () => mockUseSettingsStore()
}));

vi.mock('../../hooks/useNotifier', () => ({
  default: () => mockUseNotifier()
}));

vi.mock('../../services/subtitleService', () => ({
  removeFillerWords: vi.fn()
}));

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

describe('FillerWordRemover', () => {
  const mockSetSubtitles = vi.fn();
  const mockNotify = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  };
  const mockLoadFillerWords = vi.fn();
  const mockRemoveFillerWords = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock implementations
    mockUseSubtitleStore.mockReturnValue({
      subtitles: mockSubtitles,
      setSubtitles: mockSetSubtitles
    });

    mockUseSettingsStore.mockReturnValue({
      fillerWords: mockFillerWords,
      loadFillerWords: mockLoadFillerWords
    });

    mockUseNotifier.mockReturnValue(mockNotify);

    // Mock service functions
    mockRemoveFillerWords.mockResolvedValue(mockSubtitles);
  });

  afterEach(() => {
    mockRemoveFillerWords.mockClear();
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
    mockUseSubtitleStore.mockReturnValue({
      subtitles: [],
      setSubtitles: mockSetSubtitles
    });

    render(<FillerWordRemover />);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls API when button is clicked', async () => {
    const processedSubtitles = mockSubtitles.map(sub => ({ ...sub, text: sub.text }));
    
    // 重新导入模块以获取mock函数的引用
    const { removeFillerWords } = await import('../../services/subtitleService');
    removeFillerWords.mockResolvedValueOnce(processedSubtitles);

    render(<FillerWordRemover />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(removeFillerWords).toHaveBeenCalledWith(
        mockSubtitles,
        false // removePunctuation is false by default
      );
    });
  });

  it('shows loading state during API call', async () => {
    // Mock a delayed response
    mockRemoveFillerWords.mockImplementationOnce(() => 
      new Promise(resolve => {
        setTimeout(() => resolve(mockSubtitles), 100);
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
    mockRemoveFillerWords.mockRejectedValueOnce(new Error('服务器错误'));

    render(<FillerWordRemover />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockNotify.error).toHaveBeenCalledWith('移除失败，请检查控制台获取更多信息。');
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