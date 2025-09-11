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
} from '@mui/material';
import { ChevronDown, Settings, Sparkles } from 'lucide-react';
import { FillerWordRemover } from '../FillerWordRemover';
import { ApiSettingsModal } from '../ApiSettingsModal';
import { ResultReviewModal } from '../ResultReviewModal';
import { useState } from 'react';
import { useSubtitleStore } from '../../stores/useSubtitleStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { optimizationService } from '../../services/optimizationService';
import { Subtitle, OptimizationResponse } from '../../types';

export function OptimizerSidebar() {
  const theme = useTheme();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [referenceInfo, setReferenceInfo] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const [optimizationSuccess, setOptimizationSuccess] = useState<string | null>(null);
  const [resultReviewModalOpen, setResultReviewModalOpen] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResponse | null>(null);
  
  const { subtitles, setSubtitles } = useSubtitleStore();
  const { apiConfig } = useSettingsStore();
  
  const handleOptimizeSubtitles = async () => {
    if (!subtitles || subtitles.length === 0) {
      setOptimizationError('没有可优化的字幕');
      return;
    }
    
    // 检查 API 配置
    if (!apiConfig.apiKey || !apiConfig.endpoint) {
      setOptimizationError('请先配置 API 设置');
      return;
    }
    
    setIsOptimizing(true);
    setOptimizationError(null);
    setOptimizationSuccess(null);
    
    try {
      // 创建优化请求
      const request = optimizationService.createOptimizationRequest(subtitles, referenceInfo);
      
      // 验证请求
      const validation = optimizationService.validateOptimizationRequest(request);
      if (!validation.isValid) {
        setOptimizationError(validation.errors.join(', '));
        return;
      }
      
      // 发送优化请求（带超时）
      const response = await optimizationService.withTimeout(
        optimizationService.optimizeSubtitles(request),
        60000 // 60秒超时
      );
      
      // 保存优化结果并打开结果审阅模态窗口
      setOptimizationResult(response);
      setResultReviewModalOpen(true);
      setOptimizationSuccess(`成功优化 ${response.data.length} 个字幕条目`);
      
      // 清空参考信息
      setReferenceInfo('');
      
    } catch (error) {
      console.error('优化失败:', error);
      setOptimizationError(error instanceof Error ? error.message : '优化失败，请重试');
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
          originalText: optimizedItem.originalText,
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
              disabled={isOptimizing || (!subtitles || subtitles.length === 0) || !apiConfig.apiKey || !apiConfig.endpoint || !apiConfig.model}
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