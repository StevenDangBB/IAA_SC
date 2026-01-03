
import { StandardsData, AuditInfo } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

// --- APP CONSTANTS ---
export const APP_VERSION = "3.3.4"; 
export const BUILD_TIMESTAMP = "2026-01-03 11:30:00 (GMT+7)"; 

// CHANGE: Default to 1.5 Flash (GA) instead of 3.0 (Preview) to avoid 403 errors on some projects
export const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash"; 
export const DEFAULT_VISION_MODEL = "gemini-1.5-flash"; 

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
    envKey 
].filter(k => k && k.trim() !== ""); 

// CHANGE: Reordered hierarchy to try stable models first
export const MODEL_HIERARCHY = [
    "gemini-1.5-flash", // PRIMARY (Most stable, Free Tier)
    "gemini-3-flash-preview", // SECONDARY (Newer features, but risk of 403)
    "gemini-3-pro-preview",
    "gemini-2.0-flash-exp" 
];

// UI METADATA FOR MODELS
export const MODEL_META: Record<string, { label: string, color: string, tier: number, desc: string }> = {
    "gemini-3-flash-preview": { label: "FLASH 3.0", color: "bg-cyan-600 text-white shadow-cyan-500/30", tier: 1, desc: "Latest Preview" },
    "gemini-3-pro-preview": { label: "PRO 3.0", color: "bg-purple-600 text-white shadow-purple-500/30", tier: 2, desc: "Complex Reasoning" },
    "gemini-2.0-flash-exp": { label: "FLASH 2.0", color: "bg-amber-600 text-white shadow-amber-500/30", tier: 3, desc: "Experimental" },
    "gemini-1.5-flash": { label: "FLASH 1.5", color: "bg-emerald-600 text-white shadow-emerald-500/30", tier: 1, desc: "Stable Production" }
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
        version: "3.3.4",
        date: "2026-01-03",
        features: [
            "HOTFIX: Switched default engine to Gemini 1.5 Flash to resolve 403 Permission errors.",
            "CORE: Improved connection probing to auto-switch models if access is denied.",
            "UX: Updated error messages with specific troubleshooting steps for API restrictions."
        ]
    },
    {
        version: "3.3.3",
        date: "2026-01-03",
        features: [
            "FIX: Critical API Connection Fix for Public Environments (GitHub Pages).",
            "CORE: Updated Referrer Policy to 'no-referrer-when-downgrade' to allow proper key validation.",
            "CORE: Added Gemini 1.5 Flash as a high-reliability fallback model.",
            "UX: Improved error messaging for API Key restrictions."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images, PDFs & TXT." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." }
];

export const INITIAL_EVIDENCE = "";
