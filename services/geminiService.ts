
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL, MODEL_HIERARCHY, MY_FIXED_KEYS } from "../constants";
import { cleanAndParseJSON } from "../utils";
import { Standard } from "../types";

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

// --- ROBUST VALIDATION WITH MODEL PROBING ---
export const validateApiKey = async (rawKey: string, preferredModel?: string): Promise<{ isValid: boolean, latency: number, errorType?: 'invalid' | 'quota_exceeded' | 'network_error' | 'referrer_error' | 'unknown', errorMessage?: string, activeModel?: string }> => {
    const key = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : "";

    if (!key) {
        return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Key is empty" };
    }

    const ai = new GoogleGenAI({ apiKey: key });
    
    // Probe models in order of preference (Fastest/Cheapest first)
    const probeModels = [...MODEL_HIERARCHY];
    if (preferredModel && !probeModels.includes(preferredModel)) {
        probeModels.unshift(preferredModel);
    }

    let lastError: any = null;

    for (const model of probeModels) {
        const start = performance.now();
        try {
            // Minimal token request
            await ai.models.generateContent({
                model: model,
                contents: { parts: [{ text: "Hi" }] }, 
            });
            const end = performance.now();
            
            // If success, return immediately
            return { isValid: true, latency: Math.round(end - start), activeModel: model };
            
        } catch (error: any) {
            lastError = error;
            const msg = (error.message || "").toLowerCase();
            const status = error.status || 0;
            
            // Log full error for debugging in console
            console.error(`[Gemini Probe] ${model} failed:`, error);
            
            // If it's a model-not-found (404), we continue to the next model.
            if (status === 404 || msg.includes("not found")) {
                continue;
            }

            // API Key Invalid or Permissions Issue
            if (msg.includes("key not valid") || status === 400 || msg.includes("invalid argument") || msg.includes("api_key")) {
                return { isValid: false, latency: 0, errorType: 'invalid', errorMessage: "Invalid API Key" };
            }
            
            if (status === 429 || msg.includes("quota") || msg.includes("exhausted")) {
                return { isValid: false, latency: 0, errorType: 'quota_exceeded', errorMessage: "Quota Exceeded" };
            }

            if (status === 403 || msg.includes("permission denied") || msg.includes("referrer")) {
                 // Try to extract more specific info if possible, otherwise generic guidance
                 let userHint = "Access Denied (403).";
                 if (msg.includes("generative language api has not been used")) {
                     userHint = "Error: 'Generative Language API' is NOT ENABLED in Google Cloud Console.";
                 } else if (msg.includes("referer")) {
                     userHint = "Error: Referrer blocked. Check Website Restrictions in Console.";
                 }
                 
                 return { 
                     isValid: false, 
                     latency: 0, 
                     errorType: 'referrer_error', 
                     errorMessage: userHint 
                 };
            }
        }
    }

    // If we get here, all probes failed. Return the last relevant error.
    const msg = (lastError?.message || "").toLowerCase();
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
         return { isValid: false, latency: 0, errorType: 'network_error', errorMessage: "Network/CORS Blocked" };
    }

    return { isValid: false, latency: 0, errorType: 'unknown', errorMessage: msg.substring(0, 100) || "All models failed" };
};

// ... (Rest of the file remains unchanged - fetchFullClauseText, etc.)
export const fetchFullClauseText = async (clause: { code: string, title: string }, standardName: string, contextData: string | null, apiKey?: string, model?: string): Promise<{ en: string; vi: string }> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    // If we have a lot of context (PDF loaded), prioritize PRO model for larger context window if not specified
    const targetModel = model || (contextData && contextData.length > 50000 ? "gemini-3-pro-preview" : DEFAULT_GEMINI_MODEL);
    
    let prompt = "";

    if (contextData) {
        // --- RAG MODE (WITH UPLOADED SOURCE) ---
        prompt = `You are a precision extraction engine.
        
        TASK: Extract the EXACT VERBATIM text for the clause below from the PROVIDED SOURCE DOCUMENT.
        
        TARGET CLAUSE: [${clause.code}] ${clause.title}
        
        SOURCE DOCUMENT (START):
        """
        ${contextData.substring(0, 700000)} 
        """
        SOURCE DOCUMENT (END)
        
        INSTRUCTIONS:
        1. Find the section in the SOURCE DOCUMENT matching the clause code and title.
        2. Return the EXACT content of that section word-for-word.
        3. Do NOT summarize, do NOT paraphrase.
        4. Maintain all lists, numbering, and structure using newlines (\\n).
        
        Output Format: JSON ONLY.
        Structure: {
            "en": "Exact extracted text from source...", 
            "vi": "High-quality Vietnamese translation of the extracted text..."
        }`;
    } else {
        // --- GENERATIVE MODE (FALLBACK) ---
        prompt = `You are an ISO Standard Database. 
        Task: Provide the EXACT verbatim text for the clause below.
        Standard: ${standardName}
        Clause: [${clause.code}] ${clause.title}
        
        IMPORTANT FORMATTING RULES:
        1. Preserve all original structure (paragraphs, lists, sub-points).
        2. Use explicit newline characters (\\n) to separate paragraphs and list items.
        3. Use bullet points (-) or numbering (a, b, c) exactly as in the standard.
        4. Do NOT output a single continuous block of text.
        
        Output Format: JSON ONLY.
        Structure: {
            "en": "Full English Text with preserved formatting...", 
            "vi": "Full Vietnamese Text Translation with preserved formatting..."
        }`;
    }
    
    const config: any = { responseMimeType: "application/json" };

    try {
        const response = await ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config
        });
        
        const parsed = cleanAndParseJSON(response.text || "{}");
        return { 
            en: parsed?.en || (contextData ? "Could not find clause in provided document." : "Content unavailable via AI."), 
            vi: parsed?.vi || (contextData ? "Không tìm thấy điều khoản trong tài liệu cung cấp." : "Nội dung không khả dụng qua AI.") 
        };
    } catch (e) {
        console.error("Fetch Clause Error:", e);
        throw e;
    }
};

// --- NEW FEATURE: PARSE STANDARD STRUCTURE ---
export const parseStandardStructure = async (rawText: string, standardName: string, apiKey?: string, model?: string): Promise<Standard | null> => {
    const ai = getAiClient(apiKey);
    if (!ai) throw new Error("API Key missing");

    // Use Pro model for complex structural analysis and large context
    const targetModel = model || "gemini-3-pro-preview";

    const prompt = `
    You are an ISO Standard Architect.
    TASK: Analyze the provided raw text of a standard and extract its hierarchical structure into a strictly typed JSON object.

    Standard Name: ${standardName}

    RAW TEXT START:
    """
    ${rawText.substring(0, 500000)}
    """
    RAW TEXT END

    INSTRUCTIONS:
    1. Identify the main "Groups" (usually high-level chapters like Context, Leadership, Planning, Support, Operation, Performance Evaluation, Improvement).
    2. Identify "Clauses" within those groups (e.g., 4.1, 4.2).
    3. Identify "SubClauses" if they exist and are important (e.g., 8.1.1).
    4. Generate a 'description' for each clause: a concise summary (10-20 words) of what the clause requires.
    5. Assign appropriate icons for Groups from this list: "FileShield" (Context/Policy), "LayoutList" (Planning/Support), "Cpu" (Operation), "CheckThick" (Check/Act), "Lock" (Security), "Users" (People).

    OUTPUT SCHEMA (JSON ONLY):
    {
      "name": "${standardName}",
      "description": "Auto-generated from source file",
      "groups": [
        {
          "id": "GRP_X",
          "title": "Title of the group (e.g., 4. Context)",
          "icon": "FileShield",
          "clauses": [
            {
              "id": "CL_X.Y",
              "code": "X.Y",
              "title": "Title of Clause",
              "description": "Summary of requirement...",
              "subClauses": [] // Optional
            }
          ]
        }
      ]
    }
    `;

    const config: any = { responseMimeType: "application/json" };

    try {
        const response = await ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config
        });
        const parsed = cleanAndParseJSON(response.text || "{}");
        if (parsed && parsed.groups && Array.isArray(parsed.groups)) {
            return parsed as Standard;
        }
        return null;
    } catch (e: any) {
        console.error("Structure Parsing Error:", e);
        throw new Error(e.message || "Failed to structure standard");
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

    const config: any = { 
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
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
        }
    };
    
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
    
    const config: any = { responseMimeType: "application/json" };

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
