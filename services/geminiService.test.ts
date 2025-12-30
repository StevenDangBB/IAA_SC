import { describe, it, expect, vi } from 'vitest';
import { validateApiKey } from './geminiService';

// Mock the GoogleGenAI library
vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: class {
            constructor(options: { apiKey: string }) {
                if (options.apiKey === 'INVALID_KEY') {
                    throw new Error('403 API key not valid');
                }
                if (options.apiKey === 'QUOTA_KEY') {
                    throw new Error('429 Resource exhausted');
                }
            }
            models = {
                generateContent: async () => {
                    return { text: 'Hi' };
                }
            }
        },
        Type: {
            OBJECT: 'OBJECT',
            STRING: 'STRING',
            ARRAY: 'ARRAY'
        }
    };
});

describe('geminiService', () => {
    describe('validateApiKey', () => {
        it('should return invalid for empty key', async () => {
            const result = await validateApiKey('');
            expect(result.isValid).toBe(false);
            expect(result.errorType).toBe('invalid');
        });

        it('should return valid for correct key', async () => {
            const result = await validateApiKey('VALID_KEY');
            expect(result.isValid).toBe(true);
            expect(result.latency).toBeGreaterThanOrEqual(0);
        });

        it('should detect invalid key error', async () => {
            // The mock throws error for this key
            const result = await validateApiKey('INVALID_KEY');
            expect(result.isValid).toBe(false);
            expect(result.errorType).toBe('invalid');
        });

        it('should detect quota exceeded error', async () => {
             const result = await validateApiKey('QUOTA_KEY');
             expect(result.isValid).toBe(false);
             expect(result.errorType).toBe('quota_exceeded');
        });
    });
});