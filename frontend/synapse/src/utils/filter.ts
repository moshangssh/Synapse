import { Subtitle } from '../types';

/**
 * 根据搜索查询构建不区分大小写的正则表达式
 * @param searchQuery 搜索查询字符串
 * @returns 构建好的正则表达式对象，如果查询为空则返回 null
 */
export const buildRegex = (searchQuery: string): RegExp | null => {
  if (!searchQuery) return null;

  try {
    // 转义特殊字符，确保作为普通文本处理
    const pattern = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // 始终使用不区分大小写的全局匹配
    return new RegExp(pattern, 'gi');
  } catch (error) {
    // Don't log as error since this is gracefully handled
    console.log("Invalid Regex (gracefully handled):", (error as Error).message);
    return null;
  }
};

/**
 * 根据搜索查询过滤字幕列表
 * @param subtitles 要过滤的字幕数组
 * @param searchQuery 搜索查询字符串
 * @returns 过滤后的字幕数组
 */
export function filterSubtitles(
  subtitles: Subtitle[],
  searchQuery: string
) {
  const regex = buildRegex(searchQuery);
  
  if (!regex) {
    return subtitles;
  }

  return subtitles.filter(sub => {
    regex.lastIndex = 0; // Reset for stateful global regex
    return regex.test(sub.text);
  });
}