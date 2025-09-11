import { API_BASE_URL, API_ENDPOINTS, HTTP_METHODS, handleApiError, handleNetworkError } from './apiConfig';
import { Subtitle, OptimizationRequest, OptimizationResponse } from '../types';

// 优化服务类
class OptimizationService {
  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // 从设置存储获取 API 密钥（如果存在）
    try {
      const { useSettingsStore } = await import('../stores/useSettingsStore');
      const apiKey = useSettingsStore.getState().apiKey;
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    } catch (error) {
      console.warn('无法获取 API 密钥:', error);
    }
    
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
   * 执行字幕优化 - 支持分批发送
   */
  async optimizeSubtitles(request: OptimizationRequest): Promise<OptimizationResponse> {
    // 从设置存储获取默认配置
    let defaultConfig: Partial<OptimizationRequest> = {
      batch_size: 10,
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 2000,
    };

    try {
      const { useSettingsStore } = await import('../stores/useSettingsStore');
      const apiConfig = useSettingsStore.getState().apiConfig;
      defaultConfig = {
        batch_size: apiConfig.batchSize,
        model: apiConfig.model,
        temperature: apiConfig.temperature,
        max_tokens: apiConfig.maxTokens,
        api_key: apiConfig.apiKey,  // 添加 API 密钥
        endpoint: apiConfig.endpoint  // 添加 API 端点
      };
    } catch (error) {
      console.warn('无法获取 API 配置，使用默认值:', error);
    }

    const finalRequest = {
      ...defaultConfig,
      ...request,
    };

    console.log('开始优化字幕:', {
      subtitleCount: finalRequest.subtitles.length,
      hasReferenceInfo: !!finalRequest.reference_info,
      batchSize: finalRequest.batch_size,
      model: finalRequest.model,
      hasApiKey: !!finalRequest.api_key,
      hasEndpoint: !!finalRequest.endpoint
    });

    // 检查是否需要分批发送
    if (finalRequest.subtitles.length > finalRequest.batch_size) {
      console.log(`字幕数量(${finalRequest.subtitles.length})超过批次大小(${finalRequest.batch_size})，开始分批发送`);
      return this.optimizeSubtitlesInBatches(finalRequest);
    } else {
      console.log('单批发送字幕');
      return this.makeRequest<OptimizationResponse>(
        API_ENDPOINTS.OPTIMIZER_OPTIMIZE,
        {
          method: HTTP_METHODS.POST,
          body: JSON.stringify(finalRequest),
        }
      );
    }
  }

  /**
   * 分批发送字幕优化请求
   */
  private async optimizeSubtitlesInBatches(request: OptimizationRequest): Promise<OptimizationResponse> {
    const { subtitles, batch_size, ...otherConfig } = request;
    const batches: typeof subtitles[] = [];
    
    // 将字幕分成批次
    for (let i = 0; i < subtitles.length; i += batch_size) {
      batches.push(subtitles.slice(i, i + batch_size));
    }

    console.log(`将 ${subtitles.length} 条字幕分成 ${batches.length} 个批次:`, 
      batches.map((batch, index) => `批次${index + 1}: ${batch.length}条`).join(', ')
    );

    const allResults: OptimizationResponse['data'] = [];
    const allMetadata: OptimizationResponse['metadata'] = {
      total_subtitles: subtitles.length,
      batches_processed: 0,
      cache_hits: 0,
      cache_hit_rate: 0,
      processing_time: 0,
      model_used: request.model,
      errors_count: 0
    };

    // 逐个发送批次请求
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`正在发送批次 ${i + 1}/${batches.length} (${batch.length} 条字幕)`);

      const batchRequest: OptimizationRequest = {
        subtitles: batch,
        batch_size: batch_size,
        ...otherConfig
      };

      try {
        const batchResponse = await this.makeRequest<OptimizationResponse>(
          API_ENDPOINTS.OPTIMIZER_OPTIMIZE,
          {
            method: HTTP_METHODS.POST,
            body: JSON.stringify(batchRequest),
          }
        );

        console.log(`批次 ${i + 1} 处理成功，获得 ${batchResponse.data.length} 条结果`);
        allResults.push(...batchResponse.data);
        
        // 累积元数据
        if (batchResponse.metadata) {
          allMetadata.batches_processed += batchResponse.metadata.batches_processed || 1;
          allMetadata.cache_hits += batchResponse.metadata.cache_hits || 0;
          allMetadata.processing_time += batchResponse.metadata.processing_time || 0;
          allMetadata.errors_count += batchResponse.metadata.errors_count || 0;
        }

      } catch (error) {
        console.error(`批次 ${i + 1} 处理失败:`, error);
        allMetadata.errors_count += 1;
        
        // 为失败的批次创建原始字幕作为备用
        const fallbackResults = batch.map(subtitle => ({
          id: subtitle.id,
          original_text: subtitle.text,
          optimized_text: subtitle.text,
          confidence: 0.5,
          changes: [],
          has_changes: false
        }));
        allResults.push(...fallbackResults);
      }
    }

    // 计算最终的缓存命中率
    allMetadata.cache_hit_rate = allMetadata.batches_processed > 0 
      ? allMetadata.cache_hits / allMetadata.batches_processed 
      : 0;

    console.log(`所有批次处理完成，总共获得 ${allResults.length} 条结果`);
    console.log('最终元数据:', allMetadata);

    return {
      data: allResults,
      metadata: allMetadata
    };
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

    if (request.batch_size !== undefined && (typeof request.batch_size !== 'number' || request.batch_size < 1)) {
      errors.push('批处理大小必须是大于0的数字');
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
}

// 导出单例实例
export const optimizationService = new OptimizationService();

