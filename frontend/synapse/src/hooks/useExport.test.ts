import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { useExport } from './useExport';
import { useDataStore } from '../stores/useDataStore';
import useNotifier from './useNotifier';

// Mock the useDataStore
vi.mock('../stores/useDataStore', () => ({
  useDataStore: vi.fn(),
}));

// Mock the useNotifier
vi.mock('./useNotifier', () => ({
  default: vi.fn(),
}));

// Helper function to create a mock subtitle
const createMockSubtitle = (id: number, text: string, originalText?: string) => ({
  id,
  startTimecode: '00:00:00.000',
  endTimecode: '00:00:01.000',
  text,
  originalText: originalText ?? text,
  diffs: [],
  isModified: text !== (originalText ?? text),
});

describe('useExport', () => {
  const mockSubtitles = [
    createMockSubtitle(1, 'Subtitle 1', 'Original Subtitle 1'),
    createMockSubtitle(2, 'Subtitle 2', 'Original Subtitle 2'),
  ];
  
  const mockFrameRate = 24;
  
  const mockNotify = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup mock useDataStore
    (useDataStore as unknown as Mock).mockImplementation((selector) => {
      const state = {
        subtitles: mockSubtitles,
        frameRate: mockFrameRate,
      };
      return selector(state);
    });
    
    // Setup mock useNotifier
    (useNotifier as unknown as Mock).mockReturnValue(mockNotify);
  });

  describe('exportToSrt', () => {
    it('should successfully export to SRT', async () => {
      const mockSrtContent = 'SRT content';
      
      // Mock fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockSrtContent),
      } as any);
      
      const { exportToSrt } = useExport();
      const result = await exportToSrt();
      
      expect(result).toEqual({
        success: true,
        message: '成功导出SRT文件！',
        data: mockSrtContent,
      });
      
      // Verify fetch was called with correct parameters
      expect(fetch).toHaveBeenCalledWith(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/export/srt`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frameRate: mockFrameRate,
            subtitles: mockSubtitles.map(({ id, startTimecode, endTimecode, diffs }) => ({
              id,
              startTimecode,
              endTimecode,
              diffs,
            })),
          }),
        }
      );
    });

    it('should handle network error', async () => {
      // Mock fetch to simulate network error
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
      
      const { exportToSrt } = useExport();
      const result = await exportToSrt();
      
      expect(result).toEqual({
        success: false,
        message: '网络连接失败，请检查后端服务是否正常运行',
      });
      
      // Verify notify.error was called
      expect(mockNotify.error).toHaveBeenCalledWith('网络连接失败，请检查后端服务是否正常运行');
    });

    it('should handle HTTP 400 error', async () => {
      const errorMessage = 'Invalid request data';
      
      // Mock fetch to simulate HTTP 400 error
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue(errorMessage),
      } as any);
      
      const { exportToSrt } = useExport();
      const result = await exportToSrt();
      
      expect(result).toEqual({
        success: false,
        message: `请求参数错误: ${errorMessage || "请检查字幕数据格式"}`,
      });
      
      // Verify notify.error was called
      expect(mockNotify.error).toHaveBeenCalledWith(`请求参数错误: ${errorMessage || "请检查字幕数据格式"}`);
    });

    it('should handle HTTP 500 error', async () => {
      const errorMessage = 'Internal server error';
      
      // Mock fetch to simulate HTTP 500 error
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue(errorMessage),
      } as any);
      
      const { exportToSrt } = useExport();
      const result = await exportToSrt();
      
      expect(result).toEqual({
        success: false,
        message: `服务器内部错误: ${errorMessage || "请联系开发者"}`,
      });
      
      // Verify notify.error was called
      expect(mockNotify.error).toHaveBeenCalledWith(`服务器内部错误: ${errorMessage || "请联系开发者"}`);
    });

    it('should handle unknown HTTP error', async () => {
      const errorMessage = 'Unknown error';
      
      // Mock fetch to simulate unknown HTTP error
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 599,
        text: vi.fn().mockResolvedValue(errorMessage),
      } as any);
      
      const { exportToSrt } = useExport();
      const result = await exportToSrt();
      
      expect(result).toEqual({
        success: false,
        message: errorMessage || `导出失败 (HTTP 599)`,
      });
      
      // Verify notify.error was called
      expect(mockNotify.error).toHaveBeenCalledWith(errorMessage || `导出失败 (HTTP 599)`);
    });
  });

  describe('exportToDavinci', () => {
    it('should successfully export to Davinci', async () => {
      // Mock fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as any);
      
      const { exportToDavinci } = useExport();
      const result = await exportToDavinci();
      
      expect(result).toEqual({
        success: true,
        message: '成功导出至达芬奇！',
      });
      
      // Verify fetch was called with correct parameters
      expect(fetch).toHaveBeenCalledWith(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/export/davinci`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frameRate: mockFrameRate,
            subtitles: mockSubtitles.map(({ id, startTimecode, endTimecode, diffs }) => ({
              id,
              startTimecode,
              endTimecode,
              diffs,
            })),
          }),
        }
      );
    });

    it('should handle network error', async () => {
      // Mock fetch to simulate network error
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
      
      const { exportToDavinci } = useExport();
      const result = await exportToDavinci();
      
      expect(result).toEqual({
        success: false,
        message: '网络连接失败，请检查后端服务是否正常运行',
      });
      
      // Verify notify.error was called
      expect(mockNotify.error).toHaveBeenCalledWith('网络连接失败，请检查后端服务是否正常运行');
    });

    it('should handle HTTP 400 error with JSON response', async () => {
      const errorData = { message: 'Invalid request data' };
      
      // Mock fetch to simulate HTTP 400 error with JSON response
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue(errorData),
      } as any);
      
      const { exportToDavinci } = useExport();
      const result = await exportToDavinci();
      
      expect(result).toEqual({
        success: false,
        message: `请求参数错误: ${errorData.message || "请检查字幕数据格式"}`,
      });
      
      // Verify notify.error was called
      expect(mockNotify.error).toHaveBeenCalledWith(`请求参数错误: ${errorData.message || "请检查字幕数据格式"}`);
    });

    it('should handle HTTP 500 error with text response', async () => {
      const errorStatusText = 'Internal Server Error';
      
      // Mock fetch to simulate HTTP 500 error with text response
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: errorStatusText,
        json: vi.fn().mockRejectedValue(new Error('JSON parse error')),
        text: vi.fn().mockResolvedValue(errorStatusText),
      } as any);
      
      const { exportToDavinci } = useExport();
      const result = await exportToDavinci();
      
      expect(result).toEqual({
        success: false,
        message: `服务器内部错误: ${errorStatusText || "请联系开发者"}`,
      });
      
      // Verify notify.error was called
      expect(mockNotify.error).toHaveBeenCalledWith(`服务器内部错误: ${errorStatusText || "请联系开发者"}`);
    });

    it('should handle unknown HTTP error', async () => {
      const errorStatusText = 'Unknown Error';
      
      // Mock fetch to simulate unknown HTTP error
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 599,
        statusText: errorStatusText,
        json: vi.fn().mockRejectedValue(new Error('JSON parse error')),
        text: vi.fn().mockResolvedValue(errorStatusText),
      } as any);
      
      const { exportToDavinci } = useExport();
      const result = await exportToDavinci();
      
      expect(result).toEqual({
        success: false,
        message: errorStatusText || `导出至达芬奇失败 (HTTP 599)`,
      });
      
      // Verify notify.error was called
      expect(mockNotify.error).toHaveBeenCalledWith(errorStatusText || `导出至达芬奇失败 (HTTP 599)`);
    });
  });
});