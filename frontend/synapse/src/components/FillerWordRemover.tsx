import { useState, useEffect } from 'react';
import { Button, Checkbox, FormControlLabel, Box, Typography } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { useSubtitleStore } from '../stores/useSubtitleStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import useNotifier from '../hooks/useNotifier';
import { calculateDiffApi } from '../integration/diffApi';
import { removeFillerWords } from '../services/subtitleService';

export function FillerWordRemover() {
  const { subtitles, setSubtitles } = useSubtitleStore();
  const { fillerWords, loadFillerWords } = useSettingsStore();
  const notify = useNotifier();
  const [removePunctuation, setRemovePunctuation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 组件挂载时加载口水词列表
  useEffect(() => {
    loadFillerWords();
  }, [loadFillerWords]);

  const handleRemoveFillerWords = async () => {
    console.log('[FillerWordRemover] 开始执行去口水词操作');
    
    if (fillerWords.length === 0) {
      console.warn('[FillerWordRemover] 口水词列表为空');
      notify.warning('口水词列表为空，无法执行操作。');
      return;
    }

    if (subtitles.length === 0) {
      console.warn('[FillerWordRemover] 字幕列表为空');
      notify.warning('字幕列表为空，无法执行操作。');
      return;
    }

    setIsProcessing(true);
    console.log(`[FillerWordRemover] 处理参数 - 字幕数量: ${subtitles.length}, 移除标点符号: ${removePunctuation}`);

    try {
      // 调用后端API
      console.log('[FillerWordRemover] 调用后端API进行处理');
      const processedSubtitles = await removeFillerWords(subtitles, removePunctuation);
      console.log(`[FillerWordRemover] 后端处理完成，返回 ${processedSubtitles.length} 条字幕`);

      // 检查是否有变化
      const hasChanges = processedSubtitles.some((processedSubtitle: any, index: number) => 
        processedSubtitle.text !== subtitles[index].text
      );
      
      console.log(`[FillerWordRemover] 检查变化结果: ${hasChanges}`);

      if (hasChanges) {
        console.log('[FillerWordRemover] 发现变化，更新字幕状态');
        // 创建原始副本用于撤销
        const originalSubtitles = [...subtitles];

        // 直接使用后端处理好的数据进行更新
        const updatedSubtitles = processedSubtitles.map((processed, index) => ({
          ...subtitles[index],
          text: processed.text,
          diffs: processed.diffs, // 直接使用后端返回的diffs
          isModified: processed.text !== subtitles[index].originalText,
        }));

        setSubtitles(updatedSubtitles);

        notify.success('已成功移除所有口水词！', {
          action: () => (
            <Button color="inherit" size="small" onClick={() => {
              console.log('[FillerWordRemover] 用户执行撤销操作');
              setSubtitles(originalSubtitles);
            }}>
              撤销
            </Button>
          ),
        });
      } else {
        console.log('[FillerWordRemover] 未发现可移除的口水词');
        notify.info('未发现可移除的口水词。');
      }
    } catch (error) {
      console.error('[FillerWordRemover] 处理失败:', error);
      notify.error('移除失败，请检查控制台获取更多信息。');
    } finally {
      console.log('[FillerWordRemover] 处理完成');
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