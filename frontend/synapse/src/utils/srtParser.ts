import { ImportedSubtitleFile, SrtSubtitleEntry } from '../types';

/**
 * 解析SRT文件内容
 * @param content SRT文件的文本内容
 * @param fileName 文件名（可选）
 * @returns 解析后的字幕文件对象
 */
export const parseSRTFile = (content: string, fileName: string = 'imported_file.srt'): ImportedSubtitleFile => {
  // 移除BOM标记（如果存在）
  const cleanContent = content.replace(/^\uFEFF/, '');
  
  // 按双换行符分割字幕块
  const blocks = cleanContent.split(/\n\s*\n/).filter(block => block.trim() !== '');
  
  const subtitles: SrtSubtitleEntry[] = [];
  
  for (const block of blocks) {
    // 解析每个字幕块
    const lines = block.trim().split('\n');
    
    if (lines.length < 2) {
      // 不完整的字幕块，跳过
      continue;
    }
    
    // 查找时间码行的索引
    let timeCodeLineIndex = -1;
    let textStartLineIndex = -1;
    
    // 遍历行查找时间码
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})$/)) {
        timeCodeLineIndex = i;
        textStartLineIndex = i + 1;
        break;
      }
    }
    
    // 如果没有找到时间码，跳过这个块
    if (timeCodeLineIndex === -1) {
      continue;
    }
    
    // 解析时间码
    const timeLine = lines[timeCodeLineIndex].trim();
    const timeMatch = timeLine.match(/^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})$/);
    
    if (!timeMatch) {
      // 时间码格式不正确，跳过这个块
      continue;
    }
    
    // 提取时间码（将逗号替换为点号以符合SRT标准）
    const startTimecode = timeMatch[1].replace(',', '.');
    const endTimecode = timeMatch[2].replace(',', '.');
    
    // 剩余的行是字幕文本
    const text = lines.slice(textStartLineIndex).join('\n');
    
    // 生成ID
    const id = subtitles.length + 1;
    
    subtitles.push({
      id,
      startTimecode,
      endTimecode,
      text
    });
  }
  
  // 返回解析后的字幕文件对象
  return {
    fileName,
    subtitles,
    metadata: {
      importedAt: new Date().toISOString(),
      format: 'srt'
    }
  };
};

/**
 * 验证SRT文件内容是否有效
 * @param content SRT文件的文本内容
 * @returns 验证结果
 */
export const validateSRTContent = (content: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // 检查是否为空
  if (!content || content.trim() === '') {
    errors.push('文件内容为空');
    return { isValid: false, errors };
  }
  
  // 移除BOM标记（如果存在）
  const cleanContent = content.replace(/^\uFEFF/, '');
  
  // 检查基本的SRT格式特征
  if (!cleanContent.includes('-->')) {
    errors.push('文件不包含SRT时间码标记 "-->"');
    return { isValid: false, errors };
  }
  
  // 按双换行符分割字幕块
  const blocks = cleanContent.split(/\n\s*\n/).filter(block => block.trim() !== '');
  
  if (blocks.length === 0) {
    errors.push('文件不包含有效的字幕块');
    return { isValid: false, errors };
  }
  
  // 检查每个块的基本结构
  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].trim().split('\n');
    
    if (lines.length < 2) {
      errors.push(`字幕块 ${i + 1} 结构不完整，至少需要2行`);
      continue;
    }
    
    // 查找时间码行
    let timeLine = '';
    let hasTimecodeFormat = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // 检查是否包含时间码标记
      if (trimmedLine.includes('-->')) {
        timeLine = trimmedLine;
        // 检查是否符合标准SRT时间码格式（包含毫秒）
        if (trimmedLine.match(/^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})$/)) {
          hasTimecodeFormat = true;
        }
        break;
      }
    }
    
    if (!timeLine) {
      errors.push(`字幕块 ${i + 1} 未找到时间码`);
      continue;
    }
    
    if (!hasTimecodeFormat) {
      errors.push(`字幕块 ${i + 1} 时间码格式不正确: "${timeLine}"`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
};