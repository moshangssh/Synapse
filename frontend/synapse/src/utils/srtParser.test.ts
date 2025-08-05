import { parseSRTFile, validateSRTContent } from './srtParser';
import { ImportedSubtitleFile } from '../types';

describe('srtParser', () => {
  describe('parseSRTFile', () => {
    it('should parse a valid SRT file correctly', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello, world!

2
00:00:05,000 --> 00:00:08,000
This is a test subtitle.

3
00:00:09,000 --> 00:00:12,000
Multiple line subtitle
with multiple lines
`;

      const result = parseSRTFile(srtContent, 'test.srt');
      
      expect(result).toEqual({
        fileName: 'test.srt',
        subtitles: [
          {
            id: 1,
            startTimecode: '00:00:01.000',
            endTimecode: '00:00:04.000',
            text: 'Hello, world!'
          },
          {
            id: 2,
            startTimecode: '00:00:05.000',
            endTimecode: '00:00:08.000',
            text: 'This is a test subtitle.'
          },
          {
            id: 3,
            startTimecode: '00:00:09.000',
            endTimecode: '00:00:12.000',
            text: 'Multiple line subtitle\nwith multiple lines'
          }
        ],
        metadata: {
          importedAt: expect.any(String),
          format: 'srt'
        }
      });
    });

    it('should handle SRT files with BOM', () => {
      const srtContent = `\uFEFF1
00:00:01,000 --> 00:00:04,000
Subtitle with BOM
`;

      const result = parseSRTFile(srtContent, 'bom_test.srt');
      
      expect(result.subtitles).toHaveLength(1);
      expect(result.subtitles[0].text).toBe('Subtitle with BOM');
    });

    it('should handle empty or invalid SRT content gracefully', () => {
      const emptyResult = parseSRTFile('', 'empty.srt');
      expect(emptyResult.subtitles).toHaveLength(0);
      
      const invalidResult = parseSRTFile('invalid content', 'invalid.srt');
      expect(invalidResult.subtitles).toHaveLength(0);
    });

    it('should handle SRT files with missing sequence numbers', () => {
      const srtContent = `00:00:01,000 --> 00:00:04,000
Subtitle without sequence number

00:00:05,000 --> 00:00:08,000
Another subtitle
`;

      const result = parseSRTFile(srtContent, 'no_seq.srt');
      
      expect(result.subtitles).toHaveLength(2);
      expect(result.subtitles[0].id).toBe(1);
      expect(result.subtitles[1].id).toBe(2);
    });
  });

  describe('validateSRTContent', () => {
    it('should validate correct SRT content', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Valid subtitle
`;

      const result = validateSRTContent(srtContent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid SRT content', () => {
      const result = validateSRTContent('invalid content');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('文件不包含SRT时间码标记 "-->"');
    });

    it('should detect empty content', () => {
      const result = validateSRTContent('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('文件内容为空');
    });

    it('should detect incorrect timecode format', () => {
      const srtContent = `1
00:00:01 --> 00:00:04
Invalid timecode format
`;

      const result = validateSRTContent(srtContent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('字幕块 1 时间码格式不正确: "00:00:01 --> 00:00:04"');
    });
  });
});