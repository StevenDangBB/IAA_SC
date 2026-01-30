
import { useEffect, useState } from "react";
import { MatrixRow } from "./types";

declare global {
    interface Window {
        pdfjsLib: any;
    }
}

declare var mammoth: any;

export const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

export const copyToClipboard = (text: string) => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else { fallbackCopy(text); }
};

const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea"); textArea.value = text;
    textArea.style.position = "fixed"; textArea.style.left = "-9999px";
    document.body.appendChild(textArea); textArea.focus(); textArea.select();
    try { document.execCommand('copy'); } catch (err) { console.error(err); }
    document.body.removeChild(textArea);
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]); 
        reader.onerror = error => reject(error);
    });
};

export const extractTextFromPdf = async (file: File): Promise<string> => {
    if (!window.pdfjsLib) {
        throw new Error("PDF.js library not loaded");
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n\n";
    }

    return fullText;
};

// MOVED FROM APP.TSX
export const processSourceFile = async (file: File): Promise<string> => {
    let text = "";
    try {
        if (file.name.toLowerCase().endsWith('.pdf')) {
            text = await extractTextFromPdf(file);
        } else if (file.name.toLowerCase().endsWith('.docx')) {
            if (typeof mammoth === 'undefined') throw new Error("Mammoth library missing");
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            text = result.value;
        } else if (file.name.toLowerCase().endsWith('.doc')) {
            throw new Error("Legacy Word (.doc) files are not supported due to browser limitations. Please save your file as .docx and try again.");
        } else {
            text = await file.text();
        }
        if (!text || text.length < 50) throw new Error("File content is too short or empty.");
        return text;
    } catch (err: any) {
        console.error("File processing error:", err);
        throw new Error(`Failed to parse ${file.name}: ${err.message}`);
    }
};

export const cleanAndParseJSON = (text: string) => {
    if (!text) return null;
    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```(json)?/, "").replace(/```$/, "");
    }
    const firstBracket = cleanText.indexOf('[');
    const firstCurly = cleanText.indexOf('{');
    const lastBracket = cleanText.lastIndexOf(']');
    const lastCurly = cleanText.lastIndexOf('}');
    if (firstBracket !== -1 && lastBracket !== -1 && (firstCurly === -1 || firstBracket < firstCurly)) {
            cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    } else if (firstCurly !== -1 && lastCurly !== -1) {
            cleanText = cleanText.substring(firstCurly, lastCurly + 1);
    }
    try {
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("JSON Parse Error on text:", cleanText);
        return null;
    }
};

export const cleanFileName = (str: string) => {
    if (!str) return 'N_A';
    return str.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_').substring(0, 30);
};

// --- NEW: Helper to Serialize Matrix Data for AI ---
export const serializeMatrixData = (matrixData: Record<string, MatrixRow[]>, selectedClauses: string[]): string => {
    let output = "";
    let hasContent = false;

    selectedClauses.forEach(clauseId => {
        const rows = matrixData[clauseId];
        if (rows && rows.some(r => r.status === 'supplied')) {
            hasContent = true;
            output += `\n### EVIDENCE MATRIX FOR CLAUSE ${clauseId}\n`;
            output += `| Requirement | Verified Evidence |\n`;
            output += `| :--- | :--- |\n`;
            rows.forEach(row => {
                if (row.evidenceInput.trim()) {
                    output += `| ${row.requirement.replace(/\|/g, '-')} | ${row.evidenceInput.replace(/\|/g, '-').replace(/\n/g, ' ')} |\n`;
                }
            });
            output += `\n`;
        }
    });

    return hasContent ? output : "";
};

// --- NEW: Idempotent Hashing for Caching ---
// Simple FNV-1a hash implementation for string fingerprinting
export const generateContentHash = (str: string): string => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16);
};

// --- NEW: Promise Pool for Concurrency Control ---
export async function runWithConcurrency<T>(
    items: any[],
    fn: (item: any) => Promise<T>,
    concurrency: number = 3
): Promise<T[]> {
    const results: T[] = [];
    const queue = [...items];
    
    const worker = async () => {
        while (queue.length > 0) {
            const item = queue.shift();
            if (item) {
                const res = await fn(item);
                results.push(res);
            }
        }
    };

    const workers = Array(Math.min(items.length, concurrency)).fill(null).map(() => worker());
    await Promise.all(workers);
    return results;
}

// --- NEW: Strip Metadata Tags from Text ---
// Use this to remove internal tags like [[SOURCE_FILE: ...]] before exporting or reporting
export const stripMetadataTags = (text: string) => {
    if (!text) return "";
    // Removes [[SOURCE_FILE: ...]] and the newline after it to keep text flow clean
    return text.replace(/\[\[SOURCE_FILE:.*?\]\][\r\n]*/g, "");
}

// --- NEW: Strip Markdown Formatting ---
export const stripMarkdown = (text: string) => {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Bold **text** -> text
        .replace(/\*(.*?)\*/g, '$1')     // Italic *text* -> text
        .replace(/__(.*?)__/g, '$1')     // Bold __text__ -> text
        .replace(/_(.*?)_/g, '$1')       // Italic _text_ -> text
        .replace(/^\s*#+\s+/gm, '')      // Headers # Text -> Text
        .replace(/`{3}[\s\S]*?`{3}/g, '') // Code blocks
        .replace(/`/g, '')               // Inline code
        .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Links
}

// --- NEW: Check for Vietnamese Characters ---
export const hasVietnameseChars = (text: string): boolean => {
    return /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text);
};
