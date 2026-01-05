
export interface SourceDocument {
    standardKey: string;
    fileName: string;
    content: string;
    timestamp: number;
    metadata?: any;
}

const DB_NAME = 'ISO_AUDIT_DB';
const STORE_NAME = 'knowledge_files';
const DB_VERSION = 1;

class KnowledgeStoreService {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private openDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // Create object store with standardKey as the primary key
                    db.createObjectStore(STORE_NAME, { keyPath: 'standardKey' });
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

    async saveDocument(standardKey: string, fileName: string, content: string): Promise<void> {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                
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
            console.error("KnowledgeStore: Save Error", error);
            throw error;
        }
    }

    async getDocument(standardKey: string): Promise<SourceDocument | null> {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(standardKey);

                request.onsuccess = () => {
                    resolve(request.result ? (request.result as SourceDocument) : null);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("KnowledgeStore: Get Error", error);
            return null;
        }
    }

    async deleteDocument(standardKey: string): Promise<void> {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(standardKey);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("KnowledgeStore: Delete Error", error);
            throw error;
        }
    }

    /**
     * Migration Helper: Checks if there is legacy data in LocalStorage 
     * and moves it to IndexedDB if found.
     */
    async migrateFromLocalStorage(standardKey: string): Promise<boolean> {
        const legacyContentKey = `iso_kb_content_${standardKey}`;
        const legacyNameKey = `iso_kb_name_${standardKey}`;
        
        const content = localStorage.getItem(legacyContentKey);
        const name = localStorage.getItem(legacyNameKey);

        if (content && name) {
            console.log(`KnowledgeStore: Migrating ${standardKey} from LocalStorage to IndexedDB...`);
            await this.saveDocument(standardKey, name, content);
            
            // Clean up LocalStorage
            localStorage.removeItem(legacyContentKey);
            localStorage.removeItem(legacyNameKey);
            return true;
        }
        return false;
    }
}

export const KnowledgeStore = new KnowledgeStoreService();
