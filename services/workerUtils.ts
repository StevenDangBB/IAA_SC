
// Helper to execute a function in a Web Worker
// This avoids needing separate worker files in the build process
export const runInWorker = <T>(fn: Function, args: any[]): Promise<T> => {
    return new Promise((resolve, reject) => {
        const workerCode = `
            self.onmessage = async (e) => {
                try {
                    const func = ${fn.toString()};
                    const result = await func(...e.data);
                    self.postMessage({ status: 'success', result });
                } catch (error) {
                    self.postMessage({ status: 'error', error: error.message });
                }
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));

        worker.onmessage = (e) => {
            if (e.data.status === 'success') {
                resolve(e.data.result);
            } else {
                reject(new Error(e.data.error));
            }
            worker.terminate();
        };

        worker.onerror = (e) => {
            reject(e);
            worker.terminate();
        };

        worker.postMessage(args);
    });
};

// Pure function for the worker: Chunking Text
export const workerChunkText = (text: string, size: number = 1000): string[] => {
    if (!text) return [];
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.substring(i, i + size));
    }
    return chunks;
};
