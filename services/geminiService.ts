
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL, MODEL_HIERARCHY, MY_FIXED_KEYS } from "../constants";
import { cleanAndParseJSON } from "../utils";
import { Standard, AnalysisResult } from "../types";
import { PromptRegistry } from "./promptRegistry";
import { VectorStore } from "./vectorStore";
import { PrivacyService } from "./privacyService"; 
import { LocalIntelligence } from "./localIntelligence";

const getAiClient = (overrideKey?: string) => {
    let keyToUse = overrideKey;
    
    // 1. Check Fixed/Env Keys
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
    
    // 2. Check Legacy Storage
    if (!keyToUse) keyToUse = localStorage.getItem("iso_api_key") || "";

    // 3. Check Key Pool Storage (New Architecture Failsafe)
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
        } catch (e) {
            console.warn("Failed to retrieve key from pool storage", e);
        }
    }

    const apiKey = (keyToUse || "").trim();
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

// --- ROBUST VALIDATION WITH QUOTA PROBING ---
export const validateApiKey = async (rawKey: string): Promise<{ isValid: boolean, latency: number, errorType?: 'invalid' | 'quota_exceeded' | 'network_error' | 'referrer_error' | 'unknown', errorMessage?: string, activeModel?: string }> => {
    const key = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : "";
    if (!key) return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Key is empty" };
    
    const ai = new GoogleGenAI({ apiKey: key });
    
    // Probing Strategy: Try models from Highest Tier to Lowest.
    // Stop at the first one that works (200 OK).
    // If 429 (Quota), continue to next model.
    // If 403 (Invalid), stop immediately.

    const probeModels = [...MODEL_HIERARCHY];
    let lastError: any = null;
    let globalErrorType: 'invalid' | 'quota_exceeded' | 'network_error' | 'referrer_error' | 'unknown' | undefined = undefined;

    for (const model of probeModels) {
        const start = performance.now();
        try {
            // Use a tiny prompt to minimize latency and cost
            await ai.models.generateContent({ model: model, contents: { parts: [{ text: "Hi" }] } });
            const end = performance.now();
            
            // Success! This model works.
            return { isValid: true, latency: Math.round(end - start), activeModel: model };
        } catch (error: any) {
            lastError = error;
            const msg = (error.message || "").toLowerCase();
            const status = error.status || 0;
            
            // CASE 1: INVALID KEY (Stop immediately, no point trying other models)
            if (msg.includes("key not valid") || msg.includes("api_key_invalid") || msg.includes("unauthenticated")) {
                return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Invalid API Key." };
            }

            // CASE 2: PERMISSION DENIED / REFERRER (Stop immediately)
            if (status === 403 || msg.includes("permission denied") || msg.includes("referrer")) {
                 return { isValid: false, latency: 0, errorType: 'referrer_error', errorMessage: "Access Denied (Referrer/IP blocked)." };
            }
            
            // CASE 3: QUOTA EXCEEDED (Continue loop to try lower tier model)
            if (status === 429 || msg.includes("quota") || msg.includes("exhausted")) {
                globalErrorType = 'quota_exceeded';
                continue; // TRY NEXT MODEL
            }

            // CASE 4: NETWORK ERROR (Stop, usually client side)
            if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
                return { isValid: false, latency: 0, errorType: 'network_error', errorMessage: "Network Connection Failed." };
            }
        }
    }

    // If we get here, ALL models failed.
    // If we saw at least one Quota Exceeded, that's the reason.
    if (globalErrorType === 'quota_exceeded') {
        return { isValid: false, latency: 0, errorType: 'quota_exceeded', errorMessage: "All models exhausted quota." };
    }

    return { isValid: false, latency: 0, errorType: 'unknown', errorMessage: lastError?.message || "Validation failed." };
};

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
    
    // Try primary, then fallback
    try {
        const response = await ai.models.generateContent({ model: targetModel, contents: prompt, config: { responseMimeType: "application/json" } });
        const parsed = cleanAndParseJSON(response.text || "{}");
        return { en: parsed?.en || "N/A", vi: parsed?.vi || "N/A" };
    } catch (e) {
        console.warn("Primary fetch failed, trying fallback model...");
        try {
             const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt, config: { responseMimeType: "application/json" } });
             const parsed = cleanAndParseJSON(response.text || "{}");
             return { en: parsed?.en || "N/A", vi: parsed?.vi || "N/A" };
        } catch (e2) {
            throw e;
        }
    }
};

// --- NEW FUNCTION: FULL STANDARD MAPPING ---
export const mapStandardRequirements = async (standardName: string, clauseCodes: string[], sourceText: string, apiKey?: string, model?: string): Promise<Record<string, string>> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    // Fallback chain
    const modelsToTry = model ? [model] : ["gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.0-flash-exp"];

    const prompt = `
    Role: ISO Standard Analyst.
    Task: Extract the EXACT, VERBATIM content for the requested clauses from the provided Standard Document Source.
    
    Instructions:
    1. Look for the specific clause numbers provided in the list.
    2. Extract the full text (requirements) associated with that clause.
    3. PRESERVE formatting, newlines, and bullet points.
    4. If a clause code is not found in the text, return "Content not found in source document."
    
    Clauses to Extract: ${JSON.stringify(clauseCodes)}
    
    Source Text:
    """
    ${sourceText.substring(0, 800000)} 
    """
    
    Output Format: JSON Object where Key = Clause Code (e.g. "4.1"), Value = Verbatim Text.
    {
      "4.1": "The organization shall determine external and internal issues...",
      "4.2": "..."
    }
    `;

    for (const targetModel of modelsToTry) {
        try {
            console.log(`Mapping Standard with model: ${targetModel}`);
            const response = await ai.models.generateContent({ 
                model: targetModel, 
                contents: prompt, 
                config: { responseMimeType: "application/json" } 
            });
            const result = cleanAndParseJSON(response.text || "{}");
            if (result && Object.keys(result).length > 0) {
                return result;
            }
        } catch (e: any) {
            console.warn(`Mapping failed on ${targetModel}:`, e.message);
            // Continue to next model
        }
    }
    
    console.error("All models failed to map standard requirements.");
    return {};
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
        console.log("Offline Mode: Using Local Intelligence");
        return LocalIntelligence.analyze(clause.code, clause.title, evidenceContext);
    }

    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    const ragQuery = `${clause.code} ${clause.title} ${clause.description}`;
    const ragKey = apiKey || ""; 
    const ragContext = await VectorStore.search(ragQuery, ragKey);

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
        if (targetModel !== "gemini-3-flash-preview") {
             try {
                console.log("Retrying with fallback model: gemini-3-flash-preview");
                const retryResponse = await ai.models.generateContent({
                    model: "gemini-3-flash-preview",
                    contents: finalPrompt,
                    config
                });
                return retryResponse.text || "{}";
             } catch (retryError) {
                 console.error("Fallback Failed:", retryError);
             }
        }
        return LocalIntelligence.analyze(clause.code, clause.title, evidenceContext);
    }
};

export const generateTextReport = async (
    data: { 
        company: string, 
        type: string, 
        auditor: string, 
        standard: string, 
        findings: any[], 
        lang: string,
        fullEvidenceContext?: string
    },
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
        FULL_EVIDENCE_CONTEXT: data.fullEvidenceContext || "No granular evidence provided.",
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
        try {
             const retryResponse = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: finalPrompt
            });
            return retryResponse.text || "";
        } catch (retryErr) {
            throw new Error(e.message || "Report generation failed");
        }
    }
};

export const generateMissingDescriptions = async (clauses: { code: string, title: string }[], apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) return "[]";
    const targetModel = model || DEFAULT_GEMINI_MODEL;
    const prompt = `Provide concise descriptions (15-20 words) for these ISO clauses. JSON Array: [{"code": "...", "description": "..."}]. Clauses: ${JSON.stringify(clauses)}`;
    try {
        const response = await ai.models.generateContent({ model: targetModel, contents: prompt, config: { responseMimeType: "application/json" } });
        return response.text || "[]";
    } catch (e) { 
        try {
             const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt, config: { responseMimeType: "application/json" } });
             return response.text || "[]";
        } catch (err) { return "[]"; }
    }
};

// --- NEW: AI PLANNING ---
export const generateAuditPlan = async (
    standardName: string, 
    companyContext: string, 
    existingProcesses: { id: string, name: string }[],
    apiKey?: string, 
    model?: string
): Promise<{ newProcesses: { name: string, clauses: string[] }[], updates: { processId: string, clauses: string[] }[] }> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");
    
    const prompt = `
    Role: Senior ISO Lead Auditor.
    Task: Create/Update an Audit Plan Matrix for "${standardName}" applied to "${companyContext || 'Generic Company'}".
    
    1. If NO processes are provided, suggest 3-4 standard processes (e.g. Management, HR, Operations) and list applicable clause IDs (Codes ONLY) for each.
    2. If processes ARE provided, map applicable clause IDs to them.
    3. Return strictly JSON.
    
    Existing Processes provided: ${JSON.stringify(existingProcesses.map(p => ({ id: p.id, name: p.name })))}
    
    Output Format:
    {
        "newProcesses": [ { "name": "...", "clauses": ["4.1", "5.1", ...] } ],  // Only if needed or requested
        "updates": [ { "processId": "...", "clauses": ["...", ...] } ] // For existing processes
    }
    `;

    const targetModel = model || DEFAULT_GEMINI_MODEL;
    try {
        const response = await ai.models.generateContent({ 
            model: targetModel, 
            contents: prompt, 
            config: { responseMimeType: "application/json" } 
        });
        const result = cleanAndParseJSON(response.text || "{}");
        return {
            newProcesses: result.newProcesses || [],
            updates: result.updates || []
        };
    } catch (e) {
        console.error("Auto-Plan Error", e);
        return { newProcesses: [], updates: [] };
    }
};
