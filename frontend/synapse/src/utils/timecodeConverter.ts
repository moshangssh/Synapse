/**
 * 将基于帧的时间码 (HH:MM:SS:FF) 转换为基于毫秒的时间码 (HH:MM:SS.mmm)。
 * @param timecode - HH:MM:SS:FF 格式的时间码字符串。
 * @param frameRate - 当前时间线的帧率。
 * @returns HH:MM:SS.mmm 格式的时间码字符串。
 */
export const convertFrameTcToMsTc = (timecode: string, frameRate: number): string => {
  if (!timecode || typeof timecode !== 'string' || !timecode.includes(':')) {
    // 对于无效或格式不符的输入，直接返回原值
    return timecode;
  }

  const parts = timecode.split(':');
  if (parts.length !== 4) {
    // 如果不是标准的 HH:MM:SS:FF 格式 (例如已经是 HH:MM:SS.mmm)，直接返回
    return timecode;
  }

  try {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    const frames = parseInt(parts[3], 10);

    // 1. 计算总帧数
    const totalFrames = (hours * 3600 + minutes * 60 + seconds) * frameRate + frames;

    // 2. 计算总秒数 (浮点数)
    const totalSeconds = totalFrames / frameRate;

    // 3. 格式化为 HH:MM:SS.mmm
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);

    const pad = (num: number, size: number = 2) => num.toString().padStart(size, '0');

    return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
  } catch (error) {
    console.error(`Error converting timecode "${timecode}":`, error);
    // 转换失败时返回原始值，避免界面崩溃
    return timecode;
  }
};