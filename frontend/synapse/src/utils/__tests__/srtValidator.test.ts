import { isValidSrtFormat } from '../srtValidator';

describe('srtValidator', () => {
  describe('isValidSrtFormat', () => {
    it('应该验证有效的SRT格式', () => {
      const validSrt = `1
00:00:01,000 --> 00:00:03,000
这是第一条字幕

2
00:00:04,000 --> 00:00:06,000
这是第二条字幕`;

      expect(isValidSrtFormat(validSrt)).toBe(true);
    });

    it('应该拒绝空内容', () => {
      expect(isValidSrtFormat('')).toBe(false);
      expect(isValidSrtFormat('   ')).toBe(false);
    });

    it('应该拒绝不包含时间码的内容', () => {
      const invalidContent = `这不是SRT文件
没有时间码标记`;

      expect(isValidSrtFormat(invalidContent)).toBe(false);
    });

    it('应该拒绝时间码格式不正确的内容', () => {
      const invalidSrt = `1
00:00:01 --> 00:00:03
缺少毫秒部分`;

      expect(isValidSrtFormat(invalidSrt)).toBe(false);
    });

    it('应该验证使用点号分隔符的SRT格式', () => {
      const validSrt = `1
00:00:01.000 --> 00:00:03.000
使用点号分隔符`;

      expect(isValidSrtFormat(validSrt)).toBe(true);
    });

    it('应该验证包含多行文本的SRT格式', () => {
      const validSrt = `1
00:00:01,000 --> 00:00:03,000
第一行文本
第二行文本
第三行文本`;

      expect(isValidSrtFormat(validSrt)).toBe(true);
    });

    it('应该验证包含BOM标记的SRT格式', () => {
      const validSrt = `\uFEFF1
00:00:01,000 --> 00:00:03,000
包含BOM标记`;

      expect(isValidSrtFormat(validSrt)).toBe(true);
    });

    it('应该验证只包含一个有效块的SRT格式', () => {
      const validSrt = `1
00:00:01,000 --> 00:00:03,000
只有一个块`;

      expect(isValidSrtFormat(validSrt)).toBe(true);
    });
  });
});