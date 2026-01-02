
import { StandardsData, AuditInfo } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

// --- APP CONSTANTS ---
export const APP_VERSION = "3.0.8"; // Hotfix: Update Model Hierarchy for GenAI SDK
export const BUILD_TIMESTAMP = "2026-01-02 17:45:00 (GMT+7)"; 

// UPDATE TO NEWER MODELS AS PER GUIDELINES
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash-exp"; 
export const DEFAULT_VISION_MODEL = "gemini-2.0-flash-exp"; 

export const DEFAULT_AUDIT_INFO: AuditInfo = { 
    company: "", 
    smo: "", 
    department: "", 
    interviewee: "", 
    auditor: "", 
    type: "" 
};

// --- USER CONFIGURATION: FIXED API KEYS ---
const getEnvApiKey = () => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env.VITE_API_KEY;
        }
    } catch (e) {}
    
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env.API_KEY;
        }
    } catch (e) {}

    return "";
};

const envKey = getEnvApiKey();

export const MY_FIXED_KEYS: string[] = [
    "AIzaSyBDCU4CO1sG1oIWRNpCHUDtc6XE11qrHIc", // Primary Fallback Key
    envKey
].filter(k => k && k.trim() !== ""); 

// OPTIMIZED CASCADE: Prioritize Experimental/Preview models which are active
export const MODEL_HIERARCHY = [
    "gemini-2.0-flash-exp",           // Primary Experimental (High Availability)
    "gemini-3-flash-preview",         // Next Gen Flash
    "gemini-3-pro-preview",           // Next Gen Pro
    "gemini-flash-latest"             // Fallback Alias
];

// UI METADATA FOR MODELS
export const MODEL_META: Record<string, { label: string, color: string, tier: number, desc: string }> = {
    "gemini-2.0-flash-exp": { label: "FLASH 2.0", color: "bg-blue-600 text-white shadow-blue-500/30", tier: 1, desc: "Fast & Multimodal" },
    "gemini-3-flash-preview": { label: "FLASH 3.0", color: "bg-cyan-600 text-white shadow-cyan-500/30", tier: 2, desc: "Next Gen Speed" },
    "gemini-3-pro-preview": { label: "PRO 3.0", color: "bg-purple-600 text-white shadow-purple-500/30", tier: 3, desc: "Complex Reasoning" },
    "gemini-flash-latest": { label: "FLASH LATEST", color: "bg-emerald-600 text-white shadow-emerald-500/30", tier: 4, desc: "Stable Alias" },
};

export const AUDIT_TYPES: Record<string, string> = {
    "Stage 1": "Initial review of documentation and readiness.",
    "Stage 2": "Evaluation of implementation and effectiveness.",
    "Internal": "First-party audit to check own system.",
    "PRE ASSESSMENT": "Gap analysis assessment.",
    "PRE TRANSFER REVIEW": "Check valid certification for transfer.",
    "TRANSITION AUDIT": "Ensure transition to new standard version.",
    "CAV": "Surveillance assessment.",
    "RAV": "Re-assessment of existing certification."
};

export const STANDARDS_DATA: StandardsData = {
    "ISO 9001:2015": ISO9001,
    "ISO 27001:2022": ISO27001,
    "ISO 14001:2015": ISO14001
};

export const RELEASE_NOTES = [
    {
        version: "3.0.8",
        date: "2026-01-02",
        features: [
            "CRITICAL: Updated model list to fix 'Entity Not Found' errors (404).",
            "CORE: Enabled Gemini 2.0 Flash Exp and Gemini 3 Preview models."
        ]
    },
    {
        version: "3.0.7",
        date: "2026-01-02",
        features: [
            "HOTFIX: Hardcoded API Key to bypass missing .env in GitHub Pages.",
            "CONFIG: Forced Gemini 1.5 Flash as primary check model."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images, PDFs & TXT." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." }
];

export const INITIAL_EVIDENCE = "";
