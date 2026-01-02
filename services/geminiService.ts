
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

    const apiKey = overrideKey || envKey || localStorage.getItem("iso_api_key") || "";
    
    if (!apiKey) {
        console.warn("Gemini API Key is missing.");
        throw new Error("API Key is missing. Please check your .env file or Settings.");
    }
    return new GoogleGenAI({ apiKey });
};

export const validateApiKey = async (key: string, preferredModel?: string): Promise<{ isValid: boolean, latency: number, errorType?: 'invalid' | 'quota_exceeded' | 'unknown', activeModel?: string }> => {
    if (!key || key.trim() === "") {
        return { isValid: false, latency: 0, errorType: 'invalid' };
    }

    // List of models to try for validation. 
    // If the preferred one fails, we fallback to others to check if the KEY is valid generally.
    const modelsToCheck = preferredModel 
        ? [preferredModel, ...MODEL_HIERARCHY.filter(m => m !== preferredModel)]
        : MODEL_HIERARCHY;
    
    // We only try the top 3 to save time, ensuring at least one stable model is checked
    const probeModels = modelsToCheck.slice(0, 3);

    const ai = new GoogleGenAI({ apiKey: key });
    
    for (const modelId of probeModels) {
        const start = performance.now();
        try {
            await ai.models.generateContent({
                model: modelId,
                contents: "Hi",
                config: { maxOutputTokens: 1 }
            });
            const end = performance.now();
            // If any model works, the key is valid.
            return { isValid: true, latency: Math.round(end - start), activeModel: modelId };
        } catch (error: any) {
            const msg = (error.message || "").toLowerCase();
            console.warn(`Validation probe failed for model ${modelId}:`, msg);

            if (msg.includes("429") || msg.includes("quota") || msg.includes("resource exhausted")) {
                return { isValid: false, latency: 0, errorType: 'quota_exceeded' };
            }
            if (msg.includes("api key not valid") || msg.includes("permission denied")) {
                // If explicit invalid key error, stop immediately.
                return { isValid: false, latency: 0, errorType: 'invalid' };
            }
            // If 404 (Model not found) or other errors, continue loop to try next model
        }
    }

    // If all probes failed
    return { isValid: false, latency: 0, errorType: 'unknown' };
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
