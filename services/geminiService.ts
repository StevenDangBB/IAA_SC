import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL, MODEL_HIERARCHY } from "../constants";
import { cleanAndParseJSON } from "../utils";

const getAiClient = (overrideKey?: string) => {
    // Check order: 
    // 1. Explicit Override
    // 2. Vite Env (Standard) - Safe Access
    // 3. Process Env (Polyfill/Legacy)
    // 4. Local Storage
    
    let envKey = "";
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            envKey = import.meta.env.VITE_API_KEY;
        }
    } catch (e) {}

    if (!envKey && typeof process !== 'undefined' && process.env) {
        envKey = process.env.API_KEY || "";
    }

    const rawKey = overrideKey || envKey || localStorage.getItem("iso_api_key") || "";
    // Sanitize key immediately
    const apiKey = rawKey.trim();
    
    if (!apiKey) {
        console.warn("Gemini API Key is missing.");
        throw new Error("API Key is missing. Please check your .env file or Settings.");
    }
    return new GoogleGenAI({ apiKey });
};

export const validateApiKey = async (rawKey: string, preferredModel?: string): Promise<{ isValid: boolean, latency: number, errorType?: 'invalid' | 'quota_exceeded' | 'unknown', activeModel?: string }> => {
    // 1. Aggressive Sanitization
    const key = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : "";

    if (!key) {
        return { isValid: false, latency: 0, errorType: 'invalid' };
    }

    // 2. COMPLIANT PROBE LIST
    // We utilize the allowed aliases which map to stable models.
    // 'gemini-flash-latest' is the most reliable entry point for standard keys.
    const probeModels = [
        "gemini-flash-latest",       // Standard Flash Alias
        "gemini-flash-lite-latest",  // Lite Alias (fallback)
        "gemini-3-flash-preview",    // Next Gen
        "gemini-3-pro-preview"       // Pro Tier
    ];

    if (preferredModel && !probeModels.includes(preferredModel)) {
        probeModels.unshift(preferredModel);
    }

    const ai = new GoogleGenAI({ apiKey: key });
    
    let lastErrorType: 'invalid' | 'quota_exceeded' | 'unknown' = 'unknown';

    for (const modelId of probeModels) {
        const start = performance.now();
        try {
            // 3. Strict SDK Compliant Probe
            // Using an object with 'parts' to ensure maximum compatibility with the new SDK parser
            await ai.models.generateContent({
                model: modelId,
                contents: { parts: [{ text: "Hello" }] }, 
            });
            const end = performance.now();
            
            console.log(`[ISO-AUDIT] Key validation passed on ${modelId}`);
            return { isValid: true, latency: Math.round(end - start), activeModel: modelId };
            
        } catch (error: any) {
            const msg = (error.message || "").toLowerCase();
            const status = error.status || 0;
            
            console.warn(`[ISO-AUDIT] Probe failed for ${modelId}:`, msg);

            // Special handling for the known key if it fails - log it specifically
            if (key.startsWith("AIzaSy")) {
                console.error(`[ISO-AUDIT] Known Google Key failed on ${modelId}. Reason: ${msg}`);
            }

            if (msg.includes("api key not valid") || (status === 400 && msg.includes("key"))) {
                // Definitive Invalid Key
                return { isValid: false, latency: 0, errorType: 'invalid' };
            }
            
            if (msg.includes("429") || msg.includes("quota") || msg.includes("resource exhausted")) {
                lastErrorType = 'quota_exceeded';
            } else if (status === 404 || msg.includes("not found") || msg.includes("404")) {
                // 404 means THIS model alias is not found/enabled for this key/project. 
                // We do NOT fail the key yet, we just try the next model.
                lastErrorType = 'invalid'; 
            } else if (msg.includes("permission denied") || msg.includes("403")) {
                // 403 can be referrer restrictions (e.g. running on localhost vs github)
                lastErrorType = 'invalid'; 
            } else {
                lastErrorType = 'unknown';
            }
            // Continue to next model in loop
        }
    }

    return { isValid: false, latency: 0, errorType: lastErrorType };
};

export const fetchFullClauseText = async (clause: { code: string, title: string }, standardName: string, apiKey?: string, model?: string): Promise<{ en: string; vi: string }> => {
    const ai = getAiClient(apiKey);
    const prompt = `Provide the EXACT verbatim text for ISO clause: ${standardName} - [${clause.code}] ${clause.title}. 
    FORMATTING RULES:
    1. Use clear line breaks between paragraphs.
    2. Use bullet points or numbered lists (a, b, c...) for sub-items.
    3. Ensure each logical requirement starts on a new line.
    4. Do NOT return as a single continuous block of text.
    Output JSON ONLY: {"en": "...", "vi": "..."}.`;
    
    const response = await ai.models.generateContent({
        model: model || DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    en: { type: Type.STRING },
                    vi: { type: Type.STRING }
                },
                required: ["en", "vi"]
            }
        }
    });
    const parsed = cleanAndParseJSON(response.text || "{}");
    return { en: parsed?.en || "N/A", vi: parsed?.vi || "N/A" };
};

export const generateOcrContent = async (textPrompt: string, base64Data: string, mimeType: string, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
        model: model || DEFAULT_VISION_MODEL,
        contents: {
            parts: [{ text: textPrompt }, { inlineData: { mimeType, data: base64Data } }]
        }
    });
    return response.text || "";
};

export const generateAnalysis = async (prompt: string, systemInstruction: string, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
        model: model || DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        clauseId: { type: Type.STRING },
                        status: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        suggestion: { type: Type.STRING },
                        evidence: { type: Type.STRING },
                        conclusion_report: { type: Type.STRING }
                    }
                }
            }
        }
    });
    return response.text || "";
};

export const generateTextReport = async (prompt: string, systemInstruction: string, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
        model: model || DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: { systemInstruction }
    });
    return response.text || "";
};

export const generateMissingDescriptions = async (clauses: { code: string, title: string }[], apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    const prompt = `Provide concise descriptions (15 words) for these ISO clauses: ${JSON.stringify(clauses)}`;
    const response = await ai.models.generateContent({
        model: model || DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: { code: { type: Type.STRING }, description: { type: Type.STRING } },
                    required: ["code", "description"]
                }
            }
        }
    });
    return response.text || "[]";
};
