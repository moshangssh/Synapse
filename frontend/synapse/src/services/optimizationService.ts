import { API_BASE_URL, API_ENDPOINTS, HTTP_METHODS, handleApiError, handleNetworkError } from './apiConfig';
import { 
  Subtitle, 
  OptimizationRequest, 
  OptimizationResponse, 
  ConnectionTestRequest, 
  ConnectionTestResponse,
  OptimizationProgressEvent
} from '../types';
import { useSettingsStore } from '../stores/useSettingsStore';

// 优化服务类
class OptimizationService {
  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // API 密钥由前端管理，通过请求体发送给后端
    
    return headers;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = await this.getHeaders();
    const defaultOptions: RequestInit = {
      headers,
    };

    const config = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        await handleApiError(response, '优化请求失败');
      }

      return await response.json();
    } catch (error) {
      throw handleNetworkError(error, '优化请求');
    }
  }

  /**
   * 执行字幕优化 - 使用流式响应提供实时进度反馈
   */
  async optimizeSubtitles(
    request: OptimizationRequest, 
    progressCallback?: (event: OptimizationProgressEvent) => void
  ): Promise<OptimizationResponse> {
    // 从设置存储获取默认配置
    let defaultConfig: Partial<OptimizationRequest> = {
      batchSize: 10,
      parallelismCount: 0,
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 2000,
      apiKey: '',
      apiUrl: '',
    };

    try {
      const apiConfig = useSettingsStore.getState().apiConfig;
      defaultConfig = {
        batchSize: apiConfig.batchSize,
        parallelismCount: apiConfig.parallelismCount,
        model: apiConfig.model,
        temperature: apiConfig.temperature,
        max_tokens: apiConfig.maxTokens,
        apiKey: apiConfig.apiKey,
        apiUrl: apiConfig.apiUrl
      };
    } catch (error) {
      console.warn('无法获取 API 配置，使用默认值:', error);
    }

    const finalRequest = {
      ...request,
      batchSize: request.batchSize ?? defaultConfig.batchSize,
      parallelismCount: request.parallelismCount ?? defaultConfig.parallelismCount,
      model: request.model ?? defaultConfig.model,
      temperature: request.temperature ?? defaultConfig.temperature,
      max_tokens: request.max_tokens ?? defaultConfig.max_tokens,
      apiKey: request.apiKey ?? defaultConfig.apiKey,
      apiUrl: request.apiUrl ?? defaultConfig.apiUrl,
    };

    console.log('开始优化字幕:', {
      subtitleCount: finalRequest.subtitles.length,
      hasReferenceInfo: !!finalRequest.reference_info,
      batchSize: finalRequest.batchSize,
      model: finalRequest.model
    });

    // 使用流式优化
    return this.optimizeSubtitlesStream(finalRequest, progressCallback);
  }


  /**
   * 验证优化请求
   */
  validateOptimizationRequest(request: OptimizationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.subtitles || !Array.isArray(request.subtitles)) {
      errors.push('字幕数据必须是一个数组');
    } else if (request.subtitles.length === 0) {
      errors.push('至少需要一个字幕条目');
    } else {
      request.subtitles.forEach((subtitle, index) => {
        if (!subtitle.id || typeof subtitle.id !== 'number') {
          errors.push(`字幕 ${index + 1}: ID 必须是数字`);
        }
        if (!subtitle.text || typeof subtitle.text !== 'string' || subtitle.text.trim() === '') {
          errors.push(`字幕 ${index + 1}: 文本不能为空`);
        }
      });
    }

    if (request.reference_info && typeof request.reference_info !== 'string') {
      errors.push('参考信息必须是字符串');
    }

    if (request.batchSize !== undefined && (typeof request.batchSize !== 'number' || request.batchSize < 1)) {
      errors.push('批处理大小必须是大于0的数字');
    }

    if (request.parallelismCount !== undefined && (typeof request.parallelismCount !== 'number' || request.parallelismCount < 0)) {
      errors.push('并行数量必须是非负整数');
    }

    if (request.temperature !== undefined && (typeof request.temperature !== 'number' || request.temperature < 0 || request.temperature > 2)) {
      errors.push('温度值必须在0到2之间');
    }

    if (request.max_tokens !== undefined && (typeof request.max_tokens !== 'number' || request.max_tokens < 1)) {
      errors.push('最大令牌数必须是大于0的数字');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 从字幕数据创建优化请求
   */
  createOptimizationRequest(
    subtitles: Subtitle[],
    referenceInfo?: string
  ): OptimizationRequest {
    return {
      subtitles: subtitles.map(subtitle => ({
        id: subtitle.id,
        text: subtitle.text,
      })),
      reference_info: referenceInfo,
    };
  }

  /**
   * 流式优化字幕 - 使用 EventSource API 处理实时进度
   */
  private async optimizeSubtitlesStream(
    request: OptimizationRequest,
    progressCallback?: (event: OptimizationProgressEvent) => void
  ): Promise<OptimizationResponse> {
    // 将请求数据编码为查询参数
    const encodedData = encodeURIComponent(JSON.stringify(request));
    const url = `${API_BASE_URL}${API_ENDPOINTS.OPTIMIZER_OPTIMIZE_STREAM}?optimize_data=${encodedData}`;
    
    return new Promise((resolve, reject) => {
      let eventSource: EventSource | null = null;
      let completed = false;
      
      try {
        // 发送请求并监听 SSE 事件
        eventSource = new EventSource(url, {
          withCredentials: false
        });
        
        // 超时处理
        const timeoutId = setTimeout(() => {
          if (eventSource && !completed) {
            eventSource.close();
            reject(new Error('优化请求超时'));
          }
        }, 300000); // 5分钟超时
        
        // 处理 SSE 消息
        eventSource.onmessage = (event) => {
          try {
            const sseEvent = JSON.parse(event.data);
            const progressEvent: OptimizationProgressEvent = {
              type: sseEvent.type,
              data: sseEvent.data,
              message: sseEvent.data.message || '',
              timestamp: Date.now()
            };
            
            // 调用进度回调
            if (progressCallback) {
              progressCallback(progressEvent);
            }
            
            // 处理不同类型的事件
            switch (sseEvent.type) {
              case 'complete':
                completed = true;
                clearTimeout(timeoutId);
                eventSource?.close();
                
                // 转换为标准的 OptimizationResponse 格式
                const response: OptimizationResponse = {
                  data: sseEvent.data.optimized_subtitles.map((item: any) => ({
                    id: item.id,
                    original_text: item.original_text,
                    optimized_text: item.optimized_text,
                    diffs: item.diffs || []
                  })),
                  metadata: {
                    processing_time: sseEvent.data.metadata.processing_time,
                    cache_stats: {
                      cache_hits: sseEvent.data.metadata.cache_hits,
                      cache_misses: sseEvent.data.metadata.cache_misses || 0
                    },
                    error_count: sseEvent.data.metadata.fallback_count || 0
                  }
                };
                
                resolve(response);
                break;
                
              case 'error':
                completed = true;
                clearTimeout(timeoutId);
                eventSource?.close();
                reject(new Error(sseEvent.data.error || '优化过程中发生错误'));
                break;
                
              case 'batch_start':
              case 'batch_complete':
              case 'batch_error':
                // 这些是进度事件，不需要特殊处理，回调已经调用了
                break;
                
              default:
                console.warn('未知的 SSE 事件类型:', sseEvent.type);
            }
          } catch (error) {
            console.error('解析 SSE 事件失败:', error);
          }
        };
        
        // 处理 SSE 错误
        eventSource.onerror = (_) => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            eventSource?.close();
            reject(new Error('SSE 连接错误'));
          }
        };
        
      } catch (error) {
        if (eventSource && !completed) {
          eventSource.close();
        }
        reject(new Error('流式优化初始化失败: ' + (error as Error).message));
      }
    });
  }

  /**
   * 超时包装器
   */
  async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * 测试API连通性
   */
  async testConnection(request: ConnectionTestRequest): Promise<ConnectionTestResponse> {
    console.log('开始API连通性测试:', {
      apiUrl: request.api_url,
      model: request.model
    });

    try {
      const response = await this.makeRequest<ConnectionTestResponse>(
        API_ENDPOINTS.OPTIMIZER_TEST_CONNECTION,
        {
          method: HTTP_METHODS.POST,
          body: JSON.stringify(request),
        }
      );

      console.log('API连通性测试结果:', response);
      return response;
    } catch (error) {
      console.error('API连通性测试失败:', error);
      
      // 返回一个错误响应
      return {
        success: false,
        message: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        response_time: 0
      };
    }
  }
}

// 导出单例实例
export const optimizationService = new OptimizationService();

