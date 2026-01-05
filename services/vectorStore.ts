
import { VectorRecord } from '../types';
import { GoogleGenAI } from "@google/genai";

const DB_NAME = 'ISO_VECTOR_DB';
const STORE_NAME = 'vectors';
const DB_VERSION = 1;

// Cosine Similarity Helper
const cosineSimilarity = (vecA: number[], vecB: number[]) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

class VectorStoreService {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private openDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;
        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('source', 'metadata.source', { unique: false });
                }
            };
            request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
            request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
        });
        return this.dbPromise;
    }

    // Generate Embedding using Gemini
    async embedText(text: string, apiKey: string): Promise<number[] | null> {
        if (!text || !text.trim()) return null;
        try {
            const ai = new GoogleGenAI({ apiKey });
            // Use embedding-001 model for vectors
            const response = await ai.models.embedContent({
                model: "text-embedding-004",
                contents: { parts: [{ text }] }
            });
            return response.embedding?.values || null;
        } catch (e) {
            console.error("Embedding Error", e);
            return null;
        }
    }

    async addDocuments(sourceId: string, text: string, apiKey: string) {
        // 1. Chunking
        const chunks = text.match(/[\s\S]{1,1000}/g) || [];
        const db = await this.openDB();
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // Clear old vectors for this source
        // Note: IDB doesn't support easy delete-where, simplified for now
        // Ideally we iterate cursor and delete matching source.

        let count = 0;
        for (const chunk of chunks) {
            const embedding = await this.embedText(chunk, apiKey);
            if (embedding) {
                const record: VectorRecord = {
                    id: `${sourceId}_${count++}_${Date.now()}`,
                    text: chunk,
                    embedding: embedding,
                    metadata: { source: sourceId, type: 'standard_content' }
                };
                store.put(record);
            }
            // Small delay to avoid rate limit
            await new Promise(r => setTimeout(r, 100)); 
        }
    }

    async search(query: string, apiKey: string, limit: number = 3): Promise<string> {
        const queryVector = await this.embedText(query, apiKey);
        if (!queryVector) return "";

        const db = await this.openDB();
        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.openCursor();
            
            const results: { text: string, score: number }[] = [];

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const record = cursor.value as VectorRecord;
                    const score = cosineSimilarity(queryVector, record.embedding);
                    results.push({ text: record.text, score });
                    cursor.continue();
                } else {
                    // Finished
                    results.sort((a, b) => b.score - a.score);
                    const topResults = results.slice(0, limit).map(r => r.text).join("\n...\n");
                    resolve(topResults);
                }
            };
        });
    }
    
    async clear() {
         const db = await this.openDB();
         const transaction = db.transaction([STORE_NAME], 'readwrite');
         transaction.objectStore(STORE_NAME).clear();
    }
}

export const VectorStore = new VectorStoreService();
