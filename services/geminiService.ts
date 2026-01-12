
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL, MY_FIXED_KEYS, MODEL_HIERARCHY } from "../constants";
import { PromptRegistry } from "./promptRegistry";
import { VectorStore } from "./vectorStore";
import { PrivacyService } from "./privacyService"; 
import { LocalIntelligence } from "./localIntelligence";
import { AnalysisResult } from "../types";

// --- CLIENT FACTORY ---
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

// --- MODEL HEALTH REGISTRY (In-Memory) ---
// Tracks which models are currently "hot" (rate limited)
const modelCooldownRegistry = new Map<string, number>();

const isModelAvailable = (model: string): boolean => {
    const cooldownUntil = modelCooldownRegistry.get(model);
    if (!cooldownUntil) return true;
    return Date.now() > cooldownUntil;
};

const markModelRateLimited = (model: string) => {
    console.warn(`[Smart Rotator] ⚠️ Model ${model} hit rate limit. Cooling down for 60s.`);
    // Set 60 seconds cooldown for this model
    modelCooldownRegistry.set(model, Date.now() + 60000);
};

// --- CORE UTILS ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * SMART WATERFALL EXECUTION STRATEGY
 * Dynamic model switching based on health status and hierarchy.
 */
const executeWithModelCascade = async (
    preferredModel: string,
    operationName: string,
    executeFn: (model: string) => Promise<GenerateContentResponse>
): Promise<string> => {
    
    // 1. Construct Priority List
    // Always try preferred first (if healthy), then fallback to hierarchy
    const priorityList = [preferredModel, ...MODEL_HIERARCHY];
    const uniqueModels = [...new Set(priorityList)].filter(m => m && !m.includes('1.5')); // 1.5 deprecated

    // 2. Filter Healthy Models
    let candidates = uniqueModels.filter(m => isModelAvailable(m));
    
    // If ALL models are in cooldown, ignore cooldowns and force try the lowest tier (Flash Lite)
    // This assumes Flash Lite recovers faster or user is desperate.
    if (candidates.length === 0) {
        console.warn(`[Smart Rotator] All models in cooldown. Forcing retry on fallback.`);
        candidates = ["gemini-2.0-flash-lite-preview-02-05", ...uniqueModels];
    }

    let lastError: any = null;

    for (const model of candidates) {
        try {
            console.log(`[${operationName}] 🚀 Attempting with: ${model}...`);
            const result = await executeFn(model);
            if (result && result.text) {
                return result.text;
            }
        } catch (error: any) {
            lastError = error;
            const msg = (error.message || "").toLowerCase();
            const status = error.status || error.code || 0;

            console.warn(`[${operationName}] ❌ Failed on ${model}: ${msg}`);

            // CASE 1: QUOTA EXCEEDED (429 or 503 sometimes)
            if (status === 429 || msg.includes("exhausted") || msg.includes("too many requests")) {
                markModelRateLimited(model);
                // Loop continues to next model immediately
            }
            // CASE 2: INVALID KEY (403)
            else if (status === 403 || msg.includes("key not valid") || msg.includes("api_key_invalid")) {
                throw new Error("Invalid API Key. Please check your settings.");
            }
            // CASE 3: MODEL NOT FOUND (404)
            else if (status === 404 || msg.includes("not found")) {
                // Just skip this model forever in this session? 
                // For now just continue loop
            }
            
            // Short pause to prevent hammering
            await wait(500); 
        }
    }

    throw new Error(`All AI models failed. Last error: ${lastError?.message || 'Unknown'}`);
};

export const validateApiKey = async (rawKey: string): Promise<{ isValid: boolean, latency: number, errorType?: string, errorMessage?: string, activeModel?: string }> => {
    const key = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : "";
    if (!key) return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Key is empty" };
    
    const ai = new GoogleGenAI({ apiKey: key });
    
    // Probe with the most robust model first
    const modelsToProbe = ["gemini-2.0-flash", "gemini-3-flash-preview"];

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
        }
    }
    
    // Assume valid if not explicitly 403 (could be quota)
    return { isValid: true, latency: 999, activeModel: "gemini-2.0-flash" }; 
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
            model || "gemini-2.0-flash", 
            "Shadow Review",
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e) {
        return "Review unavailable (API Error).";
    }
};

// --- REAL-TIME REPORT GENERATION STEPS ---

// Step 1: Generate Executive Summary
export const generateExecutiveSummary = async (data: any, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const prompt = `
    ROLE: ISO Lead Auditor.
    TASK: Write a professional Executive Summary for an ISO Audit Report.
    
    CONTEXT:
    Company: ${data.company}
    Standard: ${data.standard}
    Audit Type: ${data.type}
    Auditor: ${data.auditor}
    
    FINDINGS SUMMARY:
    Total Findings: ${data.findings.length}
    Major NCs: ${data.findings.filter((f:any) => f.status === 'NC_MAJOR').length}
    Minor NCs: ${data.findings.filter((f:any) => f.status === 'NC_MINOR').length}
    OFIs: ${data.findings.filter((f:any) => f.status === 'OFI').length}
    
    LANGUAGE: ${data.lang === 'vi' ? 'Vietnamese' : 'English'}
    
    OUTPUT FORMAT: Plain Text. Concise paragraphs covering:
    1. Overall Compliance Status.
    2. Key Strengths.
    3. Major Areas for Improvement.
    4. Recommendation for Certification (Yes/No/Conditional).
    `;

    try {
        return await executeWithModelCascade(
            model || "gemini-3-pro-preview", // Use Pro for high quality summary
            "Exec Summary",
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e) {
        return "Executive Summary could not be generated.";
    }
};

// Step 2: Format Single Finding (Fast, Preserving Evidence)
export const formatFindingReportSection = async (finding: AnalysisResult, lang: 'en' | 'vi', apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    // If offline or no key, return simple text format
    if (!ai || !navigator.onLine) {
        return `
        CLAUSE: ${finding.clauseId}
        STATUS: ${finding.status}
        FINDING: ${finding.reason}
        EVIDENCE:
        ${finding.evidence}
        `;
    }

    // Lightweight formatting prompt
    // STRICT PRESERVATION INSTRUCTION ADDED
    const prompt = `
    ROLE: Audit Reporter.
    TASK: Format this single audit finding into a final report section.
    LANGUAGE: ${lang === 'vi' ? 'Vietnamese' : 'English'}
    
    INPUT:
    Clause: ${finding.clauseId}
    Status: ${finding.status}
    Observation: "${finding.reason}"
    Evidence Block:
    """
    ${finding.evidence}
    """
    
    RULES:
    1. Polish the 'Observation' to be professional.
    2. CRITICAL: For 'Verified Evidence', print the content of 'Evidence Block' VERBATIM. 
       - DO NOT summarize.
       - DO NOT remove bullets, dashes, or line breaks. 
       - DO NOT reformat list items into paragraphs.
       - Keep it exactly as provided in the block.
    3. Output in Markdown.
    
    OUTPUT TEMPLATE:
    ### Clause ${finding.clauseId} - ${finding.status}
    **Observation:** [Polished Observation]
    **Verified Evidence:**
    [Insert Exact Evidence Block Here]
    `;

    try {
        return await executeWithModelCascade(
            "gemini-2.0-flash", // Use Flash for speed on individual items
            `Report Section ${finding.clauseId}`,
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e) {
        return `### Clause ${finding.clauseId}\nError formatting section. Raw data:\n${finding.reason}\n${finding.evidence}`;
    }
};

// Deprecated Legacy Monolithic Generator (Kept for compatibility if needed)
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
            "gemini-2.0-flash", // Use 2.0 Flash for translation (fast/cheap)
            "Translation",
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e) {
        return text; 
    }
};

// Stub helpers
export const generateMissingDescriptions = async (targets: any[]) => "[]";

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
            "gemini-2.0-flash", 
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
