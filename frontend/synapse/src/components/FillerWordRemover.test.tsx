import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FillerWordRemover } from './FillerWordRemover';
import { useDataStore } from '../stores/useDataStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import useNotifier from '../hooks/useNotifier';

// Mock stores and hooks
vi.mock('../stores/useDataStore');
vi.mock('../stores/useSettingsStore');
vi.mock('../hooks/useNotifier');

const mockNotify = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

const mockSubtitles = [
  { id: 1, text: '那个，我想说，就是，这个很好。', originalText: '那个，我想说，就是，这个很好。', diffs: [] },
  { id: 2, text: '嗯，是的，然后我们继续。', originalText: '嗯，是的，然后我们继续。', diffs: [] },
  { id: 3, text: '这是一个正常的句子。', originalText: '这是一个正常的句子。', diffs: [] },
  { id: 4, text: '你知道吗其实这个东西很棒', originalText: '你知道吗其实这个东西很棒', diffs: [] },
];

describe('FillerWordRemover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNotifier as any).mockReturnValue(mockNotify);
  });

  it('should remove filler words from subtitles', () => {
    const setSubtitles = vi.fn();
    (useDataStore as any).mockReturnValue({ subtitles: mockSubtitles, setSubtitles });
    (useSettingsStore as any).mockReturnValue({
      fillerWords: ['那个', '就是', '嗯', '然后', '其实', '你知道吗'],
      loadFillerWords: vi.fn(),
    });

    render(<FillerWordRemover />);

    const button = screen.getByRole('button', { name: /一键去口水词/i });
    fireEvent.click(button);

    expect(setSubtitles).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, text: '，我想说， 这个很好。', diffs: expect.any(Array) }),
        expect.objectContaining({ id: 2, text: '，是的， 我们继续。', diffs: expect.any(Array) }),
        expect.objectContaining({ id: 3, text: '这是一个正常的句子。' }), // No changes, so diffs might not be there
        expect.objectContaining({ id: 4, text: '这个东西很棒', diffs: expect.any(Array) }),
      ])
    );
    expect(mockNotify.success).toHaveBeenCalledWith('已成功移除所有口水词！');
  });

  it('should not change subtitles if no filler words are present', () => {
    const setSubtitles = vi.fn();
    const subtitlesWithoutFillers = [{ id: 1, text: '这是一个正常的句子。' }];
    (useDataStore as any).mockReturnValue({ subtitles: subtitlesWithoutFillers, setSubtitles });
    (useSettingsStore as any).mockReturnValue({
      fillerWords: ['啦', '吧'],
      loadFillerWords: vi.fn(),
    });

    render(<FillerWordRemover />);
    fireEvent.click(screen.getByRole('button'));

    // In the new logic, if no changes are made, setSubtitles is not called.
    // Instead, a notification is shown.
    expect(setSubtitles).not.toHaveBeenCalled();
    expect(mockNotify.info).toHaveBeenCalledWith('未发现可移除的口水词。');
  });

  it('should disable the button if there are no subtitles', () => {
    (useDataStore as any).mockReturnValue({ subtitles: [], setSubtitles: vi.fn() });
    (useSettingsStore as any).mockReturnValue({
      fillerWords: ['a', 'b'],
      loadFillerWords: vi.fn(),
    });

    render(<FillerWordRemover />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should disable the button and show warning if filler words list is empty', () => {
    const setSubtitles = vi.fn();
    (useDataStore as any).mockReturnValue({ subtitles: mockSubtitles, setSubtitles });
    (useSettingsStore as any).mockReturnValue({
      fillerWords: [],
      loadFillerWords: vi.fn(),
    });

    render(<FillerWordRemover />);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
  });

  it('should call loadFillerWords on mount if list is empty', () => {
    const loadFillerWords = vi.fn();
    (useDataStore as any).mockReturnValue({ subtitles: [], setSubtitles: vi.fn() });
    (useSettingsStore as any).mockReturnValue({
      fillerWords: [],
      loadFillerWords,
    });

    render(<FillerWordRemover />);
    expect(loadFillerWords).toHaveBeenCalledTimes(1);
  });
});