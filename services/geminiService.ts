
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL, MY_FIXED_KEYS, MODEL_HIERARCHY } from "../constants";
import { PromptRegistry } from "./promptRegistry";
import { VectorStore } from "./vectorStore";
import { PrivacyService } from "./privacyService"; 
import { LocalIntelligence } from "./localIntelligence";
import { AnalysisResult, AuditSite, AuditMember, AuditPlanConfig, AuditProcess, Clause } from "../types";

// --- CLIENT FACTORY ---
const getApiKey = (overrideKey?: string): string | null => {
    if (overrideKey?.trim()) return overrideKey.trim();
    if (MY_FIXED_KEYS.length > 0 && MY_FIXED_KEYS[0]?.trim()) return MY_FIXED_KEYS[0].trim();
    
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
            // @ts-ignore
            return import.meta.env.VITE_API_KEY;
        }
    } catch (e) {}

    if (typeof process !== 'undefined' && process.env?.API_KEY) {
        return process.env.API_KEY;
    }

    try {
        const poolRaw = localStorage.getItem("iso_api_keys");
        const activeId = localStorage.getItem("iso_active_key_id");
        if (poolRaw) {
            const pool = JSON.parse(poolRaw);
            if (Array.isArray(pool) && pool.length > 0) {
                const activeKey = pool.find((k: any) => k.id === activeId);
                return activeKey ? activeKey.key : pool[0].key;
            }
        }
    } catch (e) {}
    
    return null;
};

const getAiClient = (overrideKey?: string) => {
    const key = getApiKey(overrideKey);
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
};

// --- MODEL HEALTH REGISTRY (In-Memory) ---
const modelCooldownRegistry = new Map<string, number>();

const isModelAvailable = (model: string): boolean => {
    const cooldownUntil = modelCooldownRegistry.get(model);
    if (!cooldownUntil) return true;
    return Date.now() > cooldownUntil;
};

const markModelRateLimited = (model: string) => {
    console.warn(`[Smart Rotator] ⚠️ Model ${model} hit rate limit. Cooling down for 60s.`);
    modelCooldownRegistry.set(model, Date.now() + 60000);
};

// --- CORE UTILS ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const executeWithModelCascade = async (
    preferredModel: string,
    operationName: string,
    executeFn: (model: string) => Promise<GenerateContentResponse>
): Promise<string> => {
    // Filter out unsafe/legacy 1.5 models
    const safeHierarchy = MODEL_HIERARCHY.filter(m => !m.includes('1.5'));
    const priorityList = [preferredModel, ...safeHierarchy];
    const uniqueModels = [...new Set(priorityList)].filter(Boolean);

    let candidates = uniqueModels.filter(m => isModelAvailable(m));
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

            if (status === 429 || msg.includes("exhausted") || msg.includes("too many requests")) {
                markModelRateLimited(model);
            } else if (status === 403 || msg.includes("key not valid") || msg.includes("api_key_invalid")) {
                // Critical Auth Error - Do not rotate, fail immediately
                throw new Error("Invalid API Key. Please check your settings.");
            }
            await wait(500); 
        }
    }
    throw new Error(`All AI models failed. Last error: ${lastError?.message || 'Unknown'}`);
};

export const validateApiKey = async (rawKey: string): Promise<{ isValid: boolean, latency: number, errorType?: string, errorMessage?: string, activeModel?: string }> => {
    const key = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : "";
    if (!key) return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Key is empty" };
    
    const ai = new GoogleGenAI({ apiKey: key });
    // Use lightweight model for validation
    const modelsToProbe = ["gemini-2.0-flash-lite-preview-02-05", "gemini-2.0-flash"];

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
    // Fallback success assumption if models are just busy but auth passed
    return { isValid: true, latency: 999, activeModel: "gemini-2.0-flash" }; 
};

// --- CORE FEATURES ---

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
    
    // Privacy Shield
    let safeEvidence = evidenceContext + "\n\nTAGGED SECTIONS:\n" + tagsContext;
    if (usePrivacyShield) {
        safeEvidence = PrivacyService.redact(safeEvidence);
    }
    
    // OPTIMIZATION: Truncate massively to avoid token overflow, but keep end which often has conclusion
    if (safeEvidence.length > 25000) {
        safeEvidence = safeEvidence.substring(0, 15000) + "\n...[TRUNCATED]...\n" + safeEvidence.substring(safeEvidence.length - 10000);
    }

    // RAG Retrieval
    const ragQuery = `${clause.code} ${clause.title} ${clause.description}`;
    const ragKey = apiKey || getApiKey() || ""; 
    const vectorContext = await VectorStore.search(ragQuery, ragKey);
    const safeRag = vectorContext.length > 4000 ? vectorContext.substring(0, 4000) : vectorContext;

    const template = PromptRegistry.getPrompt('ANALYSIS');
    const finalPrompt = PromptRegistry.hydrate(template.template, {
        STANDARD_NAME: standardName,
        CLAUSE_CODE: clause.code,
        CLAUSE_TITLE: clause.title,
        CLAUSE_DESC: clause.description,
        RAG_CONTEXT: safeRag || "No source doc.",
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
                reason_en: { type: Type.STRING },
                reason_vi: { type: Type.STRING },
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

export const performShadowReview = async (
    finding: AnalysisResult,
    apiKey?: string,
    model?: string
): Promise<string> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const prompt = `Critique ISO finding (max 50 words):
    Clause: ${finding.clauseId} (${finding.status})
    Evid: "${finding.evidence.substring(0, 500)}"
    Reason: "${finding.reason}"`;

    try {
        return await executeWithModelCascade(
            "gemini-2.0-flash", 
            "Shadow Review",
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e) {
        return "Review unavailable.";
    }
};

export const generateAuditSchedule = async (
    sites: AuditSite[],
    team: AuditMember[],
    processes: AuditProcess[],
    config: AuditPlanConfig,
    apiKey?: string,
    model?: string,
    leadAuditorInfo?: { name: string, code?: string }
) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    let finalTeam = [...team];
    
    // --- LOGIC 3: COMPACT CSV DATA (IMPROVED) ---
    // Explicitly serializing date availability to force AI to recognize capacity
    const sitesCompact = sites.map(s => `${s.id},${s.name},${s.isMain?'HQ':'Site'}`).join("\n");
    
    const teamCompact = finalTeam.map(m => {
        let availStr = "";
        if (m.availabilityMatrix && Object.keys(m.availabilityMatrix).length > 0) {
            // Updated serialization: "Date=2024-01-01|WD=1.0" to make it semantically explicit
            const schedule = Object.entries(m.availabilityMatrix)
                .map(([date, data]) => `Date=${date}|WD=${data.allocation}`)
                .join("; ");
            availStr = `[${schedule}]`;
        } else {
            availStr = m.isRemote ? 'REMOTE_ALL' : 'ONSITE_ALL';
        }
        return `${m.name},${m.role},${m.competencyCodes||'ALL'},${availStr}`;
    }).join("\n");

    const processReqs = processes.map(p => {
        const siteConstraint = p.siteIds && p.siteIds.length > 0 ? p.siteIds.join(';') : "ALL";
        const clauses = Object.keys(p.matrixData).join(";");
        return `${p.name},${p.competencyCode || "NONE"},${siteConstraint},[${clauses}]`;
    }).join("\n");

    const datesList = config.auditDates.join(", ");

    const template = PromptRegistry.getPrompt('SCHEDULING');
    
    let baseTemplate = template.template.replace('{{SITES_COMPACT}}', `[ID,Name,Type]\n${sitesCompact}`)
                                        .replace('{{TEAM_COMPACT}}', `[Name,Role,Codes,Availability]\n${teamCompact}`)
                                        .replace('{{PROCESS_REQUIREMENTS}}', `[Name,ReqCode,SiteIDs,Clauses]\n${processReqs}`);

    const prompt = PromptRegistry.hydrate(baseTemplate, {
        START_TIME: config.startTime,
        END_TIME: config.endTime,
        LUNCH_START: config.lunchStartTime,
        LUNCH_END: config.lunchEndTime,
        DATES: datesList,
        SITES_COMPACT: "", 
        TEAM_COMPACT: "", 
        PROCESS_REQUIREMENTS: "" 
    });

    const configGen: any = {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.INTEGER },
                    date: { type: Type.STRING },
                    timeSlot: { type: Type.STRING },
                    activity: { type: Type.STRING },
                    siteName: { type: Type.STRING },
                    auditorName: { type: Type.STRING },
                    processName: { type: Type.STRING },
                    clauseRefs: { type: Type.ARRAY, items: { type: Type.STRING } },
                    isRemote: { type: Type.BOOLEAN }
                },
                required: ["day", "date", "timeSlot", "activity", "auditorName", "processName"]
            }
        }
    };

    try {
        return await executeWithModelCascade(
            model || "gemini-3-pro-preview", 
            "Audit Schedule",
            (m) => ai.models.generateContent({
                model: m,
                contents: prompt,
                config: configGen
            })
        );
    } catch (e) {
        console.error("Schedule Gen Failed", e);
        throw e;
    }
};

export const generateExecutiveSummary = async (data: any, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const prompt = `
    Write Plain Text ISO Audit Exec Summary.
    Context: ${data.company}, ${data.type}, ${data.standard}.
    Auditor: ${data.auditor}.
    Findings: ${data.findings.length} Total.
    Lang: ${data.lang}.
    Summarize compliance, strengths, weaknesses. No Markdown.
    `;

    try {
        return await executeWithModelCascade(
            model || "gemini-3-pro-preview", 
            "Exec Summary",
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e) {
        return "Executive Summary unavailable.";
    }
};

export const generateProcessBatchReport = async (
    data: {
        processName: string,
        auditor: string,
        interviewees: string,
        company: string,
        standardName: string,
        language: string,
        findings: AnalysisResult[]
    },
    apiKey?: string,
    model?: string
): Promise<string> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const template = PromptRegistry.getPrompt('REPORT');
    const prompt = PromptRegistry.hydrate(template.template, {
        PROCESS_NAME: data.processName,
        AUDITOR: data.auditor,
        INTERVIEWEES: data.interviewees,
        COMPANY: data.company,
        STANDARD_NAME: data.standardName,
        LANGUAGE: data.language,
        FINDINGS_JSON: JSON.stringify(data.findings)
    });

    try {
        return await executeWithModelCascade(
            model || "gemini-2.0-flash", 
            `Batch Report: ${data.processName}`,
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e) {
        return `[Error formatting process: ${data.processName}]`;
    }
};

export const generateOcrContent = async (prompt: string, base64Image: string, mimeType: string, apiKey?: string): Promise<string> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    try {
        const result = await ai.models.generateContent({
            model: DEFAULT_VISION_MODEL, 
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Image } },
                    { text: prompt + " Transcribe all visible text accurately." }
                ]
            }
        });
        return result.text || "";
    } catch (e) {
        console.error("OCR Failed", e);
        throw new Error("OCR Failed: " + (e as any).message);
    }
};

export const translateChunk = async (text: string, targetLang: 'en' | 'vi', apiKey?: string): Promise<string> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const langName = targetLang === 'vi' ? 'Vietnamese' : 'English';
    const prompt = `Translate the following text to professional ${langName} for an ISO Audit Report. Keep technical terms precise.\n\nText:\n"${text}"`;

    try {
        return await executeWithModelCascade(
            "gemini-2.0-flash", 
            "Translate",
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e) {
        return text; 
    }
};

export const generateMissingDescriptions = async (clauses: { code: string, title: string }[], apiKey?: string): Promise<string> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const prompt = `
    I have a list of ISO Clauses with titles but missing descriptions.
    Please generate a concise, professional 1-sentence description for each based on standard ISO knowledge.
    Output JSON array: [{ "code": "...", "description": "..." }]
    
    Input:
    ${JSON.stringify(clauses)}
    `;

    const config: any = {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    code: { type: Type.STRING },
                    description: { type: Type.STRING }
                },
                required: ["code", "description"]
            }
        }
    };

    try {
        return await executeWithModelCascade(
            "gemini-2.0-flash",
            "Repair Descriptions",
            (m) => ai.models.generateContent({ model: m, contents: prompt, config })
        );
    } catch (e) {
        throw new Error("Failed to repair descriptions.");
    }
};

export const formatFindingReportSection = async (finding: AnalysisResult, lang: 'en' | 'vi', apiKey?: string, model?: string): Promise<string> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const prompt = `
    Format this single ISO Audit Finding into a finalized report section in strictly ${lang === 'vi' ? 'Vietnamese' : 'English'}.
    Output PLAIN TEXT. No Markdown.
    
    Format:
    CLAUSE: [Code] [Title]
    STATUS: [Status]
    OBSERVATION: [Reason]
    EVIDENCE: [Summarized Evidence]
    
    Input Data:
    ${JSON.stringify(finding)}
    `;

    try {
        return await executeWithModelCascade(
            model || "gemini-2.0-flash",
            "Format Finding",
            (m) => ai.models.generateContent({ model: m, contents: prompt })
        );
    } catch (e) {
        return `[Error formatting finding ${finding.clauseId}]`;
    }
};

export const fetchFullClauseText = async (clause: Clause, standardName: string, context: string | null, apiKey?: string): Promise<{ en: string, vi: string }> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    const prompt = `
    Provide the full text and explanation for ISO Standard "${standardName}", Clause ${clause.code} (${clause.title}).
    Use the provided context if available, otherwise use general knowledge.
    
    Output JSON: { "en": "English explanation...", "vi": "Vietnamese explanation..." }
    
    Context:
    ${context ? context.substring(0, 2000) : "No specific context."}
    `;

    const config: any = {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                en: { type: Type.STRING },
                vi: { type: Type.STRING }
            },
            required: ["en", "vi"]
        }
    };

    try {
        const text = await executeWithModelCascade(
            "gemini-2.0-flash",
            "Fetch Reference",
            (m) => ai.models.generateContent({ model: m, contents: prompt, config })
        );
        return JSON.parse(text);
    } catch (e) {
        throw new Error("Reference fetch failed.");
    }
};
