
export interface SourceDocument {
    standardKey: string;
    fileName: string;
    content: string;
    timestamp: number;
    metadata?: any;
}

export interface ClauseRecord {
    id: string; // Composite key: standardKey_clauseCode (e.g., "ISO9001_4.1")
    standardKey: string;
    code: string;
    title: string;
    content: string;
}

const DB_NAME = 'ISO_AUDIT_DB';
const STORE_DOCS = 'knowledge_files';
const STORE_CLAUSES = 'structured_clauses';
const DB_VERSION = 2; // Bump version for migration

class KnowledgeStoreService {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private openDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                
                // Store 1: Raw Documents
                if (!db.objectStoreNames.contains(STORE_DOCS)) {
                    db.createObjectStore(STORE_DOCS, { keyPath: 'standardKey' });
                }

                // Store 2: Structured Clauses (New)
                if (!db.objectStoreNames.contains(STORE_CLAUSES)) {
                    const clauseStore = db.createObjectStore(STORE_CLAUSES, { keyPath: 'id' });
                    clauseStore.createIndex('standardKey', 'standardKey', { unique: false });
                    clauseStore.createIndex('code', 'code', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                resolve((event.target as IDBOpenDBRequest).result);
            };

            request.onerror = (event) => {
                console.error("KnowledgeStore: DB Open Error", event);
                reject((event.target as IDBOpenDBRequest).error);
            };
        });

        return this.dbPromise;
    }

    // --- RAW DOCUMENT OPERATIONS ---

    async saveDocument(standardKey: string, fileName: string, content: string): Promise<void> {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_DOCS], 'readwrite');
                const store = transaction.objectStore(STORE_DOCS);
                
                const doc: SourceDocument = {
                    standardKey,
                    fileName,
                    content,
                    timestamp: Date.now()
                };

                const request = store.put(doc);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("KnowledgeStore: Save Doc Error", error);
            throw error;
        }
    }

    async getDocument(standardKey: string): Promise<SourceDocument | null> {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_DOCS], 'readonly');
                const store = transaction.objectStore(STORE_DOCS);
                const request = store.get(standardKey);

                request.onsuccess = () => resolve(request.result ? (request.result as SourceDocument) : null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            return null;
        }
    }

    // --- STRUCTURED CLAUSE OPERATIONS ---

    async bulkSaveClauses(standardKey: string, clauses: { code: string, title: string, content: string }[]): Promise<void> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_CLAUSES], 'readwrite');
            const store = transaction.objectStore(STORE_CLAUSES);

            clauses.forEach(c => {
                const record: ClauseRecord = {
                    id: `${standardKey}_${c.code}`,
                    standardKey,
                    code: c.code,
                    title: c.title,
                    content: c.content
                };
                store.put(record);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getClauseContent(standardKey: string, code: string): Promise<string | null> {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const transaction = db.transaction([STORE_CLAUSES], 'readonly');
                const store = transaction.objectStore(STORE_CLAUSES);
                const request = store.get(`${standardKey}_${code}`);

                request.onsuccess = () => {
                    const res = request.result as ClauseRecord;
                    resolve(res ? res.content : null);
                };
                request.onerror = () => resolve(null);
            });
        } catch (e) { return null; }
    }

    async deleteStandardData(standardKey: string): Promise<void> {
        const db = await this.openDB();
        
        // 1. Delete Raw Doc
        const t1 = db.transaction([STORE_DOCS], 'readwrite');
        t1.objectStore(STORE_DOCS).delete(standardKey);

        // 2. Delete Clauses (Need to use cursor or index range in a real robust impl, 
        // but for now we rely on the composite key logic or delete individually if we had the list. 
        // For simplicity in this implementation, we will iterate index).
        return new Promise((resolve) => {
            const t2 = db.transaction([STORE_CLAUSES], 'readwrite');
            const store = t2.objectStore(STORE_CLAUSES);
            const index = store.index('standardKey');
            const request = index.openKeyCursor(IDBKeyRange.only(standardKey));

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };
            
            t2.oncomplete = () => resolve();
        });
    }
}

export const KnowledgeStore = new KnowledgeStoreService();
