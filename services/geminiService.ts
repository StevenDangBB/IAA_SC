
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL } from "../constants";
import { Clause } from "../types";
import { cleanAndParseJSON } from "../utils";

const getApiKey = () => {
    // Safely check for process.env to prevent "ReferenceError: process is not defined" in browser
    let envKey = "";
    try {
        if (typeof process !== "undefined" && process.env) {
            envKey = process.env.API_KEY || "";
        }
    } catch (e) {
        // Ignore error if process is accessed in strict mode or undefined
    }
    // FIX: Per @google/genai guidelines, prioritize environment variable for API key.
    return envKey || localStorage.getItem("iso_api_key") || "";
};

const getAiClient = (overrideKey?: string) => {
    const apiKey = overrideKey || getApiKey();
    if (!apiKey) throw new Error("API Key is missing. Please set it in Settings or configure .env file.");
    return new GoogleGenAI({ apiKey });
};

export const validateApiKey = async (key: string, modelId: string = DEFAULT_GEMINI_MODEL): Promise<{ isValid: boolean, latency: number, errorType?: 'invalid' | 'quota_exceeded' | 'unknown' }> => {
    const start = performance.now();
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        
        // CRITICAL FIX: Use generateContent instead of countTokens.
        // Reason: Google often allows countTokens even when the generation quota (RPM/TPM) is exceeded.
        // Generating a single token ensures the key is truly capable of processing the request.
        await ai.models.generateContent({
            model: modelId,
            contents: "Test",
            config: {
                maxOutputTokens: 1, // Minimize latency and cost
                // FIX: Per @google/genai guidelines, set thinkingBudget to 0 when using a small maxOutputTokens
                // to prevent all tokens from being consumed by "thinking", which would cause the validation to fail.
                thinkingConfig: { thinkingBudget: 0 },
            }
        });

        const end = performance.now();
        return { isValid: true, latency: Math.round(end - start) };
    } catch (error: any) {
        let errorType: 'invalid' | 'quota_exceeded' | 'unknown' = 'unknown';
        const msg = error.message?.toLowerCase() || "";
        
        if (msg.includes("403") || msg.includes("api key not valid") || msg.includes("permission denied")) {
            errorType = 'invalid';
        } else if (msg.includes("429") || msg.includes("quota") || msg.includes("resource exhausted")) {
            errorType = 'quota_exceeded';
        }

        return { isValid: false, latency: 0, errorType };
    }
};

export const fetchFullClauseText = async (clause: { code: string, title: string }, standardName: string, apiKey?: string, model?: string): Promise<{ en: string, vi: string }> => {
    const ai = getAiClient(apiKey);
    const prompt = `You are an expert ISO standards repository. Provide the full, verbatim, original text for the following clause in two languages: English and Vietnamese.

- Standard: ${standardName}
- Clause Code: ${clause.code}
- Clause Title: ${clause.title}

Output ONLY a valid JSON object with two keys: "en" for the English text, and "vi" for the Vietnamese text. Do not add any conversational filler or markdown formatting.
Crucially, preserve all original formatting, including line breaks (using '\\n'), within the JSON string values for maximum readability.`;
    
    const response = await ai.models.generateContent({
        model: model || DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
            systemInstruction: "You are a helpful assistant that provides precise, verbatim text from official standards in a bilingual JSON format, preserving all original formatting and line breaks for readability.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    en: { type: Type.STRING, description: "The full, original clause text in English, with original formatting and line breaks preserved." },
                    vi: { type: Type.STRING, description: "The full, original clause text translated into Vietnamese, with original formatting and line breaks preserved." }
                },
                required: ["en", "vi"]
            }
        }
    });

    const parsed = cleanAndParseJSON(response.text || "{}");
    
    return {
        en: parsed?.en || "AI could not retrieve the English text.",
        vi: parsed?.vi || "AI không thể truy xuất văn bản tiếng Việt."
    };
};

export const generateOcrContent = async (textPrompt: string, base64Image: string, mimeType: string, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    
    const response = await ai.models.generateContent({
        model: model || DEFAULT_VISION_MODEL,
        contents: {
            parts: [
                { text: textPrompt },
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Image
                    }
                }
            ]
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
            systemInstruction: systemInstruction,
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
                    },
                    propertyOrdering: ["clauseId", "status", "reason", "suggestion", "evidence", "conclusion_report"]
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
        config: {
            systemInstruction: systemInstruction
        }
    });
    return response.text || "";
};

export const generateJsonFromText = async (prompt: string, systemInstruction: string, apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);

     const response = await ai.models.generateContent({
        model: model || DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
             responseMimeType: "application/json"
        }
    });
    return response.text || "";
}

export const generateMissingDescriptions = async (clauses: { code: string, title: string }[], apiKey?: string, model?: string) => {
    const ai = getAiClient(apiKey);
    const prompt = `You are an ISO Lead Auditor. Provide professional, concise (10-15 words) descriptions for these missing ISO clause descriptions:
${JSON.stringify(clauses)}`;
    
    const response = await ai.models.generateContent({
        model: model || DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
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
        }
    });
    return response.text || "[]";
};
