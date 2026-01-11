
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL, MODEL_HIERARCHY, MY_FIXED_KEYS } from "../constants";
import { cleanAndParseJSON } from "../utils";
import { Standard, AnalysisResult } from "../types";
import { PromptRegistry } from "./promptRegistry";
import { VectorStore } from "./vectorStore";
import { PrivacyService } from "./privacyService"; 
import { LocalIntelligence } from "./localIntelligence";

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
    if (!keyToUse) {
        try {
            const poolRaw = localStorage.getItem("iso_api_keys");
            const activeId = localStorage.getItem("iso_active_key_id");
            if (poolRaw) {
                const pool = JSON.parse(poolRaw);
                if (Array.isArray(pool) && pool.length > 0) {
                    const activeKey = pool.find((k: any) => k.id === activeId);
                    keyToUse = activeKey ? activeKey.key : pool[0].key;
                }
            }
        } catch (e) {}
    }
    const apiKey = (keyToUse || "").trim();
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const isQuota = error.status === 429 || error.code === 429 || 
                       (error.message && error.message.includes('429')) || 
                       (error.message && error.message.toLowerCase().includes('quota'));
        if (isQuota && retries > 0) {
            console.warn(`Quota 429. Retrying... (${retries})`);
            await wait(delayMs);
            return callWithRetry(fn, retries - 1, delayMs * 2);
        }
        throw error;
    }
};

export const validateApiKey = async (rawKey: string): Promise<{ isValid: boolean, latency: number, errorType?: 'invalid' | 'quota_exceeded' | 'network_error' | 'referrer_error' | 'unknown', errorMessage?: string, activeModel?: string }> => {
    const key = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : "";
    if (!key) return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Key is empty" };
    const ai = new GoogleGenAI({ apiKey: key });
    const probeModels = [...MODEL_HIERARCHY];
    let globalErrorType: any = undefined;
    let lastError: any = null;

    for (const model of probeModels) {
        const start = performance.now();
        try {
            await ai.models.generateContent({ model: model, contents: { parts: [{ text: "Hi" }] } });
            return { isValid: true, latency: Math.round(performance.now() - start), activeModel: model };
        } catch (error: any) {
            lastError = error;
            const msg = (error.message || "").toLowerCase();
            if (msg.includes("key not valid") || msg.includes("api_key_invalid")) return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Invalid API Key." };
            if (error.status === 429 || msg.includes("quota")) { globalErrorType = 'quota_exceeded'; continue; }
        }
    }
    if (globalErrorType === 'quota_exceeded') return { isValid: false, latency: 0, errorType: 'quota_exceeded', errorMessage: "All models exhausted quota." };
    return { isValid: false, latency: 0, errorType: 'unknown', errorMessage: lastError?.message || "Validation failed." };
};

// --- ANALYSIS + HYBRID RAG ---
export const generateAnalysis = async (
    clause: { code: string, title: string, description: string },
    standardName: string,
    evidenceContext: string,
    tagsContext: string,
    apiKey?: string, 
    model?: string,
    usePrivacyShield: boolean = false
) => {
    if (!navigator.onLine) {
        return LocalIntelligence.analyze(clause.code, clause.title, evidenceContext);
    }

    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    // HYBRID SEARCH: Combine Vector Search + Keyword Search (simulated via Knowledge Context)
    const ragQuery = `${clause.code} ${clause.title} ${clause.description}`;
    const ragKey = apiKey || ""; 
    const vectorContext = await VectorStore.search(ragQuery, ragKey);
    
    let safeEvidence = evidenceContext + "\n\nTAGGED SECTIONS:\n" + tagsContext;
    if (usePrivacyShield) {
        safeEvidence = PrivacyService.redact(safeEvidence);
    }

    const template = PromptRegistry.getPrompt('ANALYSIS');
    const finalPrompt = PromptRegistry.hydrate(template.template, {
        STANDARD_NAME: standardName,
        CLAUSE_CODE: clause.code,
        CLAUSE_TITLE: clause.title,
        CLAUSE_DESC: clause.description,
        RAG_CONTEXT: vectorContext || "No source document available for vector search.",
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
        const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
            model: targetModel,
            contents: finalPrompt,
            config
        }));
        return response.text || "{}";
    } catch (e: any) {
        console.warn(`Analysis failed on ${targetModel}. Fallback to Flash.`);
        try {
            const retryResponse: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: finalPrompt,
                config
            }));
            return retryResponse.text || "{}";
        } catch (retryError) {
            return LocalIntelligence.analyze(clause.code, clause.title, evidenceContext);
        }
    }
};

// --- SHADOW REVIEWER ---
export const performShadowReview = async (
    finding: AnalysisResult,
    apiKey?: string,
    model?: string
): Promise<string> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const prompt = `
    ROLE: ISO Technical Reviewer (Certification Body).
    TASK: Critique the following audit finding. 
    
    FINDING DATA:
    Clause: ${finding.clauseId}
    Status: ${finding.status}
    Auditor's Evidence: "${finding.evidence}"
    Auditor's Reason: "${finding.reason}"

    CRITERIA:
    1. Is the evidence sufficient to support the status?
    2. Is the reasoning logical and connected to the requirement?
    3. Is the tone professional and objective?

    OUTPUT:
    Provide a short, critical review (max 100 words). If acceptable, say "Review Passed". If weak, provide 1 concrete improvement suggestion.
    `;

    try {
        const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
            model: model || DEFAULT_GEMINI_MODEL,
            contents: prompt
        }));
        return response.text || "Review unavailable.";
    } catch (e) {
        return "Review failed (Network/API Error).";
    }
};

// --- MISSING FUNCTIONS IMPLEMENTATION ---

export const generateOcrContent = async (prompt: string, imageBase64: string, mimeType: string, apiKey?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: DEFAULT_VISION_MODEL,
        contents: {
            parts: [
                { inlineData: { mimeType, data: imageBase64 } },
                { text: prompt }
            ]
        }
    }));
    return response.text || "";
};

export const translateChunk = async (text: string, targetLang: 'en' | 'vi', apiKey?: string) => {
    if(!text.trim()) return "";
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    const prompt = `Translate the following text to ${targetLang === 'vi' ? 'Vietnamese' : 'English'}. Maintain tone and formatting.\n\n${text}`;
    const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
    }));
    return response.text || "";
};

export const generateTextReport = async (data: any, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    const template = PromptRegistry.getPrompt('REPORT');
    const prompt = PromptRegistry.hydrate(template.template, {
        COMPANY: data.company,
        STANDARD_NAME: data.standard,
        AUDITOR: data.auditor,
        LANGUAGE: data.lang,
        FINDINGS_JSON: JSON.stringify(data.findings),
        FULL_EVIDENCE_CONTEXT: data.fullEvidenceContext || "N/A"
    });

    const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: model || DEFAULT_GEMINI_MODEL,
        contents: prompt
    }));
    return response.text || "";
};

export const generateMissingDescriptions = async (targets: {code: string, title: string}[]) => {
    const ai = getAiClient();
    if (!ai) throw new Error("API Key missing");
    
    const prompt = `
    For the following ISO clauses, provide a short 1-sentence description of the requirement.
    Return JSON array: [{ "code": "...", "description": "..." }]
    
    Clauses:
    ${JSON.stringify(targets)}
    `;
    
    const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    }));
    return response.text || "[]";
};

export const fetchFullClauseText = async (clause: any, standardName: string, knowledgeBase: string | null, apiKey?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    let context = "";
    if (knowledgeBase) {
        context = `
        SOURCE DOCUMENT CONTENT:
        ${knowledgeBase.substring(0, 30000)} ... (truncated)
        `;
    }

    const prompt = `
    Retrieve the FULL TEXT for Clause ${clause.code} (${clause.title}) from ISO Standard ${standardName}.
    
    ${context}
    
    If source document is provided, extract verbatim.
    If not, generate the standard requirement text based on general ISO knowledge.
    
    Output Format:
    {
      "en": "English text...",
      "vi": "Vietnamese translation..."
    }
    `;

    const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    }));
    
    try {
        return JSON.parse(response.text || "{}");
    } catch {
        return { en: response.text || "", vi: "" };
    }
};

export const mapStandardRequirements = async (standardName: string, codes: string[], text: string) => {
    const ai = getAiClient();
    if (!ai) return {};
    
    const prompt = `
    Map the following clause codes to their requirement text found in the provided document snippet.
    Standard: ${standardName}
    Codes: ${codes.join(", ")}
    
    Document Snippet:
    ${text.substring(0, 10000)}
    
    Return JSON: { "CODE": "Extracted Text" }
    `;
    
    try {
        const response: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        }));
        return JSON.parse(response.text || "{}");
    } catch { return {}; }
};

// Stubs for currently unused or simple functions to satisfy export contract
export const generateAuditPlan = async () => "Plan Generation Not Implemented";
export const parseStandardStructure = async () => ({});
