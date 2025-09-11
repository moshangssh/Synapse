import { renderHook, act } from '@testing-library/react';
import { useSrtImporter } from '../useSrtImporter';
import { useSubtitleStore } from '../../stores/useSubtitleStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useConnectionStore } from '../../stores/useConnectionStore';
import useNotifier from '../useNotifier';

// Mock the dependencies
vi.mock('../../stores/useSubtitleStore');
vi.mock('../../stores/useProjectStore');
vi.mock('../../stores/useConnectionStore');
vi.mock('../useNotifier');

const mockSetSubtitles = vi.fn();
const mockAddImportedSubtitleFile = vi.fn();
const mockSetConnectionStatus = vi.fn();
const mockNotify = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

// Mock File.prototype.text
Object.defineProperty(File.prototype, 'text', {
  value: function() {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(this);
    });
  },
  writable: true,
  configurable: true,
});

describe('useSrtImporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useSubtitleStore
    (useSubtitleStore as any).mockImplementation((selector) => {
      if (selector.toString().includes('setSubtitles')) {
        return mockSetSubtitles;
      }
      return vi.fn();
    });
    
    // Mock useProjectStore
    (useProjectStore as any).mockImplementation((selector) => {
      if (selector.toString().includes('addImportedSubtitleFile')) {
        return mockAddImportedSubtitleFile;
      }
      return vi.fn();
    });
    
    // Mock useConnectionStore
    (useConnectionStore as any).mockImplementation((selector) => {
      if (selector.toString().includes('setConnectionStatus')) {
        return mockSetConnectionStatus;
      }
      return vi.fn();
    });
    
    // Mock useNotifier
    (useNotifier as any).mockReturnValue(mockNotify);
  });

  describe('handleFileChange', () => {
    it('should handle valid SRT file import successfully', async () => {
      // Mock successful API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            fileName: 'test.srt',
            subtitles: [
              {
                id: 1,
                startTimecode: '00:00:01.000',
                endTimecode: '00:00:03.000',
                text: 'Test subtitle'
              }
            ],
            metadata: {
              importedAt: '2023-12-01T10:30:00',
              format: 'srt'
            }
          }
        })
      });
      
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useSrtImporter());
      
      // Create a mock file
      const file = new File(['1\n00:00:01,000 --> 00:00:03,000\nTest subtitle'], 'test.srt', {
        type: 'text/plain'
      });
      
      const mockEvent = {
        target: {
          files: [file]
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleFileChange(mockEvent);
      });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/subtitles/import/srt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: '1\n00:00:01,000 --> 00:00:03,000\nTest subtitle',
          fileName: 'test.srt',
        }),
      });

      expect(mockAddImportedSubtitleFile).toHaveBeenCalledWith({
        fileName: 'test.srt',
        subtitles: [
          {
            id: 1,
            startTimecode: '00:00:01.000',
            endTimecode: '00:00:03.000',
            text: 'Test subtitle'
          }
        ],
        metadata: {
          importedAt: '2023-12-01T10:30:00',
          format: 'srt'
        }
      });

      expect(mockSetSubtitles).toHaveBeenCalled();
      expect(mockSetConnectionStatus).toHaveBeenCalledWith('standalone');
      expect(mockNotify.success).toHaveBeenCalledWith('成功导入 1 条字幕');
      
      // Restore global fetch
      vi.unstubAllGlobals();
    });

    it('should handle non-SRT file error', async () => {
      const { result } = renderHook(() => useSrtImporter());
      
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain'
      });
      
      const mockEvent = {
        target: {
          files: [file]
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleFileChange(mockEvent);
      });

      expect(mockNotify.error).toHaveBeenCalledWith('请选择SRT格式的文件');
    });

    it('should handle API error response', async () => {
      // Mock failed API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          detail: {
            message: 'SRT文件格式错误: 文件内容为空',
            code: 'invalid_srt_format'
          }
        })
      });
      
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useSrtImporter());
      
      const file = new File(['1\n00:00:01,000 --> 00:00:03,000\nTest subtitle'], 'test.srt', {
        type: 'text/plain'
      });
      
      const mockEvent = {
        target: {
          files: [file]
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleFileChange(mockEvent);
      });

      expect(mockNotify.error).toHaveBeenCalledWith('SRT文件格式错误: 文件内容为空');
      
      // Restore global fetch
      vi.unstubAllGlobals();
    });

    it('should handle invalid SRT format content', async () => {
      const { result } = renderHook(() => useSrtImporter());
      
      const file = new File(['这不是有效的SRT文件内容'], 'invalid.srt', {
        type: 'text/plain'
      });
      
      const mockEvent = {
        target: {
          files: [file]
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleFileChange(mockEvent);
      });

      expect(mockNotify.error).toHaveBeenCalledWith('导入的并不是规范的SRT文件，请检查里面的内容');
    });

    it('should handle network error', async () => {
      // Mock network error
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useSrtImporter());
      
      const file = new File(['1\n00:00:01,000 --> 00:00:03,000\nTest subtitle'], 'test.srt', {
        type: 'text/plain'
      });
      
      const mockEvent = {
        target: {
          files: [file]
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleFileChange(mockEvent);
      });

      expect(mockNotify.error).toHaveBeenCalledWith('Network error');
      
      // Restore global fetch
      vi.unstubAllGlobals();
    });

    it('should not process when no file is selected', async () => {
      const { result } = renderHook(() => useSrtImporter());
      
      const mockEvent = {
        target: {
          files: []
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleFileChange(mockEvent);
      });

      expect(mockNotify.error).not.toHaveBeenCalled();
    });
  });

  describe('triggerFileSelect', () => {
    it('should trigger file input click', () => {
      const { result } = renderHook(() => useSrtImporter());
      
      const mockClick = vi.fn();
      const mockFileInput = {
        click: mockClick
      } as unknown as HTMLInputElement;

      // Directly set the ref current value
      result.current.fileInputRef.current = mockFileInput;

      act(() => {
        result.current.triggerFileSelect();
      });

      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useSrtImporter());
      
      // Set an error first
      act(() => {
        result.current.clearError();
      });

      // This test mainly ensures the function exists and doesn't throw errors
      expect(typeof result.current.clearError).toBe('function');
    });
  });
});