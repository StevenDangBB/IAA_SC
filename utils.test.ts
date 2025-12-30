import { describe, it, expect } from 'vitest';
import { cleanFileName, cleanAndParseJSON } from './utils';

describe('utils', () => {
    describe('cleanFileName', () => {
        it('should remove special characters and replace spaces with underscores', () => {
            expect(cleanFileName('Hello World! @#$')).toBe('Hello_World');
        });

        it('should trim and limit length to 30 characters', () => {
             const longName = 'This is a very long file name that should be truncated because it exceeds the limit';
             const result = cleanFileName(longName);
             expect(result.length).toBeLessThan(31);
             expect(result).toBe('This_is_a_very_long_file_name');
        });

        it('should handle empty strings or null', () => {
            expect(cleanFileName('')).toBe('N_A');
            // @ts-ignore
            expect(cleanFileName(null)).toBe('N_A');
        });
    });

    describe('cleanAndParseJSON', () => {
        it('should parse valid simple JSON', () => {
            const json = '{"key": "value"}';
            expect(cleanAndParseJSON(json)).toEqual({ key: 'value' });
        });

        it('should clean markdown code blocks before parsing', () => {
            const json = '```json\n{"key": "value"}\n```';
            expect(cleanAndParseJSON(json)).toEqual({ key: 'value' });
        });

        it('should extract JSON object from mixed text', () => {
            const text = 'Here is the data you requested: {"key": "value"} hope this helps.';
            expect(cleanAndParseJSON(text)).toEqual({ key: 'value' });
        });

        it('should extract JSON array from mixed text', () => {
            const text = 'Result: [{"id": 1}, {"id": 2}] end of list.';
            expect(cleanAndParseJSON(text)).toEqual([{ id: 1 }, { id: 2 }]);
        });

        it('should return null for invalid JSON', () => {
            expect(cleanAndParseJSON('This is not json')).toBeNull();
        });
    });
});