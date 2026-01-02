
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL, MODEL_HIERARCHY, MY_FIXED_KEYS } from "../constants";
import { cleanAndParseJSON } from "../utils";

const getAiClient = (overrideKey?: string) => {
    let keyToUse = overrideKey;

    // Prioritize passed key, then Fixed Keys (Env), then LocalStorage
    if (!keyToUse && MY_FIXED_KEYS.length > 0) {
        keyToUse = MY_FIXED_KEYS[0];
    }

    if (!keyToUse) {
        try {
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
                // @ts-ignore
                keyToUse = import.meta.env.VITE_API_KEY;
            }
        } catch (e) {}
    }

    if (!keyToUse && typeof process !== 'undefined' && process.env) {
        keyToUse = process.env.API_KEY;
    }

    if (!keyToUse) {
        keyToUse = localStorage.getItem("iso_api_key") || "";
    }

    const apiKey = (keyToUse || "").trim();
    
    if (!apiKey) {
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

// --- ROBUST VALIDATION ---
export const validateApiKey = async (rawKey: string, preferredModel?: string): Promise<{ isValid: boolean, latency: number, errorType?: 'invalid' | 'quota_exceeded' | 'network_error' | 'unknown', errorMessage?: string, activeModel?: string }> => {
    const key = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : "";

    if (!key) {
        return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Key is empty" };
    }

    const ai = new GoogleGenAI({ apiKey: key });
    
    // Simplest possible probe
    const probeModel = "gemini-1.5-flash";

    const start = performance.now();
    try {
        // Use a very minimal prompt to save tokens and time
        await ai.models.generateContent({
            model: probeModel,
            contents: { parts: [{ text: "Hi" }] }, 
        });
        const end = performance.now();
        
        return { isValid: true, latency: Math.round(end - start), activeModel: probeModel };
        
    } catch (error: any) {
        const msg = (error.message || "").toLowerCase();
        const status = error.status || 0;
        
        console.warn("Validation Probe Error:", msg);

        // Explicitly identify Auth errors
        if (msg.includes("key not valid") || status === 400 || msg.includes("invalid argument") || msg.includes("api_key")) {
            return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Invalid API Key" };
        }
        
        // Quota errors
        if (status === 429 || msg.includes("quota") || msg.includes("exhausted")) {
            return { isValid: false, latency: 0, errorType: 'quota_exceeded', errorMessage: "Quota Exceeded" };
        }

        // Network / CORS errors (Sandbox issues)
        if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
             // In many sandboxes, the key might be valid but the network blocks it. 
             // We return a specific type so UI can warn but maybe allows trying.
             return { isValid: false, latency: 0, errorType: 'network_error', errorMessage: "Network/CORS Blocked" };
        }

        return { isValid: false, latency: 0, errorType: 'unknown', errorMessage: msg.substring(0, 50) };
    }
};

// --- REAL FEATURE: REFERENCE LOOKUP ---
export const fetchFullClauseText = async (clause: { code: string, title: string }, standardName: string, apiKey?: string, model?: string): Promise<{ en: string; vi: string }> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const targetModel = model || DEFAULT_GEMINI_MODEL;
    
    const prompt = `You are an ISO Standard Database. 
    Task: Provide the EXACT verbatim text for the clause below.
    Standard: ${standardName}
    Clause: [${clause.code}] ${clause.title}
    
    Output Format: JSON ONLY.
    Structure: {"en": "Full English Text...", "vi": "Full Vietnamese Text Translation..."}
    Do not summarize. Return full legal text.`;
    
    const config: any = {};
    if (!targetModel.includes("1.0-pro")) {
        config.responseMimeType = "application/json";
    }

    try {
        const response = await ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config
        });
        
        const parsed = cleanAndParseJSON(response.text || "{}");
        return { 
            en: parsed?.en || "Content unavailable via AI.", 
            vi: parsed?.vi || "Nội dung không khả dụng qua AI." 
        };
    } catch (e) {
        console.error("Fetch Clause Error:", e);
        throw e;
    }
};

// --- REAL FEATURE: OCR ---
export const generateOcrContent = async (textPrompt: string, base64Data: string, mimeType: string, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    const targetModel = model || DEFAULT_VISION_MODEL;

    try {
        const response = await ai.models.generateContent({
            model: targetModel,
            contents: {
                parts: [
                    { text: textPrompt }, 
                    { inlineData: { mimeType, data: base64Data } }
                ]
            }
        });
        return response.text || "";
    } catch (e: any) {
        console.error("OCR Error:", e);
        throw new Error(e.message || "OCR processing failed");
    }
};

// --- REAL FEATURE: ANALYSIS ---
export const generateAnalysis = async (prompt: string, systemInstruction: string, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const targetModel = model || DEFAULT_GEMINI_MODEL;

    const config: any = { systemInstruction };
    
    if (!targetModel.includes("1.0-pro")) {
        config.responseMimeType = "application/json";
        config.responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    clauseId: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ["COMPLIANT", "NC_MINOR", "NC_MAJOR", "OFI", "N_A"] },
                    reason: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                    evidence: { type: Type.STRING },
                    conclusion_report: { type: Type.STRING }
                },
                required: ["clauseId", "status", "reason", "evidence"]
            }
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config
        });
        return response.text || "[]";
    } catch (e: any) {
        console.error("Analysis Error:", e);
        throw new Error(e.message || "Analysis failed");
    }
};

// --- REAL FEATURE: REPORTING ---
export const generateTextReport = async (prompt: string, systemInstruction: string, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    try {
        const response = await ai.models.generateContent({
            model: model || DEFAULT_GEMINI_MODEL,
            contents: prompt,
            config: { systemInstruction }
        });
        return response.text || "";
    } catch (e: any) {
        console.error("Reporting Error:", e);
        throw new Error(e.message || "Report generation failed");
    }
};

export const generateMissingDescriptions = async (clauses: { code: string, title: string }[], apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) return "[]";
    
    const targetModel = model || DEFAULT_GEMINI_MODEL;
    const prompt = `Provide concise descriptions (15-20 words) for these ISO clauses to help an auditor understand the core requirement.
    Clauses: ${JSON.stringify(clauses)}
    
    Output JSON Array: [{"code": "...", "description": "..."}]`;
    
    const config: any = {};
    if (!targetModel.includes("1.0-pro")) {
        config.responseMimeType = "application/json";
    }

    try {
        const response = await ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config
        });
        return response.text || "[]";
    } catch (e) {
        return "[]";
    }
};
