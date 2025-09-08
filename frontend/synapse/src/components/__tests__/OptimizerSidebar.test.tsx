import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OptimizerSidebar } from '../layout/OptimizerSidebar';
import { useSubtitleStore } from '../../stores/useSubtitleStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { optimizationService } from '../../services/optimizationService';

// Mock the stores
vi.mock('../../stores/useSubtitleStore');
vi.mock('../../stores/useSettingsStore');
vi.mock('../../services/optimizationService');

// Mock MUI components
vi.mock('@mui/material', () => {
  const actual = require('@mui/material');
  return {
    ...actual,
    // Mock CircularProgress to avoid animation issues in tests
    CircularProgress: (props: any) => (
      <div data-testid="circular-progress" {...props}>
        Loading...
      </div>
    ),
  };
});

// Mock other components
vi.mock('../FillerWordRemover', () => ({
  FillerWordRemover: () => <div>FillerWordRemover</div>,
}));

vi.mock('../ApiSettingsModal', () => ({
  ApiSettingsModal: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    open ? <div>ApiSettingsModal</div> : null
  ),
}));

const mockUseSubtitleStore = useSubtitleStore as ReturnType<typeof vi.mocked<typeof useSubtitleStore>>;
const mockUseSettingsStore = useSettingsStore as ReturnType<typeof vi.mocked<typeof useSettingsStore>>;
const mockOptimizationService = optimizationService as ReturnType<typeof vi.mocked<typeof optimizationService>>;

describe('OptimizerSidebar', () => {
  const mockSetSubtitles = vi.fn();
  const mockSubtitles = [
    {
      id: 1,
      text: 'Hello world',
      originalText: 'Hello world',
      startTimecode: '00:00:00:00',
      endTimecode: '00:00:02:00',
      diffs: [{ type: 'normal' as const, value: 'Hello world' }],
      isModified: false,
    },
    {
      id: 2,
      text: 'Another subtitle',
      originalText: 'Another subtitle',
      startTimecode: '00:00:02:00',
      endTimecode: '00:00:04:00',
      diffs: [{ type: 'normal' as const, value: 'Another subtitle' }],
      isModified: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock store states
    mockUseSubtitleStore.mockReturnValue({
      subtitles: mockSubtitles,
      setSubtitles: mockSetSubtitles,
      updateSubtitleText: vi.fn(),
      getModifiedSubtitleIndices: vi.fn(() => []),
    });

    mockUseSettingsStore.mockReturnValue({
      apiConfig: {
        endpoint: 'http://localhost:8000',
        apiKey: 'test-api-key',
      },
      updateApiConfig: vi.fn(),
      saveApiConfig: vi.fn(),
      loadApiConfig: vi.fn(),
      validateApiEndpoint: vi.fn(() => true),
    });

    // Setup mock optimization service
    mockOptimizationService.createOptimizationRequest.mockReturnValue({
      subtitles: [
        { id: 1, text: 'Hello world' },
        { id: 2, text: 'Another subtitle' },
      ],
      reference_info: '',
    });

    mockOptimizationService.validateOptimizationRequest.mockReturnValue({
      isValid: true,
      errors: [],
    });

    mockOptimizationService.withTimeout.mockResolvedValue({
      data: [
        {
          id: 1,
          original_text: 'Hello world',
          optimized_text: 'Hello, world!',
          diffs: [
            { type: 'normal' as const, value: 'Hello' },
            { type: 'add' as const, value: ',' },
            { type: 'normal' as const, value: ' world' },
            { type: 'add' as const, value: '!' },
          ],
        },
        {
          id: 2,
          original_text: 'Another subtitle',
          optimized_text: 'Another, optimized subtitle!',
          diffs: [
            { type: 'normal' as const, value: 'Another' },
            { type: 'add' as const, value: ',' },
            { type: 'normal' as const, value: ' optimized subtitle' },
            { type: 'add' as const, value: '!' },
          ],
        },
      ],
      metadata: {
        processing_time: 1.5,
        cache_stats: {
          cache_hits: 0,
          cache_misses: 2,
        },
        error_count: 0,
      },
    });
  });

  it('should render without crashing', () => {
    render(<OptimizerSidebar />);
    
    expect(screen.getByText('Optimizer')).toBeInTheDocument();
    expect(screen.getByText('Simple Mode')).toBeInTheDocument();
    expect(screen.getByText('AI Subtitle Optimization')).toBeInTheDocument();
  });

  it('should display subtitle count', () => {
    render(<OptimizerSidebar />);
    
    expect(screen.getByText('2 subtitle(s) available for optimization')).toBeInTheDocument();
  });

  it('should show no subtitles message when no subtitles are available', () => {
    mockUseSubtitleStore.mockReturnValue({
      subtitles: [],
      setSubtitles: mockSetSubtitles,
      updateSubtitleText: vi.fn(),
      getModifiedSubtitleIndices: vi.fn(() => []),
    });

    render(<OptimizerSidebar />);
    
    expect(screen.getByText('No subtitles available for optimization')).toBeInTheDocument();
  });

  it('should handle reference info input', () => {
    render(<OptimizerSidebar />);
    
    const textarea = screen.getByPlaceholderText('Reference Information (optional)');
    fireEvent.change(textarea, { target: { value: 'Test reference info' } });
    
    expect(textarea).toHaveValue('Test reference info');
  });

  it('should show character count for reference info', () => {
    render(<OptimizerSidebar />);
    
    const textarea = screen.getByPlaceholderText('Reference Information (optional)');
    fireEvent.change(textarea, { target: { value: 'Test' } });
    
    expect(screen.getByText('4/1000')).toBeInTheDocument();
  });

  it('should disable optimize button when no subtitles are available', () => {
    mockUseSubtitleStore.mockReturnValue({
      subtitles: [],
      setSubtitles: mockSetSubtitles,
      updateSubtitleText: vi.fn(),
      getModifiedSubtitleIndices: vi.fn(() => []),
    });

    render(<OptimizerSidebar />);
    
    const optimizeButton = screen.getByText('AI Optimize Subtitles');
    expect(optimizeButton).toBeDisabled();
  });

  it('should disable optimize button when API config is missing', () => {
    mockUseSettingsStore.mockReturnValue({
      apiConfig: {
        endpoint: '',
        apiKey: '',
      },
      updateApiConfig: vi.fn(),
      saveApiConfig: vi.fn(),
      loadApiConfig: vi.fn(),
      validateApiEndpoint: vi.fn(() => true),
    });

    render(<OptimizerSidebar />);
    
    const optimizeButton = screen.getByText('AI Optimize Subtitles');
    expect(optimizeButton).toBeDisabled();
  });

  it('should handle successful optimization', async () => {
    render(<OptimizerSidebar />);
    
    const optimizeButton = screen.getByText('AI Optimize Subtitles');
    fireEvent.click(optimizeButton);

    // Should show loading state
    expect(screen.getByText('Optimizing...')).toBeInTheDocument();
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();

    // Wait for optimization to complete
    await waitFor(() => {
      expect(mockOptimizationService.createOptimizationRequest).toHaveBeenCalledWith(
        mockSubtitles,
        ''
      );
      expect(mockOptimizationService.validateOptimizationRequest).toHaveBeenCalled();
      expect(mockOptimizationService.withTimeout).toHaveBeenCalled();
    });

    // Should show success message
    expect(screen.getByText('成功优化 2 个字幕条目')).toBeInTheDocument();

    // Should update subtitles
    expect(mockSetSubtitles).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          text: 'Hello, world!',
          isModified: true,
        }),
        expect.objectContaining({
          id: 2,
          text: 'Another, optimized subtitle!',
          isModified: true,
        }),
      ])
    );

    // Should clear reference info
    expect(screen.getByPlaceholderText('Reference Information (optional)')).toHaveValue('');
  });

  it('should handle optimization error', async () => {
    const errorMessage = 'Optimization failed';
    mockOptimizationService.withTimeout.mockRejectedValue(new Error(errorMessage));

    render(<OptimizerSidebar />);
    
    const optimizeButton = screen.getByText('AI Optimize Subtitles');
    fireEvent.click(optimizeButton);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Should not update subtitles
    expect(mockSetSubtitles).not.toHaveBeenCalled();
  });

  it('should handle validation error', async () => {
    mockOptimizationService.validateOptimizationRequest.mockReturnValue({
      isValid: false,
      errors: ['Invalid subtitle data'],
    });

    render(<OptimizerSidebar />);
    
    const optimizeButton = screen.getByText('AI Optimize Subtitles');
    fireEvent.click(optimizeButton);

    // Should show validation error immediately
    await waitFor(() => {
      expect(screen.getByText('Invalid subtitle data')).toBeInTheDocument();
    });

    // Should not call optimization service
    expect(mockOptimizationService.withTimeout).not.toHaveBeenCalled();
  });

  it('should handle no subtitles error', async () => {
    mockUseSubtitleStore.mockReturnValue({
      subtitles: [],
      setSubtitles: mockSetSubtitles,
      updateSubtitleText: vi.fn(),
      getModifiedSubtitleIndices: vi.fn(() => []),
    });

    render(<OptimizerSidebar />);
    
    const optimizeButton = screen.getByText('AI Optimize Subtitles');
    fireEvent.click(optimizeButton);

    // Should show error immediately
    await waitFor(() => {
      expect(screen.getByText('没有可优化的字幕')).toBeInTheDocument();
    });

    // Should not call optimization service
    expect(mockOptimizationService.withTimeout).not.toHaveBeenCalled();
  });

  it('should handle missing API config error', async () => {
    mockUseSettingsStore.mockReturnValue({
      apiConfig: {
        endpoint: '',
        apiKey: '',
      },
      updateApiConfig: vi.fn(),
      saveApiConfig: vi.fn(),
      loadApiConfig: vi.fn(),
      validateApiEndpoint: vi.fn(() => true),
    });

    render(<OptimizerSidebar />);
    
    const optimizeButton = screen.getByText('AI Optimize Subtitles');
    fireEvent.click(optimizeButton);

    // Should show error immediately
    await waitFor(() => {
      expect(screen.getByText('请先配置 API 设置')).toBeInTheDocument();
    });

    // Should not call optimization service
    expect(mockOptimizationService.withTimeout).not.toHaveBeenCalled();
  });

  it('should allow closing error and success messages', async () => {
    // Test success message closing
    mockOptimizationService.withTimeout.mockResolvedValue({
      data: [],
      metadata: {
        processing_time: 1,
        cache_stats: { cache_hits: 0, cache_misses: 0 },
        error_count: 0,
      },
    });

    const { rerender } = render(<OptimizerSidebar />);
    
    const optimizeButton = screen.getByText('AI Optimize Subtitles');
    fireEvent.click(optimizeButton);

    await waitFor(() => {
      expect(screen.getByText('成功优化 0 个字幕条目')).toBeInTheDocument();
    });

    // Close success message
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(screen.queryByText('成功优化 0 个字幕条目')).not.toBeInTheDocument();

    // Test error message closing
    mockOptimizationService.withTimeout.mockRejectedValue(new Error('Test error'));
    
    rerender(<OptimizerSidebar />);
    
    fireEvent.click(screen.getByText('AI Optimize Subtitles'));

    await waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    // Close error message
    const errorCloseButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(errorCloseButton);

    expect(screen.queryByText('Test error')).not.toBeInTheDocument();
  });

  it('should disable inputs during optimization', async () => {
    // Mock a long-running optimization
    mockOptimizationService.withTimeout.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<OptimizerSidebar />);
    
    const optimizeButton = screen.getByText('AI Optimize Subtitles');
    const textarea = screen.getByPlaceholderText('Reference Information (optional)');
    
    fireEvent.click(optimizeButton);

    // Should disable inputs during optimization
    expect(optimizeButton).toBeDisabled();
    expect(textarea).toBeDisabled();

    // Wait for optimization to complete
    await waitFor(() => {
      expect(optimizeButton).not.toBeDisabled();
      expect(textarea).not.toBeDisabled();
    }, 1500);
  });
});