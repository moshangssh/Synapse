import { describe, it, expect, beforeEach, vi } from 'vitest';
import { optimizationService } from '../optimizationService';
import { API_BASE_URL, API_ENDPOINTS } from '../apiConfig';

// Mock fetch API
global.fetch = vi.fn();

// Mock useSettingsStore
vi.mock('../../stores/useSettingsStore', async () => ({
  useSettingsStore: {
    getState: () => ({
      apiKey: 'test-api-key',
      endpoint: 'http://localhost:8000',
      apiConfig: {
        batchSize: 10,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000,
        apiKey: 'test-api-key',
        endpoint: 'http://localhost:8000',
      },
    }),
  },
}));

describe('OptimizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('optimizeSubtitles', () => {
    it('should successfully optimize subtitles', async () => {
      const mockResponse = {
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
        ],
        metadata: {
          processing_time: 1.5,
          cache_stats: {
            cache_hits: 0,
            cache_misses: 1,
          },
          error_count: 0,
        },
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request = {
        subtitles: [{ id: 1, text: 'Hello world' }],
        reference_info: 'Test reference',
      };

      const result = await optimizationService.optimizeSubtitles(request);

      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}${API_ENDPOINTS.OPTIMIZER_OPTIMIZE}`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"batch_size":10'),
        })
      );

      // Check that the body contains the expected fields
      const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body as string);
      expect(requestBody).toEqual(expect.objectContaining({
        batch_size: 10,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 2000,
        subtitles: [{ id: 1, text: 'Hello world' }],
        reference_info: 'Test reference',
      }));

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const mockErrorResponse = {
        detail: 'API key is invalid',
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse,
      });

      const request = {
        subtitles: [{ id: 1, text: 'Hello world' }],
      };

      await expect(optimizationService.optimizeSubtitles(request)).rejects.toThrow(
        'API key is invalid'
      );
    });

    it('should handle network errors', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const request = {
        subtitles: [{ id: 1, text: 'Hello world' }],
      };

      await expect(optimizationService.optimizeSubtitles(request)).rejects.toThrow(
        'Network error'
      );
    });

    it('should split into batches when subtitle count exceeds batch size', async () => {
      // Mock fetch to return different responses for each batch
      (fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 1,
                original_text: 'Hello world',
                optimized_text: 'Hello, world!',
                diffs: [],
              },
              {
                id: 2,
                original_text: 'This is a test',
                optimized_text: 'This is a test!',
                diffs: [],
              },
            ],
            metadata: {
              processing_time: 1.0,
              batches_processed: 1,
              cache_hits: 0,
              cache_hit_rate: 0,
              total_subtitles: 2,
              model_used: 'gpt-3.5-turbo',
              errors_count: 0,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 3,
                original_text: 'Another subtitle',
                optimized_text: 'Another subtitle!',
                diffs: [],
              },
            ],
            metadata: {
              processing_time: 0.5,
              batches_processed: 1,
              cache_hits: 0,
              cache_hit_rate: 0,
              total_subtitles: 1,
              model_used: 'gpt-3.5-turbo',
              errors_count: 0,
            },
          }),
        });

      const request = {
        subtitles: [
          { id: 1, text: 'Hello world' },
          { id: 2, text: 'This is a test' },
          { id: 3, text: 'Another subtitle' },
        ],
        batch_size: 2, // Force batch processing
      };

      const result = await optimizationService.optimizeSubtitles(request);

      // Should have called fetch twice (2 batches)
      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Check that the result combines all batch responses
      expect(result.data).toHaveLength(3);
      expect(result.metadata?.total_subtitles).toBe(3);
      expect(result.metadata?.batches_processed).toBe(2);
      expect(result.metadata?.processing_time).toBe(1.5); // 1.0 + 0.5
    });
  });

  describe('validateOptimizationRequest', () => {
    it('should validate correct request', () => {
      const request = {
        subtitles: [{ id: 1, text: 'Hello world' }],
        reference_info: 'Test reference',
        batch_size: 5,
        temperature: 0.5,
        max_tokens: 1000,
      };

      const result = optimizationService.validateOptimizationRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty subtitles array', () => {
      const request = {
        subtitles: [],
      };

      const result = optimizationService.validateOptimizationRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('至少需要一个字幕条目');
    });

    it('should reject invalid subtitle data', () => {
      const request = {
        subtitles: [
          { id: 'invalid' as any, text: 'Hello world' },
          { id: 2, text: '' },
        ],
      };

      const result = optimizationService.validateOptimizationRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('字幕 1: ID 必须是数字');
      expect(result.errors).toContain('字幕 2: 文本不能为空');
    });

    it('should reject invalid temperature value', () => {
      const request = {
        subtitles: [{ id: 1, text: 'Hello world' }],
        temperature: 3, // Invalid: should be between 0 and 2
      };

      const result = optimizationService.validateOptimizationRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('温度值必须在0到2之间');
    });

    it('should reject invalid batch size', () => {
      const request = {
        subtitles: [{ id: 1, text: 'Hello world' }],
        batch_size: 0, // Invalid: should be greater than 0
      };

      const result = optimizationService.validateOptimizationRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('批处理大小必须是大于0的数字');
    });

    it('should accept valid batch size', () => {
      const request = {
        subtitles: [{ id: 1, text: 'Hello world' }],
        batch_size: 1, // Valid: greater than 0
      };

      const result = optimizationService.validateOptimizationRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('createOptimizationRequest', () => {
    it('should create optimization request from subtitles', () => {
      const subtitles = [
        { id: 1, text: 'Hello world', startTimecode: '00:00:00:00', endTimecode: '00:00:02:00' },
        { id: 2, text: 'Another subtitle', startTimecode: '00:00:02:00', endTimecode: '00:00:04:00' },
      ];

      const referenceInfo = 'Test reference';

      const result = optimizationService.createOptimizationRequest(subtitles, referenceInfo);

      expect(result).toEqual({
        subtitles: [
          { id: 1, text: 'Hello world' },
          { id: 2, text: 'Another subtitle' },
        ],
        reference_info: 'Test reference',
      });
    });

    it('should create optimization request without reference info', () => {
      const subtitles = [
        { id: 1, text: 'Hello world', startTimecode: '00:00:00:00', endTimecode: '00:00:02:00' },
      ];

      const result = optimizationService.createOptimizationRequest(subtitles);

      expect(result).toEqual({
        subtitles: [{ id: 1, text: 'Hello world' }],
      });
    });
  });

  describe('withTimeout', () => {
    it('should resolve successful request within timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await optimizationService.withTimeout(promise, 1000);

      expect(result).toBe('success');
    });

    it('should reject on timeout', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 2000));

      await expect(
        optimizationService.withTimeout(promise, 1000)
      ).rejects.toThrow('请求超时');
    });
  });
});