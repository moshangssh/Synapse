import { calculateDiffApi } from '../diffApi';

// Mock global fetch
global.fetch = vi.fn();

describe('diffApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateDiffApi', () => {
    it('should call the correct API endpoint with correct parameters', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          { type: 'normal', value: 'Hello ' },
          { type: 'removed', value: 'World' },
          { type: 'added', value: 'Universe' },
        ],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await calculateDiffApi('Hello World', 'Hello Universe');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/utils/diff',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            original_text: 'Hello World',
            new_text: 'Hello Universe',
          }),
        }
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API error response', async () => {
      const mockErrorResponse = {
        detail: { message: 'Server error' },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue(mockErrorResponse),
      });

      await expect(calculateDiffApi('Hello', 'World')).rejects.toThrow('Server error');
    });

    it('should handle network error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(calculateDiffApi('Hello', 'World')).rejects.toThrow('Network error');
    });

    it('should handle non-success status', async () => {
      const mockResponse = {
        status: 'error',
        data: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      await expect(calculateDiffApi('Hello', 'World')).rejects.toThrow('API返回错误状态');
    });

    it('should handle empty strings', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          { type: 'normal', value: '' },
        ],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await calculateDiffApi('', '');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/utils/diff',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            original_text: '',
            new_text: '',
          }),
        }
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle unicode characters', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          { type: 'normal', value: '你好' },
          { type: 'added', value: '，' },
          { type: 'normal', value: '世界' },
        ],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await calculateDiffApi('你好世界', '你好，世界');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/utils/diff',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            original_text: '你好世界',
            new_text: '你好，世界',
          }),
        }
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle special characters', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          { type: 'normal', value: 'Hello' },
          { type: 'removed', value: ',' },
          { type: 'normal', value: ' World' },
          { type: 'added', value: '!' },
        ],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await calculateDiffApi('Hello, World', 'Hello World!');

      expect(result).toEqual(mockResponse.data);
    });
  });
});