
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL, MODEL_HIERARCHY, MY_FIXED_KEYS } from "../constants";
import { cleanAndParseJSON } from "../utils";
import { Standard, AnalysisResult } from "../types";
import { PromptRegistry } from "./promptRegistry";
import { VectorStore } from "./vectorStore";
import { PrivacyService } from "./privacyService"; // NEW
import { LocalIntelligence } from "./localIntelligence"; // NEW

const getAiClient = (overrideKey?: string) => {
    let keyToUse = overrideKey;
    if (!keyToUse && MY_FIXED_KEYS.length > 0) keyToUse = MY_FIXED_KEYS[0];
    if (!keyToUse) {
        try {
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
                // @ts-ignore
                keyToUse = import.meta.env.VITE_API_KEY;
            }
        } catch (e) {}
    }
    if (!keyToUse && typeof process !== 'undefined' && process.env) keyToUse = process.env.API_KEY;
    if (!keyToUse) keyToUse = localStorage.getItem("iso_api_key") || "";
    const apiKey = (keyToUse || "").trim();
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

// --- VALIDATION ---
export const validateApiKey = async (rawKey: string, preferredModel?: string): Promise<{ isValid: boolean, latency: number, errorType?: 'invalid' | 'quota_exceeded' | 'network_error' | 'referrer_error' | 'unknown', errorMessage?: string, activeModel?: string }> => {
    const key = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : "";
    if (!key) return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Key is empty" };
    const ai = new GoogleGenAI({ apiKey: key });
    const probeModels = [...MODEL_HIERARCHY];
    if (preferredModel && !probeModels.includes(preferredModel)) probeModels.unshift(preferredModel);

    let lastError: any = null;
    let any403 = false;
    let apiNotEnabled = false;

    for (const model of probeModels) {
        const start = performance.now();
        try {
            await ai.models.generateContent({ model: model, contents: { parts: [{ text: "Hi" }] } });
            const end = performance.now();
            return { isValid: true, latency: Math.round(end - start), activeModel: model };
        } catch (error: any) {
            lastError = error;
            const msg = (error.message || "").toLowerCase();
            const status = error.status || 0;
            if (status !== 404 && status !== 403 && !msg.includes("not found")) console.warn(`[Gemini Probe] ${model} failed:`, error);
            if (msg.includes("key not valid") || status === 400 || msg.includes("invalid argument") || msg.includes("api_key")) return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Invalid API Key." };
            if (status === 429 || msg.includes("quota") || msg.includes("exhausted")) return { isValid: false, latency: 0, errorType: 'quota_exceeded', errorMessage: "Quota Exceeded." };
            if (status === 403 || msg.includes("permission denied") || msg.includes("referrer")) {
                 any403 = true;
                 if (msg.includes("has not been used") || msg.includes("not enabled")) apiNotEnabled = true;
                 continue;
            }
            if (status === 404 || msg.includes("not found")) continue;
        }
    }
    const msg = (lastError?.message || "").toLowerCase();
    if (any403) {
        if (apiNotEnabled) return { isValid: false, latency: 0, errorType: 'referrer_error', errorMessage: "API Not Enabled." };
        return { isValid: false, latency: 0, errorType: 'referrer_error', errorMessage: "Access Denied (403)." };
    }
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) return { isValid: false, latency: 0, errorType: 'network_error', errorMessage: "Network Error." };
    return { isValid: false, latency: 0, errorType: 'unknown', errorMessage: lastError?.message || "Unknown error." };
};

// ... (fetchFullClauseText, parseStandardStructure, generateOcrContent kept same or similar - omitted for brevity if unchanged logic, but included here for completeness)
export const fetchFullClauseText = async (clause: { code: string, title: string }, standardName: string, contextData: string | null, apiKey?: string, model?: string): Promise<{ en: string; vi: string }> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    const targetModel = model || DEFAULT_GEMINI_MODEL;
    let prompt = "";
    if (contextData) {
        prompt = `You are a precision extraction engine. Extract VERBATIM text for [${clause.code}] ${clause.title} from SOURCE.\nSOURCE:\n"""${contextData.substring(0, 500000)}"""\nOutput JSON: {"en": "...", "vi": "..."}`;
    } else {
        prompt = `Provide verbatim text for ${standardName} Clause [${clause.code}] ${clause.title}. Output JSON: {"en": "...", "vi": "..."}`;
    }
    const response = await ai.models.generateContent({ model: targetModel, contents: prompt, config: { responseMimeType: "application/json" } });
    const parsed = cleanAndParseJSON(response.text || "{}");
    return { en: parsed?.en || "N/A", vi: parsed?.vi || "N/A" };
};

export const parseStandardStructure = async (rawText: string, standardName: string, apiKey?: string, model?: string): Promise<Standard | null> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    const targetModel = model || DEFAULT_GEMINI_MODEL;
    const prompt = `Analyze ISO Standard text. Extract structure. Name: ${standardName}. Text: """${rawText.substring(0, 300000)}""". Output JSON Standard Schema.`;
    const response = await ai.models.generateContent({ model: targetModel, contents: prompt, config: { responseMimeType: "application/json" } });
    return cleanAndParseJSON(response.text || "{}") as Standard;
};

export const generateOcrContent = async (textPrompt: string, base64Data: string, mimeType: string, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    const targetModel = model || DEFAULT_VISION_MODEL;
    const response = await ai.models.generateContent({
        model: targetModel,
        contents: { parts: [{ text: textPrompt }, { inlineData: { mimeType, data: base64Data } }] }
    });
    return response.text || "";
};

// --- UPDATED ANALYSIS WITH PRIVACY & LOCAL FALLBACK ---
export const generateAnalysis = async (
    clause: { code: string, title: string, description: string },
    standardName: string,
    evidenceContext: string,
    tagsContext: string,
    apiKey?: string, 
    model?: string,
    usePrivacyShield: boolean = false
) => {
    // 1. Check Offline Status
    if (!navigator.onLine) {
        console.log("Offline Mode: Using Local Intelligence");
        return LocalIntelligence.analyze(clause.code, clause.title, evidenceContext);
    }

    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    // 2. RAG Search (Semantic)
    const ragQuery = `${clause.code} ${clause.title} ${clause.description}`;
    const ragKey = apiKey || ""; 
    const ragContext = await VectorStore.search(ragQuery, ragKey);

    // 3. Privacy Shield Redaction
    let safeEvidence = evidenceContext + "\n\nTAGGED SECTIONS:\n" + tagsContext;
    if (usePrivacyShield) {
        safeEvidence = PrivacyService.redact(safeEvidence);
    }

    // 4. Hydrate Prompt
    const template = PromptRegistry.getPrompt('ANALYSIS');
    const finalPrompt = PromptRegistry.hydrate(template.template, {
        STANDARD_NAME: standardName,
        CLAUSE_CODE: clause.code,
        CLAUSE_TITLE: clause.title,
        CLAUSE_DESC: clause.description,
        RAG_CONTEXT: ragContext || "No source document available for vector search.",
        EVIDENCE: safeEvidence
    });

    const targetModel = model || DEFAULT_GEMINI_MODEL;

    const config: any = { 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT, 
            properties: {
                clauseId: { type: Type.STRING },
                status: { type: Type.STRING, enum: ["COMPLIANT", "NC_MINOR", "NC_MAJOR", "OFI", "N_A"] },
                reason: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                evidence: { type: Type.STRING },
                conclusion_report: { type: Type.STRING },
                crossRefs: { type: Type.ARRAY, items: { type: Type.STRING } } 
            },
            required: ["clauseId", "status", "reason", "evidence"]
        }
    };
    
    try {
        const response = await ai.models.generateContent({
            model: targetModel,
            contents: finalPrompt,
            config
        });
        return response.text || "{}";
    } catch (e: any) {
        console.error("Analysis Error:", e);
        // Fallback to local if API fails (network or quota)
        return LocalIntelligence.analyze(clause.code, clause.title, evidenceContext);
    }
};

// --- UPDATED REPORTING WITH PROMPT REGISTRY ---
export const generateTextReport = async (
    data: { company: string, type: string, auditor: string, standard: string, findings: any[], lang: string },
    apiKey?: string, 
    model?: string
) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const template = PromptRegistry.getPrompt('REPORT');
    const finalPrompt = PromptRegistry.hydrate(template.template, {
        COMPANY: data.company,
        AUDIT_TYPE: data.type,
        AUDITOR: data.auditor,
        STANDARD_NAME: data.standard,
        FINDINGS_JSON: JSON.stringify(data.findings),
        LANGUAGE: data.lang === 'vi' ? 'Vietnamese' : 'English'
    });

    try {
        const response = await ai.models.generateContent({
            model: model || DEFAULT_GEMINI_MODEL,
            contents: finalPrompt
        });
        return response.text || "";
    } catch (e: any) {
        console.error("Reporting Error:", e);
        throw new Error(e.message || "Report generation failed");
    }
};

export const generateMissingDescriptions = async (clauses: { code: string, title: string }[], apiKey?: string, model?: string) => {
    // Kept same
    const ai = getAiClient(apiKey);
    if (!ai) return "[]";
    const targetModel = model || DEFAULT_GEMINI_MODEL;
    const prompt = `Provide concise descriptions (15-20 words) for these ISO clauses. JSON Array: [{"code": "...", "description": "..."}]. Clauses: ${JSON.stringify(clauses)}`;
    try {
        const response = await ai.models.generateContent({ model: targetModel, contents: prompt, config: { responseMimeType: "application/json" } });
        return response.text || "[]";
    } catch (e) { return "[]"; }
};
