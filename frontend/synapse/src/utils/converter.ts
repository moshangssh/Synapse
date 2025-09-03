import { SrtSubtitleEntry, Subtitle } from '../types';

/**
 * 将 SRT 字幕条目转换为标准字幕格式
 * @param srtEntries SRT 字幕条目数组
 * @returns 转换后的字幕数组
 */
export const convertSrtToSubtitles = (srtEntries: SrtSubtitleEntry[]): Subtitle[] => {
  return srtEntries.map((entry) => ({
    id: entry.id,
    startTimecode: entry.startTimecode,
    endTimecode: entry.endTimecode,
    text: entry.text,
    originalText: entry.text,
    diffs: [{ type: 'normal' as const, value: entry.text }], // 相同文本的简单差异
  }));
};