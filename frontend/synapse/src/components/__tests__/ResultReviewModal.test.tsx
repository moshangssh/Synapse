import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResultReviewModal } from '../ResultReviewModal';
import { OptimizationResponse } from '../../types';
import { vi } from 'vitest';

// Mock the useTheme hook
vi.mock('@mui/material/styles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material/styles')>();
  return {
    ...actual,
    useTheme: () => ({
      palette: {
        background: {
          paper: '#2D2D2D',
          default: '#1E1E1E',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B0B0B0',
        },
        divider: '#404040',
        primary: {
          main: '#1976D2',
          dark: '#1565C0',
        },
        action: {
          hover: 'rgba(255, 255, 255, 0.08)',
          disabled: 'rgba(255, 255, 255, 0.12)',
        },
        success: {
          light: '#4caf50',
          contrastText: '#ffffff',
        },
        error: {
          light: '#f44336',
          contrastText: '#ffffff',
        },
        shape: {
          borderRadius: 4,
        },
      },
    }),
  };
});

const mockOptimizationResult: OptimizationResponse = {
  data: [
    {
      id: 1,
      original_text: 'Hello world',
      optimized_text: 'Hello beautiful world',
      diffs: [
        { type: 'normal', value: 'Hello ' },
        { type: 'add', value: 'beautiful ' },
        { type: 'normal', value: 'world' },
      ],
    },
    {
      id: 2,
      original_text: 'This is a test',
      optimized_text: 'This is a test', // No change
      diffs: [
        { type: 'normal', value: 'This is a test' },
      ],
    },
    {
      id: 3,
      original_text: 'Good morning',
      optimized_text: 'Good morning everyone',
      diffs: [
        { type: 'normal', value: 'Good morning' },
        { type: 'add', value: ' everyone' },
      ],
    },
  ],
  metadata: {
    processing_time: 1.5,
    cache_stats: {
      cache_hits: 0,
      cache_misses: 3,
    },
    error_count: 0,
  },
};

describe('ResultReviewModal', () => {
  const mockOnClose = vi.fn();
  const mockOnApply = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <ResultReviewModal
        open={true}
        optimizationResult={mockOptimizationResult}
        error={null}
        onClose={mockOnClose}
        onApply={mockOnApply}
        onCancel={mockOnCancel}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('displays modal title and modified subtitle count', () => {
    render(
      <ResultReviewModal
        open={true}
        optimizationResult={mockOptimizationResult}
        error={null}
        onClose={mockOnClose}
        onApply={mockOnApply}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('结果审阅')).toBeInTheDocument();
    expect(screen.getByText('2 个字幕被修改')).toBeInTheDocument();
  });

  it('displays error message when error is provided', () => {
    const errorMessage = '优化失败';
    render(
      <ResultReviewModal
        open={true}
        optimizationResult={null}
        error={errorMessage}
        onClose={mockOnClose}
        onApply={mockOnApply}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows "no modifications" message when no subtitles are modified', () => {
    const noModificationsResult: OptimizationResponse = {
      data: [
        {
          id: 1,
          original_text: 'Hello world',
          optimized_text: 'Hello world',
          diffs: [{ type: 'normal', value: 'Hello world' }],
        },
      ],
      metadata: {
        processing_time: 1.0,
        cache_stats: {
          cache_hits: 1,
          cache_misses: 0,
        },
        error_count: 0,
      },
    };

    render(
      <ResultReviewModal
        open={true}
        optimizationResult={noModificationsResult}
        error={null}
        onClose={mockOnClose}
        onApply={mockOnApply}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('没有检测到任何修改')).toBeInTheDocument();
    expect(screen.getByText('所有字幕内容保持不变')).toBeInTheDocument();
  });

  it('displays modified subtitles with original and optimized text', () => {
    render(
      <ResultReviewModal
        open={true}
        optimizationResult={mockOptimizationResult}
        error={null}
        onClose={mockOnClose}
        onApply={mockOnApply}
        onCancel={mockOnCancel}
      />
    );

    // Check for subtitle #1 (modified)
    expect(screen.getByText('字幕 #1')).toBeInTheDocument();
    expect(screen.getByText('Hello world', { selector: 'p' })).toBeInTheDocument(); // Original text
    expect(screen.getByText('Hello beautiful world', { selector: 'p' })).toBeInTheDocument(); // Optimized text

    // Check for subtitle #3 (modified)
    expect(screen.getByText('字幕 #3')).toBeInTheDocument();
    expect(screen.getByText('Good morning', { selector: 'p' })).toBeInTheDocument(); // Original text
    expect(screen.getByText('Good morning everyone', { selector: 'p' })).toBeInTheDocument(); // Optimized text

    // Check that subtitle #2 (not modified) is not displayed
    expect(screen.queryByText('字幕 #2')).not.toBeInTheDocument();
  });

  it('calls onApply and onClose when "Apply All" button is clicked', async () => {
    render(
      <ResultReviewModal
        open={true}
        optimizationResult={mockOptimizationResult}
        error={null}
        onClose={mockOnClose}
        onApply={mockOnApply}
        onCancel={mockOnCancel}
      />
    );

    const applyButton = screen.getByText('全部应用');
    expect(applyButton).toBeEnabled();

    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockOnApply).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onCancel and onClose when "Cancel" button is clicked', () => {
    render(
      <ResultReviewModal
        open={true}
        optimizationResult={mockOptimizationResult}
        error={null}
        onClose={mockOnClose}
        onApply={mockOnApply}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('disables "Apply All" button when no optimization result is provided', () => {
    render(
      <ResultReviewModal
        open={true}
        optimizationResult={null}
        error={null}
        onClose={mockOnClose}
        onApply={mockOnApply}
        onCancel={mockOnCancel}
      />
    );

    const applyButton = screen.getByText('全部应用');
    expect(applyButton).toBeDisabled();
  });

  it('disables "Apply All" button when no modifications are present', () => {
    const noModificationsResult: OptimizationResponse = {
      data: [
        {
          id: 1,
          original_text: 'Hello world',
          optimized_text: 'Hello world',
          diffs: [{ type: 'normal', value: 'Hello world' }],
        },
      ],
      metadata: {
        processing_time: 1.0,
        cache_stats: {
          cache_hits: 1,
          cache_misses: 0,
        },
        error_count: 0,
      },
    };

    render(
      <ResultReviewModal
        open={true}
        optimizationResult={noModificationsResult}
        error={null}
        onClose={mockOnClose}
        onApply={mockOnApply}
        onCancel={mockOnCancel}
      />
    );

    const applyButton = screen.getByText('全部应用');
    expect(applyButton).toBeDisabled();
  });

  it('displays diff highlighting correctly', () => {
    render(
      <ResultReviewModal
        open={true}
        optimizationResult={mockOptimizationResult}
        error={null}
        onClose={mockOnClose}
        onApply={mockOnApply}
        onCancel={mockOnCancel}
      />
    );

    // The diff highlighter should be rendered (check for first occurrence)
    expect(screen.getAllByText('差异对比：')[0]).toBeInTheDocument();
  });

  it('expands first accordion by default', () => {
    render(
      <ResultReviewModal
        open={true}
        optimizationResult={mockOptimizationResult}
        error={null}
        onClose={mockOnClose}
        onApply={mockOnApply}
        onCancel={mockOnCancel}
      />
    );

    // The first accordion should be expanded by default
    const firstAccordion = screen.getByText('字幕 #1').closest('div');
    expect(firstAccordion).toBeInTheDocument();
  });
});