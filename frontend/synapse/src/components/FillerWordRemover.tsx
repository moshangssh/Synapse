import { useEffect, useState } from 'react';
import { Button, Checkbox, FormControlLabel } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { useDataStore } from '../stores/useDataStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import useNotifier from '../hooks/useNotifier';
import { calculateDiff } from '../utils/diff';

// 转义正则表达式特殊字符
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& 表示匹配到的子字符串
}

export function FillerWordRemover() {
  const { subtitles, setSubtitles } = useDataStore();
  const { fillerWords, loadFillerWords } = useSettingsStore();
  const notify = useNotifier();
  const [removePunctuation, setRemovePunctuation] = useState(false);

  useEffect(() => {
    // Load filler words when the component mounts
    if (fillerWords.length === 0) {
      loadFillerWords();
    }
  }, [loadFillerWords, fillerWords.length]);

  const handleRemoveFillerWords = () => {
    if (fillerWords.length === 0) {
      notify.warning('口水词列表为空，无法执行操作。');
      return;
    }

    try {
      // For Chinese, word boundaries \b are not effective.
      // We will match the words directly.
      // 对每个口水词进行转义以防止正则表达式注入
      const escapedWords = fillerWords.map(escapeRegExp);
      const fillerWordsRegex = new RegExp(escapedWords.join('|'), 'g');
      
      let changesMade = false;
      const updatedSubtitles = subtitles.map(subtitle => {
        // Replace filler words with an empty string and remove consecutive spaces that might result
        let cleanedText = subtitle.text.replace(fillerWordsRegex, '').replace(/\s+/g, ' ').trim();
        
        // 只有当用户选择移除标点符号时才执行此操作
        if (removePunctuation) {
          // Replace all punctuation marks except book title marks《》and double quotes"" with spaces
          // This regex matches all punctuation except Chinese book title marks《》and double quotes""
          cleanedText = cleanedText.replace(/[^\w\s\u4e00-\u9fff《》"]/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        if (cleanedText !== subtitle.text) {
          changesMade = true;
          const newDiffs = calculateDiff(subtitle.originalText, cleanedText);
          return { ...subtitle, text: cleanedText, diffs: newDiffs };
        }
        return subtitle;
      });

      if (changesMade) {
        const originalSubtitles = [...subtitles]; // 创建一个副本用于撤销
        setSubtitles(updatedSubtitles);
        notify.success('已成功移除所有口水词！', {
          action: () => (
            <Button color="inherit" size="small" onClick={() => {
              setSubtitles(originalSubtitles);
              // 可选：在撤销后关闭 snackbar
              // closeSnackbar(key);
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
    }
  };

  return (
    <div>
      <FormControlLabel
        control={
          <Checkbox
            checked={removePunctuation}
            onChange={(e) => setRemovePunctuation(e.target.checked)}
            color="primary"
          />
        }
        label="同时移除标点符号 (谨慎操作)"
      />
      <Button
        variant="contained"
        startIcon={<Trash2 size={16} />}
        onClick={handleRemoveFillerWords}
        disabled={fillerWords.length === 0 || subtitles.length === 0}
        sx={{ mt: 1 }}
      >
        一键去口水词
      </Button>
    </div>
  );
}