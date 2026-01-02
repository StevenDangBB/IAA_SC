
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL } from "../constants";
import { Clause } from "../types";
import { cleanAndParseJSON } from "../utils";

const getAiClient = (overrideKey?: string) => {
    // Check order: 
    // 1. Explicit Override
    // 2. Process Env (Defined in vite.config.ts)
    // 3. Local Storage
    const apiKey = overrideKey || process.env.API_KEY || localStorage.getItem("iso_api_key") || "";
    
    if (!apiKey) {
        console.error("Gemini API Key is missing. Environment checks:", { 
            processEnv: !!process.env.API_KEY, 
            override: !!overrideKey,
            storage: !!localStorage.getItem("iso_api_key")
        });
        throw new Error("API Key is missing. Please check your .env file or Settings.");
    }
    return new GoogleGenAI({ apiKey });
};

export const validateApiKey = async (key: string, modelId: string = DEFAULT_GEMINI_MODEL): Promise<{ isValid: boolean, latency: number, errorType?: 'invalid' | 'quota_exceeded' | 'unknown' }> => {
    if (!key || key.trim() === "") {
        return { isValid: false, latency: 0, errorType: 'invalid' };
    }
    const start = performance.now();
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({
            model: modelId,
            contents: "Hi",
            config: {
                maxOutputTokens: 1,
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        const end = performance.now();
        return { isValid: true, latency: Math.round(end - start) };
    } catch (error: any) {
        let errorType: 'invalid' | 'quota_exceeded' | 'unknown' = 'unknown';
        const msg = (error.message || "").toLowerCase();
        
        if (msg.includes("403") || msg.includes("api key not valid") || msg.includes("permission denied") || msg.includes("invalid argument")) {
            errorType = 'invalid';
        } else if (msg.includes("429") || msg.includes("quota") || msg.includes("resource exhausted")) {
            errorType = 'quota_exceeded';
        } else if (msg.includes("not found") || msg.includes("404")) {
             // Model not found often means key doesn't have access to it, treated as invalid for that model
             errorType = 'invalid';
        }
        
        return { isValid: false, latency: 0, errorType };
    }
};

export const fetchFullClauseText = async (clause: { code: string, title: string }, standardName: string, apiKey?: string, model?: string): Promise<{ en: string; vi: string }> => {
    const ai = getAiClient(apiKey);
    // ENHANCED PROMPT: Explicitly asking for structured document formatting
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
