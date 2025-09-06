import { create } from 'zustand';
import { Subtitle } from '../types';
import { calculateDiffApi } from '../integration/diffApi';

interface SubtitleState {
  subtitles: Subtitle[];
  setSubtitles: (subtitles: Subtitle[]) => void;
  updateSubtitleText: (id: number, newText: string) => void;
  getModifiedSubtitleIndices: () => number[];
}

export const useSubtitleStore = create<SubtitleState>((set, get) => {
  return {
    subtitles: [],
    setSubtitles: (subtitles) => {
      // 添加类型检查保护
      if (!Array.isArray(subtitles)) {
        console.error('subtitles is not an array:', subtitles);
        return set({ subtitles: [] });
      }
      return set({ subtitles });
    },
    updateSubtitleText: (id, newText) => {
      const state = get();
      const index = state.subtitles.findIndex((sub) => sub.id === id);
      if (index === -1) return; // 未找到，不作任何事

      const subToUpdate = state.subtitles[index];
      // 如果文本没有实际改变，则不执行任何操作以避免不必要的重渲染
      if (subToUpdate.text === newText) return;

      const originalText = subToUpdate.originalText ?? subToUpdate.text;

      // 创建一个新的字幕对象，先使用占位符差异
      const updatedSubtitle = {
        ...subToUpdate,
        text: newText,
        originalText: originalText, // 确保 originalText 被保留
        isModified: newText !== originalText,
        diffs: [{ type: 'normal' as const, value: newText }], // 临时占位符
      };

      // 创建一个新的字幕数组副本
      const newSubtitles = [...state.subtitles];
      newSubtitles[index] = updatedSubtitle; // 在新数组中替换指定位置的字幕

      // 立即更新UI
      set({ subtitles: newSubtitles });

      // 异步调用API来更新差异数据
      const updateSubtitleDiffs = async () => {
        const currentState = get();
        const sub = currentState.subtitles.find((s) => s.id === id);
        if (!sub || sub.text !== newText) return; // 确保字幕状态没有变化

        const currentOriginalText = sub.originalText ?? sub.text;
        
        try {
          const diffs = await calculateDiffApi(currentOriginalText, newText);
          
          // 更新差异数据
          set((state) => {
            const currentIndex = state.subtitles.findIndex((s) => s.id === id);
            if (currentIndex === -1) return {};

            const updatedSubtitle = {
              ...state.subtitles[currentIndex],
              diffs: diffs,
            };

            const updatedSubtitles = [...state.subtitles];
            updatedSubtitles[currentIndex] = updatedSubtitle;

            return { subtitles: updatedSubtitles };
          });
        } catch (error) {
          console.error('计算文本差异失败:', error);
          // API调用失败时，保留占位符差异但添加错误状态
          set((state) => {
            const currentIndex = state.subtitles.findIndex((s) => s.id === id);
            if (currentIndex === -1) return {};

            const updatedSubtitle = {
              ...state.subtitles[currentIndex],
              diffs: [{ type: 'normal' as const, value: newText }], // 保持占位符
              diffError: true, // 添加错误状态标志
            };

            const updatedSubtitles = [...state.subtitles];
            updatedSubtitles[currentIndex] = updatedSubtitle;

            return { subtitles: updatedSubtitles };
          });
        }
      };

      updateSubtitleDiffs();
    },
    getModifiedSubtitleIndices: (() => {
      let lastResult: number[] = [];
      return () => {
        const { subtitles } = get();
        // 添加类型检查保护
        if (!Array.isArray(subtitles)) {
          console.error('subtitles is not an array:', subtitles);
          return lastResult;
        }
        
        const modifiedIndices: number[] = [];
        subtitles.forEach((subtitle, index) => {
          if (subtitle.isModified) {
            modifiedIndices.push(index);
          }
        });

        if (JSON.stringify(lastResult) !== JSON.stringify(modifiedIndices)) {
          lastResult = modifiedIndices;
        }
        
        return lastResult;
      };
    })(),
  };
});