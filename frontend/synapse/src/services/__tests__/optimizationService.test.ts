import { describe, it, expect, beforeEach, vi } from 'vitest';
import { optimizationService } from '../optimizationService';
import { API_BASE_URL, API_ENDPOINTS } from '../apiConfig';
import { OptimizationProgressEvent } from '../../types';

// Mock fetch API
global.fetch = vi.fn();

// Mock EventSource
global.EventSource = vi.fn().mockImplementation((url: string) => {
  return {
    url,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    close: vi.fn(),
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2,
    readyState: 1,
  };
});

// Mock useSettingsStore
vi.mock('../../stores/useSettingsStore', async () => ({
  useSettingsStore: {
    getState: () => ({
      apiConfig: {
        batchSize: 10,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000,
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
          body: expect.stringContaining('"batchSize":10'),
        })
      );

      // Check that the body contains the expected fields
      const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body as string);
      expect(requestBody).toEqual(expect.objectContaining({
        batchSize: 10,
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
        batchSize: 2, // Force batch processing
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
        batchSize: 5,
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
        batchSize: 0, // Invalid: should be greater than 0
      };

      const result = optimizationService.validateOptimizationRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('批处理大小必须是大于0的数字');
    });

    it('should accept valid batch size', () => {
      const request = {
        subtitles: [{ id: 1, text: 'Hello world' }],
        batchSize: 1, // Valid: greater than 0
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

  describe('Streaming Optimization', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create EventSource and handle SSE events correctly', async () => {
      const mockCompleteEvent = {
        type: 'complete',
        data: {
          total_subtitles: 1,
          optimized_subtitles: [{
            id: 1,
            original_text: 'Hello world',
            optimized_text: 'Hello, world!',
            diffs: []
          }],
          metadata: {
            total_subtitles: 1,
            batches_processed: 1,
            cache_hits: 0,
            cache_hit_rate: 0,
            processing_time: 1.5,
            model_used: 'gpt-3.5-turbo',
            optimized_count: 1,
            fallback_count: 0,
            success_rate: 100
          },
          message: '字幕优化完成'
        }
      };

      // Mock fetch for initial POST request
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      // Mock EventSource instance
      let mockEventSourceInstance: any;
      (EventSource as any).mockImplementation((url: string) => {
        mockEventSourceInstance = {
          url,
          onmessage: null as ((event: MessageEvent) => void) | null,
          onerror: null as ((event: Event) => void) | null,
          close: vi.fn(),
          CONNECTING: 0,
          OPEN: 1,
          CLOSED: 2,
          readyState: 1,
        };
        return mockEventSourceInstance;
      });

      // Mock setTimeout for timeout handling
      const mockSetTimeout = vi.fn().mockImplementation((callback: Function, delay: number) => {
        return 1; // Return timer ID
      });
      global.setTimeout = mockSetTimeout;

      const mockClearTimeout = vi.fn();
      global.clearTimeout = mockClearTimeout;

      const request = {
        subtitles: [{ id: 1, text: 'Hello world' }],
      };

      const progressCallback = vi.fn();

      // Start the streaming optimization
      const resultPromise = optimizationService.optimizeSubtitles(request, progressCallback);

      // Simulate EventSource being created
      expect(EventSource).toHaveBeenCalledWith(
        `${API_BASE_URL}${API_ENDPOINTS.OPTIMIZER_OPTIMIZE}`,
        expect.objectContaining({
          withCredentials: false,
        })
      );

      // Simulate receiving complete event
      if (mockEventSourceInstance && mockEventSourceInstance.onmessage) {
        mockEventSourceInstance.onmessage({
          data: JSON.stringify(mockCompleteEvent),
        } as MessageEvent);
      }

      // Wait for the promise to resolve
      const result = await resultPromise;

      // Verify the result
      expect(result).toEqual({
        data: [{
          id: 1,
          original_text: 'Hello world',
          optimized_text: 'Hello, world!',
          diffs: [],
        }],
        metadata: {
          processing_time: 1.5,
          cache_stats: {
            cache_hits: 0,
            cache_misses: 0,
          },
          error_count: 0,
        },
      });

      // Verify EventSource was closed
      expect(mockEventSourceInstance.close).toHaveBeenCalled();
      expect(mockClearTimeout).toHaveBeenCalled();
    });

    it('should handle progress events correctly', async () => {
      const mockStartEvent = {
        type: 'start',
        data: {
          total_subtitles: 2,
          total_batches: 2,
          message: '开始优化字幕'
        }
      };

      const mockBatchStartEvent = {
        type: 'batch_start',
        data: {
          batch_number: 1,
          total_batches: 2,
          batchSize: 1,
          processed_count: 0,
          total_count: 2,
          message: '开始处理批次 1/2'
        }
      };

      const mockCompleteEvent = {
        type: 'complete',
        data: {
          total_subtitles: 2,
          optimized_subtitles: [
            { id: 1, original_text: 'Test 1', optimized_text: 'Test 1 optimized', diffs: [] },
            { id: 2, original_text: 'Test 2', optimized_text: 'Test 2 optimized', diffs: [] }
          ],
          metadata: {
            total_subtitles: 2,
            batches_processed: 2,
            cache_hits: 0,
            cache_hit_rate: 0,
            processing_time: 2.0,
            model_used: 'gpt-3.5-turbo',
            optimized_count: 2,
            fallback_count: 0,
            success_rate: 100
          },
          message: '字幕优化完成'
        }
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      let mockEventSourceInstance: any;
      (EventSource as any).mockImplementation((url: string) => {
        mockEventSourceInstance = {
          url,
          onmessage: null as ((event: MessageEvent) => void) | null,
          onerror: null as ((event: Event) => void) | null,
          close: vi.fn(),
          CONNECTING: 0,
          OPEN: 1,
          CLOSED: 2,
          readyState: 1,
        };
        return mockEventSourceInstance;
      });

      const mockSetTimeout = vi.fn().mockImplementation((callback: Function, delay: number) => {
        return 1;
      });
      global.setTimeout = mockSetTimeout;
      const mockClearTimeout = vi.fn();
      global.clearTimeout = mockClearTimeout;

      const request = {
        subtitles: [
          { id: 1, text: 'Test 1' },
          { id: 2, text: 'Test 2' }
        ],
      };

      const progressCallback = vi.fn();

      const resultPromise = optimizationService.optimizeSubtitles(request, progressCallback);

      // Simulate receiving progress events
      if (mockEventSourceInstance && mockEventSourceInstance.onmessage) {
        // Start event
        mockEventSourceInstance.onmessage({
          data: JSON.stringify(mockStartEvent),
        } as MessageEvent);

        // Batch start event
        mockEventSourceInstance.onmessage({
          data: JSON.stringify(mockBatchStartEvent),
        } as MessageEvent);

        // Complete event
        mockEventSourceInstance.onmessage({
          data: JSON.stringify(mockCompleteEvent),
        } as MessageEvent);
      }

      const result = await resultPromise;

      // Verify progress callback was called for each event
      expect(progressCallback).toHaveBeenCalledTimes(3);

      // Verify start event callback
      expect(progressCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({
        type: 'start',
        data: mockStartEvent.data,
        message: '开始优化字幕',
        timestamp: expect.any(Number),
      }));

      // Verify batch start event callback
      expect(progressCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
        type: 'batch_start',
        data: mockBatchStartEvent.data,
        message: '开始处理批次 1/2',
        timestamp: expect.any(Number),
      }));

      // Verify complete event callback
      expect(progressCallback).toHaveBeenNthCalledWith(3, expect.objectContaining({
        type: 'complete',
        data: mockCompleteEvent.data,
        message: '字幕优化完成',
        timestamp: expect.any(Number),
      }));
    });

    it('should handle SSE errors correctly', async () => {
      const mockErrorEvent = {
        type: 'error',
        data: {
          error: '优化过程中发生错误',
          message: '优化过程中发生错误'
        }
      };

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      let mockEventSourceInstance: any;
      (EventSource as any).mockImplementation((url: string) => {
        mockEventSourceInstance = {
          url,
          onmessage: null as ((event: MessageEvent) => void) | null,
          onerror: null as ((event: Event) => void) | null,
          close: vi.fn(),
          CONNECTING: 0,
          OPEN: 1,
          CLOSED: 2,
          readyState: 1,
        };
        return mockEventSourceInstance;
      });

      const mockSetTimeout = vi.fn().mockImplementation((callback: Function, delay: number) => {
        return 1;
      });
      global.setTimeout = mockSetTimeout;
      const mockClearTimeout = vi.fn();
      global.clearTimeout = mockClearTimeout;

      const request = {
        subtitles: [{ id: 1, text: 'Test' }],
      };

      const progressCallback = vi.fn();

      const resultPromise = optimizationService.optimizeSubtitles(request, progressCallback);

      // Simulate error event
      if (mockEventSourceInstance && mockEventSourceInstance.onmessage) {
        mockEventSourceInstance.onmessage({
          data: JSON.stringify(mockErrorEvent),
        } as MessageEvent);
      }

      // Should reject with error
      await expect(resultPromise).rejects.toThrow('优化过程中发生错误');

      // Verify cleanup
      expect(mockEventSourceInstance.close).toHaveBeenCalled();
      expect(mockClearTimeout).toHaveBeenCalled();
    });

    it('should handle EventSource connection errors', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      let mockEventSourceInstance: any;
      (EventSource as any).mockImplementation((url: string) => {
        mockEventSourceInstance = {
          url,
          onmessage: null as ((event: MessageEvent) => void) | null,
          onerror: null as ((event: Event) => void) | null,
          close: vi.fn(),
          CONNECTING: 0,
          OPEN: 1,
          CLOSED: 2,
          readyState: 1,
        };
        return mockEventSourceInstance;
      });

      const mockSetTimeout = vi.fn().mockImplementation((callback: Function, delay: number) => {
        return 1;
      });
      global.setTimeout = mockSetTimeout;
      const mockClearTimeout = vi.fn();
      global.clearTimeout = mockClearTimeout;

      const request = {
        subtitles: [{ id: 1, text: 'Test' }],
      };

      const progressCallback = vi.fn();

      const resultPromise = optimizationService.optimizeSubtitles(request, progressCallback);

      // Simulate EventSource error
      if (mockEventSourceInstance && mockEventSourceInstance.onerror) {
        mockEventSourceInstance.onerror(new Event('error'));
      }

      // Should reject with connection error
      await expect(resultPromise).rejects.toThrow('SSE 连接错误');

      // Verify cleanup
      expect(mockEventSourceInstance.close).toHaveBeenCalled();
      expect(mockClearTimeout).toHaveBeenCalled();
    });

    it('should handle timeout correctly', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      });

      let mockEventSourceInstance: any;
      (EventSource as any).mockImplementation((url: string) => {
        mockEventSourceInstance = {
          url,
          onmessage: null as ((event: MessageEvent) => void) | null,
          onerror: null as ((event: Event) => void) | null,
          close: vi.fn(),
          CONNECTING: 0,
          OPEN: 1,
          CLOSED: 2,
          readyState: 1,
        };
        return mockEventSourceInstance;
      });

      let timeoutCallback: Function | null = null;
      const mockSetTimeout = vi.fn().mockImplementation((callback: Function, delay: number) => {
        timeoutCallback = callback;
        return 1;
      });
      global.setTimeout = mockSetTimeout;
      const mockClearTimeout = vi.fn();
      global.clearTimeout = mockClearTimeout;

      const request = {
        subtitles: [{ id: 1, text: 'Test' }],
      };

      const progressCallback = vi.fn();

      const resultPromise = optimizationService.optimizeSubtitles(request, progressCallback);

      // Verify timeout was set
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 300000);

      // Simulate timeout
      if (timeoutCallback) {
        timeoutCallback();
      }

      // Should reject with timeout error
      await expect(resultPromise).rejects.toThrow('优化请求超时');

      // Verify cleanup
      expect(mockEventSourceInstance.close).toHaveBeenCalled();
      expect(mockClearTimeout).toHaveBeenCalled();
    });

    it('should handle fetch request failure', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      let mockEventSourceInstance: any;
      (EventSource as any).mockImplementation((url: string) => {
        mockEventSourceInstance = {
          url,
          onmessage: null as ((event: MessageEvent) => void) | null,
          onerror: null as ((event: Event) => void) | null,
          close: vi.fn(),
          CONNECTING: 0,
          OPEN: 1,
          CLOSED: 2,
          readyState: 1,
        };
        return mockEventSourceInstance;
      });

      const mockSetTimeout = vi.fn().mockImplementation((callback: Function, delay: number) => {
        return 1;
      });
      global.setTimeout = mockSetTimeout;
      const mockClearTimeout = vi.fn();
      global.clearTimeout = mockClearTimeout;

      const request = {
        subtitles: [{ id: 1, text: 'Test' }],
      };

      const progressCallback = vi.fn();

      // Should reject with fetch error
      await expect(
        optimizationService.optimizeSubtitles(request, progressCallback)
      ).rejects.toThrow('请求发送失败: Network error');

      // Verify cleanup
      expect(mockEventSourceInstance.close).toHaveBeenCalled();
      expect(mockClearTimeout).toHaveBeenCalled();
    });
  });
});