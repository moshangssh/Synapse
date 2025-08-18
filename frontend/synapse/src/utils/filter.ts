import { Subtitle } from '../types';

/**
 * 根据给定的选项构建正则表达式
 * @param searchQuery 搜索查询字符串
 * @param useRegex 是否使用正则表达式
 * @param matchCase 是否区分大小写
 * @param matchWholeWord 是否匹配整个单词
 * @returns 构建好的正则表达式对象，如果查询为空则返回 null
 */
export const buildRegex = (
  searchQuery: string,
  useRegex: boolean,
  matchCase: boolean,
  matchWholeWord: boolean
): RegExp | null => {
  if (!searchQuery) return null;

  try {
    const pattern = useRegex ? searchQuery : searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const flags = matchCase ? 'g' : 'gi';
    const finalPattern = matchWholeWord ? `\\b${pattern}\\b` : pattern;
    return new RegExp(finalPattern, flags);
  } catch (error) {
    // Don't log as error since this is gracefully handled
    console.log("Invalid Regex (gracefully handled):", (error as Error).message);
    return null;
  }
};

/**
 * 根据搜索查询和其他选项过滤字幕列表
 * @param subtitles 要过滤的字幕数组
 * @param options 过滤选项
 * @returns 过滤后的字幕数组
 */
export function filterSubtitles(
  subtitles: Subtitle[],
  options: {
    searchQuery: string;
    useRegex: boolean;
    matchCase: boolean;
    matchWholeWord: boolean;
  }
) {
  const { searchQuery, useRegex, matchCase, matchWholeWord } = options;
  const regex = buildRegex(searchQuery, useRegex, matchCase, matchWholeWord);
  
  if (!regex) {
    return subtitles;
  }

  return subtitles.filter(sub => {
    regex.lastIndex = 0; // Reset for stateful global regex
    return regex.test(sub.text);
  });
}