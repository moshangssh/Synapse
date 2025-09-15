import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  useTheme,
  IconButton,
  Tooltip,
  Button,
  TextField,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import { ChevronDown, Settings, Sparkles } from 'lucide-react';
import { FillerWordRemover } from '../FillerWordRemover';
import { ApiSettingsModal } from '../ApiSettingsModal';
import { ResultReviewModal } from '../ResultReviewModal';
import { useState } from 'react';
import { useSubtitleStore } from '../../stores/useSubtitleStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { optimizationService } from '../../services/optimizationService';
import { Subtitle, OptimizationResponse, OptimizationProgressEvent } from '../../types';

export function OptimizerSidebar() {
  const theme = useTheme();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [referenceInfo, setReferenceInfo] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const [optimizationSuccess, setOptimizationSuccess] = useState<string | null>(null);
  const [resultReviewModalOpen, setResultReviewModalOpen] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResponse | null>(null);
  
  // 进度状态
  const [progressInfo, setProgressInfo] = useState<{
    currentBatch: number;
    totalBatches: number;
    processedCount: number;
    totalCount: number;
    progress: number;
    message: string;
  } | null>(null);
  
  const { subtitles, setSubtitles } = useSubtitleStore();
  const { apiConfig } = useSettingsStore();
  
  // 处理进度事件
  const handleProgressEvent = (event: OptimizationProgressEvent) => {
    console.log('收到进度事件:', event);
    
    switch (event.type) {
      case 'start':
        setProgressInfo({
          currentBatch: 0,
          totalBatches: event.data.total_batches,
          processedCount: 0,
          totalCount: event.data.total_subtitles,
          progress: 0,
          message: '开始优化...'
        });
        break;
        
      case 'batch_start':
        setProgressInfo(_ => ({
          currentBatch: event.data.batch_number,
          totalBatches: event.data.total_batches,
          processedCount: event.data.processed_count,
          totalCount: event.data.total_count,
          progress: (event.data.processed_count / event.data.total_count) * 100,
          message: `正在处理批次 ${event.data.batch_number}/${event.data.total_batches}...`
        }));
        break;
        
      case 'batch_complete':
        setProgressInfo(_ => ({
          currentBatch: event.data.batch_number,
          totalBatches: event.data.total_batches,
          processedCount: event.data.processed_count,
          totalCount: event.data.total_count,
          progress: (event.data.processed_count / event.data.total_count) * 100,
          message: `批次 ${event.data.batch_number} 处理完成 (${event.data.batch_processing_time}秒)`
        }));
        break;
        
      case 'batch_error':
        setProgressInfo(_ => ({
          currentBatch: event.data.batch_number,
          totalBatches: event.data.total_batches,
          processedCount: event.data.processed_count,
          totalCount: event.data.total_count,
          progress: (event.data.processed_count / event.data.total_count) * 100,
          message: `批次 ${event.data.batch_number} 处理失败，使用原始文本`
        }));
        break;
        
      case 'complete':
        setProgressInfo(null);
        break;
        
      case 'error':
        setProgressInfo(null);
        break;
    }
  };
  
  const handleOptimizeSubtitles = async () => {
    if (!subtitles || subtitles.length === 0) {
      setOptimizationError('没有可优化的字幕');
      return;
    }
    
    // API 配置现在在后端管理，前端不再需要检查凭证
    
    setIsOptimizing(true);
    setOptimizationError(null);
    setOptimizationSuccess(null);
    setProgressInfo(null);
    
    try {
      // 创建优化请求
      const request = optimizationService.createOptimizationRequest(subtitles, referenceInfo);
      
      // 验证请求
      const validation = optimizationService.validateOptimizationRequest(request);
      if (!validation.isValid) {
        setOptimizationError(validation.errors.join(', '));
        return;
      }
      
      // 发送优化请求（使用流式响应）
      const response = await optimizationService.optimizeSubtitles(request, handleProgressEvent);
      
      // 保存优化结果并打开结果审阅模态窗口
      setOptimizationResult(response);
      setResultReviewModalOpen(true);
      setOptimizationSuccess(`成功优化 ${response.data.length} 个字幕条目`);
      
      // 清空参考信息和进度信息
      setReferenceInfo('');
      setProgressInfo(null);
      
    } catch (error) {
      console.error('优化失败:', error);
      setOptimizationError(error instanceof Error ? error.message : '优化失败，请重试');
      setProgressInfo(null);
    } finally {
      setIsOptimizing(false);
    }
  };

  // 处理结果审阅模态窗口的"应用"回调
  const handleApplyOptimizedSubtitles = (optimizedSubtitles: Subtitle[]) => {
    // 将优化结果应用到实际的字幕数据
    const updatedSubtitles = subtitles.map(originalSubtitle => {
      const optimizedItem = optimizedSubtitles.find(item => item.id === originalSubtitle.id);
      if (optimizedItem) {
        return {
          ...originalSubtitle,
          text: optimizedItem.text,
          // 保留原始的 originalText，避免覆盖真正的原始文本
          originalText: originalSubtitle.originalText || originalSubtitle.text,
          isModified: optimizedItem.isModified,
          diffs: optimizedItem.diffs,
        };
      }
      return originalSubtitle;
    });
    
    setSubtitles(updatedSubtitles);
    setOptimizationResult(null);
  };

  // 处理结果审阅模态窗口的"取消"回调
  const handleCancelOptimizedSubtitles = () => {
    setOptimizationResult(null);
  };

  // 处理结果审阅模态窗口的"关闭"回调
  const handleCloseResultReviewModal = () => {
    setResultReviewModalOpen(false);
  };
  
  return (
    <>
      <Paper
        sx={{
          height: '100%',
          backgroundColor: '#1E1E1E',
          borderRadius: 0,
          borderRight: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
            Optimizer
          </Typography>
          <Tooltip title="API Settings">
            <IconButton
              onClick={() => setSettingsModalOpen(true)}
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': {
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <Settings size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      <Accordion
        defaultExpanded
        sx={{
          backgroundColor: 'transparent',
          color: theme.palette.text.primary,
          boxShadow: 'none',
          '&:before': {
            display: 'none',
          },
          margin: '0 !important',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ChevronDown size={16} />}
          sx={{
            minHeight: '32px',
            '&.Mui-expanded': {
              minHeight: '32px',
            },
            '& .MuiAccordionSummary-content': {
              fontWeight: 'bold',
              margin: '6px 0',
              '&.Mui-expanded': {
                margin: '6px 0',
              },
            },
          }}
        >
          <Typography sx={{ fontSize: '0.85rem' }}>Simple Mode</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0.5 }}>
          <FillerWordRemover />
        </AccordionDetails>
      </Accordion>
      
      {/* AI 优化部分 */}
      <Accordion
        defaultExpanded
        sx={{
          backgroundColor: 'transparent',
          color: theme.palette.text.primary,
          boxShadow: 'none',
          '&:before': {
            display: 'none',
          },
          margin: '0 !important',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ChevronDown size={16} />}
          sx={{
            minHeight: '32px',
            '&.Mui-expanded': {
              minHeight: '32px',
            },
            '& .MuiAccordionSummary-content': {
              fontWeight: 'bold',
              margin: '6px 0',
              '&.Mui-expanded': {
                margin: '6px 0',
              },
            },
          }}
        >
          <Typography sx={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Sparkles size={14} />
            AI Subtitle Optimization
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* 参考信息输入框 */}
            <TextField
              multiline
              rows={3}
              placeholder="Reference Information (optional)"
              value={referenceInfo}
              onChange={(e) => setReferenceInfo(e.target.value)}
              disabled={isOptimizing}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.paper,
                  '& fieldset': {
                    borderColor: theme.palette.divider,
                  },
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
                '& .MuiInputBase-input': {
                  color: theme.palette.text.primary,
                  fontSize: '0.85rem',
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.text.secondary,
                },
              }}
              inputProps={{
                maxLength: 1000,
              }}
              helperText={`${referenceInfo.length}/1000`}
            />
            
            {/* 优化按钮 */}
            <Button
              variant="contained"
              onClick={handleOptimizeSubtitles}
              disabled={isOptimizing || (!subtitles || subtitles.length === 0) || !apiConfig.model}
              startIcon={isOptimizing ? <CircularProgress size={16} /> : <Sparkles size={16} />}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
                '&:disabled': {
                  backgroundColor: theme.palette.action.disabled,
                  color: theme.palette.text.disabled,
                },
                fontSize: '0.85rem',
                py: 0.75,
              }}
            >
              {isOptimizing ? 'Optimizing...' : 'AI Optimize Subtitles'}
            </Button>
            
            {/* 进度指示器 */}
            {progressInfo && (
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={progressInfo.progress} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: theme.palette.action.hover,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: theme.palette.primary.main,
                    }
                  }} 
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}>
                    {progressInfo.message}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}>
                    {Math.round(progressInfo.progress)}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontSize: '0.7rem' }}>
                    批次: {progressInfo.currentBatch}/{progressInfo.totalBatches}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontSize: '0.7rem' }}>
                    {progressInfo.processedCount}/{progressInfo.totalCount}
                  </Typography>
                </Box>
              </Box>
            )}
            
            {/* 状态消息 */}
            {optimizationError && (
              <Alert
                severity="error"
                onClose={() => setOptimizationError(null)}
                sx={{
                  '& .MuiAlert-message': {
                    fontSize: '0.85rem',
                  },
                }}
              >
                {optimizationError}
              </Alert>
            )}
            
            {optimizationSuccess && (
              <Alert
                severity="success"
                onClose={() => setOptimizationSuccess(null)}
                sx={{
                  '& .MuiAlert-message': {
                    fontSize: '0.85rem',
                  },
                }}
              >
                {optimizationSuccess}
              </Alert>
            )}
            
            {/* 状态提示 */}
            {!subtitles || subtitles.length === 0 ? (
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.75rem',
                  fontStyle: 'italic',
                }}
              >
                No subtitles available for optimization
              </Typography>
            ) : (
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.75rem',
                }}
              >
                {subtitles.length} subtitle(s) available for optimization
              </Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
    
    <ApiSettingsModal
      open={settingsModalOpen}
      onClose={() => setSettingsModalOpen(false)}
    />
    
    <ResultReviewModal
      open={resultReviewModalOpen}
      optimizationResult={optimizationResult}
      error={optimizationError}
      onClose={handleCloseResultReviewModal}
      onApply={handleApplyOptimizedSubtitles}
      onCancel={handleCancelOptimizedSubtitles}
    />
    </>
  );
}