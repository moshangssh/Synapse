import { useState, useEffect } from 'react';
import { Button, Checkbox, FormControlLabel, Box, Typography } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { useDataStore } from '../stores/useDataStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import useNotifier from '../hooks/useNotifier';
import { calculateDiffApi } from '../integration/diffApi';

export function FillerWordRemover() {
  const { subtitles, setSubtitles } = useDataStore();
  const { fillerWords, loadFillerWords } = useSettingsStore();
  const notify = useNotifier();
  const [removePunctuation, setRemovePunctuation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 组件挂载时加载口水词列表
  useEffect(() => {
    loadFillerWords();
  }, [loadFillerWords]);

  const handleRemoveFillerWords = async () => {
    if (fillerWords.length === 0) {
      notify.warning('口水词列表为空，无法执行操作。');
      return;
    }

    if (subtitles.length === 0) {
      notify.warning('字幕列表为空，无法执行操作。');
      return;
    }

    setIsProcessing(true);

    try {
      // 准备API请求的数据
      const requestData = {
        subtitles: subtitles.map(subtitle => ({
          id: subtitle.id,
          startTimecode: subtitle.startTimecode,
          endTimecode: subtitle.endTimecode,
          text: subtitle.text
        })),
        removePunctuation: removePunctuation
      };

      // 调用后端API
      const response = await fetch('http://localhost:8000/api/v1/subtitles/remove-filler-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        // 处理API错误响应
        const errorDetail = data.detail || {};
        const errorMessage = errorDetail.message || '移除口水词时发生错误';
        notify.error(errorMessage);
        return;
      }

      // 处理成功的响应
      const processedSubtitles = data.data;
      
      // 检查是否有变化
      const hasChanges = processedSubtitles.some((processedSubtitle: any, index: number) => 
        processedSubtitle.text !== subtitles[index].text
      );

      if (hasChanges) {
        // 创建原始副本用于撤销
        const originalSubtitles = [...subtitles];
        
        // 转换处理后的字幕数据并更新状态，先使用占位符差异
        const updatedSubtitles = subtitles.map((subtitle, index) => ({
          ...subtitle,
          text: processedSubtitles[index].text,
          // 使用占位符差异
          diffs: [{ type: 'normal' as const, value: processedSubtitles[index].text }],
          // 标记为已修改
          isModified: processedSubtitles[index].text !== subtitle.originalText
        }));

        setSubtitles(updatedSubtitles);
        
        // 异步计算所有修改字幕的差异
        const updateAllDiffs = async () => {
          for (let index = 0; index < updatedSubtitles.length; index++) {
            const subtitle = updatedSubtitles[index];
            if (subtitle.text === subtitles[index].text) continue; // 跳过未修改的字幕

            try {
              const diffs = await calculateDiffApi(subtitle.originalText, subtitle.text);
              
              // 更新单个字幕的差异数据
              setSubtitles((currentSubtitles: any[]) => 
                currentSubtitles.map((s: any) => 
                  s.id === subtitle.id 
                    ? { ...s, diffs }
                    : s
                )
              );
            } catch (error) {
              console.error(`计算字幕 ${subtitle.id} 的差异失败:`, error);
              // 保持占位符差异
            }
          }
        };

        updateAllDiffs();
        
        notify.success('已成功移除所有口水词！', {
          action: () => (
            <Button color="inherit" size="small" onClick={() => {
              setSubtitles(originalSubtitles);
            }}>
              撤销
            </Button>
          ),
        });
      } else {
        notify.info('未发现可移除的口水词。');
      }
    } catch (error) {
      console.error('Failed to remove filler words:', error);
      notify.error('移除失败，请检查控制台获取更多信息。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={removePunctuation}
            onChange={(e) => setRemovePunctuation(e.target.checked)}
            color="primary"
            size="small"
            sx={{ p: '2px' }}
          />
        }
        label={
          <Typography sx={{ fontSize: '0.75rem' }}>
            同时移除标点符号 (谨慎操作)
          </Typography>
        }
        sx={{ ml: 0 }}
      />
      <Button
        variant="contained"
        startIcon={<Trash2 size={14} />}
        onClick={handleRemoveFillerWords}
        disabled={fillerWords.length === 0 || subtitles.length === 0 || isProcessing}
        size="small"
        sx={{ mt: 0.5 }}
      >
        {isProcessing ? '处理中...' : '一键去口水词'}
      </Button>
    </Box>
  );
}