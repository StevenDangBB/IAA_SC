
import { useEffect, useState } from "react";

declare global {
    interface Window {
        pdfjsLib: any;
    }
}

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
