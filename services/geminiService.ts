import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_VISION_MODEL } from "../constants";

// Access API key via process.env.API_KEY as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateOcrContent = async (textPrompt: string, base64Image: string, mimeType: string) => {
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
    return response.text;
};

export const generateAnalysis = async (prompt: string, systemInstruction: string) => {
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
    return response.text;
};

export const generateTextReport = async (prompt: string, systemInstruction: string) => {
    const response = await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
            systemInstruction: systemInstruction
        }
    });
    return response.text;
};

export const generateJsonFromText = async (prompt: string, systemInstruction: string) => {
     const response = await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
             responseMimeType: "application/json"
        }
    });
    return response.text;
}