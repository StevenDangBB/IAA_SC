
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL } from "../constants";

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
    return localStorage.getItem("iso_api_key") || envKey || "";
};

const getAiClient = (overrideKey?: string) => {
    const apiKey = overrideKey || getApiKey();
    if (!apiKey) throw new Error("API Key is missing. Please set it in Settings or configure .env file.");
    return new GoogleGenAI({ apiKey });
};

export const validateApiKey = async (key: string): Promise<{ isValid: boolean, latency: number, errorType?: 'invalid' | 'quota_exceeded' | 'unknown' }> => {
    const start = performance.now();
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        // Perform a lightweight operation to check validity
        await ai.models.countTokens({
            model: DEFAULT_GEMINI_MODEL,
            contents: [{ parts: [{ text: "ping" }] }]
        });
        const end = performance.now();
        return { isValid: true, latency: Math.round(end - start) };
    } catch (error: any) {
        let errorType: 'invalid' | 'quota_exceeded' | 'unknown' = 'unknown';
        const msg = error.message?.toLowerCase() || "";
        
        if (msg.includes("403") || msg.includes("api key not valid")) {
            errorType = 'invalid';
        } else if (msg.includes("429") || msg.includes("quota")) {
            errorType = 'quota_exceeded';
        }

        return { isValid: false, latency: 0, errorType };
    }
};

export const generateOcrContent = async (textPrompt: string, base64Image: string, mimeType: string) => {
    const ai = getAiClient();
    
    const response = await ai.models.generateContent({
        model: DEFAULT_VISION_MODEL,
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

export const generateAnalysis = async (prompt: string, systemInstruction: string) => {
    const ai = getAiClient();

    const response = await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
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

export const generateTextReport = async (prompt: string, systemInstruction: string) => {
    const ai = getAiClient();

    const response = await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
            systemInstruction: systemInstruction
        }
    });
    return response.text || "";
};

export const generateJsonFromText = async (prompt: string, systemInstruction: string) => {
    const ai = getAiClient();

     const response = await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
             responseMimeType: "application/json"
        }
    });
    return response.text || "";
}

export const generateMissingDescriptions = async (clauses: { code: string, title: string }[]) => {
    const ai = getAiClient();
    const prompt = `You are an ISO Lead Auditor. Provide professional, concise (10-15 words) descriptions for these missing ISO clause descriptions:
${JSON.stringify(clauses)}`;
    
    const response = await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
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
