
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL, MY_FIXED_KEYS } from "../constants";
import { PromptRegistry } from "./promptRegistry";
import { VectorStore } from "./vectorStore";
import { PrivacyService } from "./privacyService"; 
import { LocalIntelligence } from "./localIntelligence";
import { AnalysisResult } from "../types";

// --- CLIENT FACTORY ---
const getAiClient = (overrideKey?: string) => {
    let keyToUse = overrideKey;
    if (!keyToUse && MY_FIXED_KEYS.length > 0) keyToUse = MY_FIXED_KEYS[0];
    
    // Attempt to grab from Env
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
    
    // Attempt to grab from LocalStorage Pool
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

// --- CORE UTILS ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * WATERFALL EXECUTION STRATEGY
 * Tries a list of models in sequence. If one fails with a recoverable error (429, 404, 503),
 * it moves to the next.
 */
const executeWithModelCascade = async (
    preferredModel: string,
    operationName: string,
    executeFn: (model: string) => Promise<GenerateContentResponse>
): Promise<string> => {
    // FALLBACK CHAIN:
    // 1. User Preferred (usually Pro 3.0)
    // 2. Flash 2.0 Exp (Fast, New)
    // 3. Flash 1.5 (Stable, High Quota) -> The Safety Net
    // 4. Pro 1.5 (Legacy High Quality)
    const modelChain = [
        preferredModel,
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
        "gemini-1.5-pro"
    ];

    // Remove duplicates
    const uniqueModels = [...new Set(modelChain)].filter(m => m);
    let lastError: any = null;

    for (const model of uniqueModels) {
        try {
            console.log(`[${operationName}] Attempting with model: ${model}...`);
            const result = await executeFn(model);
            if (result && result.text) {
                return result.text;
            }
        } catch (error: any) {
            lastError = error;
            const msg = (error.message || "").toLowerCase();
            const status = error.status || error.code || 0;

            console.warn(`[${operationName}] Failed on ${model}: ${msg}`);

            // If it's a "Quota" (429) or "Not Found" (404) or "Overloaded" (503), we try the next one.
            // If it's "Invalid Key" (403), we stop immediately (no point switching models).
            if (status === 403 || msg.includes("key not valid") || msg.includes("api_key_invalid")) {
                throw new Error("Invalid API Key. Please check your settings.");
            }

            // Short pause before switching to be polite to the network
            await wait(500); 
        }
    }

    throw new Error(`All AI models failed. Last error: ${lastError?.message || 'Unknown'}`);
};

export const validateApiKey = async (rawKey: string): Promise<{ isValid: boolean, latency: number, errorType?: string, errorMessage?: string, activeModel?: string }> => {
    const key = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : "";
    if (!key) return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Key is empty" };
    
    const ai = new GoogleGenAI({ apiKey: key });
    
    // Validation: Try the most robust model first (1.5 Flash)
    // If 1.5 Flash works, the key is good.
    const modelsToProbe = ["gemini-1.5-flash", "gemini-2.0-flash-exp"];

    for (const model of modelsToProbe) {
        const start = performance.now();
        try {
            await ai.models.generateContent({ model, contents: { parts: [{ text: "Hi" }] } });
            return { isValid: true, latency: Math.round(performance.now() - start), activeModel: model };
        } catch (error: any) {
            const msg = (error.message || "").toLowerCase();
            if (msg.includes("key") || error.status === 403) {
                return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Invalid API Key." };
            }
            // If quota/404, loop to next model
        }
    }
    
    // If we get here, assuming valid but maybe quota issues, return valid to let app try
    return { isValid: true, latency: 999, activeModel: "gemini-1.5-flash" }; 
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
        const text = await executeWithModelCascade(
            model || DEFAULT_GEMINI_MODEL,
            "Analysis",
            (m) => ai.models.generateContent({
                model: m,
                contents: finalPrompt,
                config
            })
        );
        return text || "{}";
    } catch (e) {
        // Ultimate fallback if API fails completely
        console.error("All Analysis Models Failed", e);
        return LocalIntelligence.analyze(clause.code, clause.title, evidenceContext);
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
    ROLE: ISO Technical Reviewer.
    TASK: Critique this finding:
    Clause: ${finding.clauseId} (${finding.status})
    Evidence: "${finding.evidence}"
    Reason: "${finding.reason}"
    
    Output max 100 words critique.
    `;

    try {
        return await executeWithModelCascade(
            model || "gemini-1.5-flash", 
            "Shadow Review",
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e) {
        return "Review unavailable (API Error).";
    }
};

// --- REPORT GENERATION (ROBUST) ---
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

    try {
        return await executeWithModelCascade(
            model || DEFAULT_GEMINI_MODEL,
            "Report Generation",
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e: any) {
        throw new Error(`Report Generation Failed: ${e.message}`);
    }
};

// --- UTILS ---

export const generateOcrContent = async (prompt: string, imageBase64: string, mimeType: string, apiKey?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    const contents = {
        parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: prompt }
        ]
    };

    try {
        return await executeWithModelCascade(
            DEFAULT_VISION_MODEL,
            "OCR",
            (m) => ai.models.generateContent({ model: m, contents })
        );
    } catch (e) {
        return "";
    }
};

export const translateChunk = async (text: string, targetLang: 'en' | 'vi', apiKey?: string) => {
    if(!text.trim()) return "";
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    const prompt = `Translate to ${targetLang === 'vi' ? 'Vietnamese' : 'English'}. Keep formatting.\n\n${text}`;
    
    try {
        return await executeWithModelCascade(
            "gemini-1.5-flash",
            "Translation",
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e) {
        return text; // Return original if fail
    }
};

// Stub helpers
export const generateMissingDescriptions = async (targets: any[]) => "[]";

// Updated signatures to match usage in hooks with AI Implementation
export const fetchFullClauseText = async (clause: any, standardName: string, context: string | null, apiKey: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) return { en: "API Key missing", vi: "" };

    const prompt = `
    ROLE: ISO Standard Expert.
    TASK: Provide the full official text (or detailed summary if copyrighted) for:
    Standard: ${standardName}
    Clause: ${clause.code} - ${clause.title}
    
    CONTEXT (from user document):
    """
    ${context ? context.substring(0, 3000) : "No local context provided."}
    """

    OUTPUT: JSON Object with keys:
    - en: English text
    - vi: Vietnamese translation
    `;

    try {
        const text = await executeWithModelCascade(
            DEFAULT_GEMINI_MODEL,
            "Fetch Clause Text",
            (m) => ai.models.generateContent({
                model: m,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            })
        );
        return JSON.parse(text);
    } catch (e) {
        console.error("Fetch Clause Failed", e);
        return { en: "Content unavailable due to API error.", vi: "" };
    }
};

export const mapStandardRequirements = async (standardName: string, codes: string[], text: string) => {
    const ai = getAiClient();
    if (!ai) return {};

    // Limit text to avoid token limits (approx 30k chars is safe for flash models usually)
    const safeText = text.length > 50000 ? text.substring(0, 50000) + "..." : text;

    const prompt = `
    ROLE: ISO Analyst.
    TASK: Map the following Clause Codes to their Description/Requirement text found in the document.
    
    STANDARD: ${standardName}
    CODES TO FIND: ${JSON.stringify(codes)}
    
    DOCUMENT CONTENT:
    """
    ${safeText}
    """
    
    OUTPUT: JSON Object { "CODE": "Description text extracted from document" }.
    Only include found codes.
    `;

    try {
        const result = await executeWithModelCascade(
            "gemini-1.5-flash", // Use flash for large context processing
            "Map Requirements",
            (m) => ai.models.generateContent({
                model: m,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            })
        );
        return JSON.parse(result);
    } catch (e) {
        console.error("Mapping Failed", e);
        return {};
    }
};

export const generateAuditPlan = async () => "Not Implemented";
export const parseStandardStructure = async () => ({});
