/**
 * 检查内容是否为有效的SRT格式
 * @param content 文件内容
 * @returns 是否为有效的SRT格式
 */
export const isValidSrtFormat = (content: string): boolean => {
  // 检查是否为空
  if (!content || content.trim() === '') {
    return false;
  }

  // 移除BOM标记（如果存在）
  const cleanContent = content.replace(/\uFEFF/g, '');

  // 检查基本的SRT格式特征
  if (!cleanContent.includes('-->')) {
    return false;
  }

  // 按双换行符分割字幕块
  const blocks = cleanContent.split(/\n\s*\n/).filter(block => block.trim() !== '');

  if (blocks.length === 0) {
    return false;
  }

  // 检查每个块是否包含有效的时间码
  let validBlocks = 0;
  for (const block of blocks) {
    const lines = block.split('\n').filter(line => line.trim() !== '');
    
    // 查找时间码行
    for (const line of lines) {
      // 检查是否符合标准SRT时间码格式（包含毫秒）
      if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}$/.test(line.trim())) {
        validBlocks++;
        break;
      }
    }
  }

  // 如果至少有一个有效的字幕块，则认为是SRT格式
  return validBlocks > 0;
};