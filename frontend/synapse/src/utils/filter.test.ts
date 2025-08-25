import { buildRegex, filterSubtitles } from './filter';
import { Subtitle } from '../types';

describe('filter utilities', () => {
  describe('buildRegex', () => {
    it('should return null for empty search query', () => {
      expect(buildRegex('')).toBeNull();
    });

    it('should build case-insensitive regex', () => {
      const regex = buildRegex('hello');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex?.flags).toContain('i');
      expect(regex?.flags).toContain('g');
    });

    it('should handle special characters', () => {
      const regex = buildRegex('hello.world?');
      expect(regex?.source).toBe('hello\\.world\\?');
    });

    it('should handle normal text correctly', () => {
      const regex = buildRegex('test');
      expect(regex?.test('TEST')).toBe(true);
      expect(regex?.test('testing')).toBe(true);
      expect(regex?.test('no match')).toBe(false);
    });
  });

  describe('filterSubtitles', () => {
    const mockSubtitles: Subtitle[] = [
      { id: 1, text: 'Hello world', startTimecode: '00:00:01', endTimecode: '00:00:02', originalText: 'Hello world' },
      { id: 2, text: 'Testing regex', startTimecode: '00:00:03', endTimecode: '00:00:04', originalText: 'Testing regex' },
      { id: 3, text: 'Special chars: .+*?^$[](){}|\\', startTimecode: '00:00:05', endTimecode: '00:00:06', originalText: 'Special chars: .+*?^$[](){}|\\' },
    ];

    it('should return all subtitles for empty search query', () => {
      const result = filterSubtitles(mockSubtitles, '');
      expect(result).toEqual(mockSubtitles);
    });

    it('should filter subtitles for whitespace-only search query', () => {
      const result = filterSubtitles(mockSubtitles, '   ');
      // Whitespace-only query should only match subtitles containing whitespace
      expect(result).toHaveLength(0);
    });

    it('should filter subtitles based on search query', () => {
      const result = filterSubtitles(mockSubtitles, 'hello');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Hello world');
    });

    it('should be case-insensitive', () => {
      const result = filterSubtitles(mockSubtitles, 'TESTING');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Testing regex');
    });

    it('should handle special characters in search', () => {
      const result = filterSubtitles(mockSubtitles, '.+*?');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Special chars: .+*?^$[](){}|\\');
    });

    it('should return empty array when no matches found', () => {
      const result = filterSubtitles(mockSubtitles, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('should handle empty subtitles array', () => {
      const result = filterSubtitles([], 'test');
      expect(result).toHaveLength(0);
    });

    it('should reset regex lastIndex for global matching', () => {
      // Create a scenario where lastIndex would matter
      const subtitlesWithMultipleMatches: Subtitle[] = [
        { id: 1, text: 'test test test', startTimecode: '00:00:01', endTimecode: '00:00:02', originalText: 'test test test' },
        { id: 2, text: 'another test', startTimecode: '00:00:03', endTimecode: '00:00:04', originalText: 'another test' },
      ];
      
      const result = filterSubtitles(subtitlesWithMultipleMatches, 'test');
      expect(result).toHaveLength(2);
    });
  });
});