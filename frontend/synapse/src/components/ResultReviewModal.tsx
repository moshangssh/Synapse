import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { ChevronDown, Check, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import DiffHighlighter, { DiffPart } from './DiffHighlighter';
import { OptimizationResponse, Subtitle } from '../types';

interface ResultReviewModalProps {
  open: boolean;
  optimizationResult: OptimizationResponse | null;
  error: string | null;
  onClose: () => void;
  onApply: (optimizedSubtitles: Subtitle[]) => void;
  onCancel: () => void;
}

export function ResultReviewModal({
  open,
  optimizationResult,
  error,
  onClose,
  onApply,
  onCancel,
}: ResultReviewModalProps) {
  const theme = useTheme();
  const [isApplying, setIsApplying] = useState(false);

  // 转换后端diff格式到前端DiffHighlighter格式
  const transformDiffs = useCallback((backendDiffs: Array<{ type: 'add' | 'remove' | 'normal'; value: string }>): DiffPart[] => {
    return backendDiffs.map(diff => ({
      type: diff.type === 'add' ? 'added' : diff.type === 'remove' ? 'removed' : 'normal',
      value: diff.value,
    }));
  }, []);

  // 过滤出实际被修改的字幕
  const getModifiedSubtitles = useCallback(() => {
    if (!optimizationResult) return [];
    
    return optimizationResult.data.filter(item => 
      item.original_text !== item.optimized_text
    );
  }, [optimizationResult]);

  // 处理"全部应用"按钮点击
  const handleApplyAll = useCallback(async () => {
    if (!optimizationResult) return;
    
    setIsApplying(true);
    try {
      // 将优化结果转换为Subtitle格式
      const optimizedSubtitles: Subtitle[] = optimizationResult.data.map(item => ({
        id: item.id,
        startTimecode: '', // 这些会在实际应用时从store中获取
        endTimecode: '',   // 这些会在实际应用时从store中获取
        text: item.optimized_text,
        originalText: item.original_text,
        diffs: transformDiffs(item.diffs),
        isModified: item.original_text !== item.optimized_text,
      }));
      
      onApply(optimizedSubtitles);
      onClose();
    } catch (error) {
      console.error('应用优化结果失败:', error);
    } finally {
      setIsApplying(false);
    }
  }, [optimizationResult, onApply, onClose, transformDiffs]);

  // 处理"取消"按钮点击
  const handleCancel = useCallback(() => {
    onCancel();
    onClose();
  }, [onCancel, onClose]);

  const modifiedSubtitles = getModifiedSubtitles();

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      aria-labelledby="result-review-modal-title"
    >
      <DialogTitle
        id="result-review-modal-title"
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            结果审阅
          </Typography>
          {optimizationResult && (
            <Typography variant="body2" color="text.secondary">
              {modifiedSubtitles.length} 个字幕被修改
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          backgroundColor: theme.palette.background.paper,
          padding: 0,
          minHeight: '400px',
        }}
      >
        {error && (
          <Alert
            severity="error"
            sx={{
              margin: 2,
              '& .MuiAlert-message': {
                fontSize: '0.9rem',
              },
            }}
          >
            {error}
          </Alert>
        )}

        {optimizationResult && (
          <Box sx={{ p: 2 }}>
            {modifiedSubtitles.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '200px',
                  color: theme.palette.text.secondary,
                }}
              >
                <Typography variant="body1" sx={{ mb: 1 }}>
                  没有检测到任何修改
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  所有字幕内容保持不变
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  以下是被修改的字幕内容，请审阅后决定是否应用：
                </Typography>
                
                {modifiedSubtitles.map((item, index) => (
                  <Accordion
                    key={item.id}
                    defaultExpanded={index === 0}
                    sx={{
                      backgroundColor: theme.palette.action.hover,
                      '&:before': {
                        display: 'none',
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ChevronDown size={16} />}
                      sx={{
                        minHeight: '48px',
                        '&.Mui-expanded': {
                          minHeight: '48px',
                        },
                        '& .MuiAccordionSummary-content': {
                          margin: '12px 0',
                          '&.Mui-expanded': {
                            margin: '12px 0',
                          },
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          字幕 #{item.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          已修改
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails sx={{ pt: 0 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* 原始文本 */}
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            原始文本：
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              backgroundColor: theme.palette.action.disabled,
                              padding: 1,
                              borderRadius: 1,
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                            }}
                          >
                            {item.original_text}
                          </Typography>
                        </Box>
                        
                        {/* 优化后文本 */}
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            优化后文本：
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              backgroundColor: theme.palette.mode === 'dark' 
                                ? 'rgba(25, 118, 210, 0.12)' 
                                : 'rgba(25, 118, 210, 0.08)',
                              padding: 1,
                              borderRadius: 1,
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                            }}
                          >
                            {item.optimized_text}
                          </Typography>
                        </Box>
                        
                        {/* 差异高亮 */}
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            差异对比：
                          </Typography>
                          <Box
                            sx={{
                              backgroundColor: theme.palette.background.default,
                              padding: 1,
                              borderRadius: 1,
                              border: `1px solid ${theme.palette.divider}`,
                            }}
                          >
                            <DiffHighlighter diffs={transformDiffs(item.diffs)} />
                          </Box>
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`,
          padding: 2,
        }}
      >
        <Button
          onClick={handleCancel}
          disabled={isApplying}
          startIcon={<X size={16} />}
          aria-label="取消应用优化结果"
          sx={{
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          取消
        </Button>
        
        <Button
          onClick={handleApplyAll}
          disabled={isApplying || !optimizationResult || modifiedSubtitles.length === 0}
          variant="contained"
          startIcon={isApplying ? <CircularProgress size={16} /> : <Check size={16} />}
          aria-label="应用所有优化结果"
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
          }}
        >
          {isApplying ? '应用中...' : '全部应用'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}