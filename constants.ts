import { StandardsData, AuditInfo } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

// --- APP CONSTANTS ---
export const APP_VERSION = "3.1.1"; // Final Fix: Stable Version Hardcoding
export const BUILD_TIMESTAMP = "2026-01-02 19:00:00 (GMT+7)"; 

// FINAL FIX: USE SPECIFIC STABLE VERSIONS
// Aliases like 'gemini-flash-latest' or 'gemini-1.5-flash' are resolving incorrectly for some keys.
// Using 'gemini-1.5-flash-002' guarantees access to the specific, stable production model.
export const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash-002"; 
export const DEFAULT_VISION_MODEL = "gemini-1.5-flash-002"; 

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

// OPTIMIZED CASCADE:
// Prioritize Specific Versions -> Then Generic Aliases -> Then Experimental
export const MODEL_HIERARCHY = [
    "gemini-1.5-flash-002",       // Production Stable (Primary)
    "gemini-1.5-pro-002",         // High Intelligence Stable
    "gemini-1.5-flash",           // Generic Fallback
    "gemini-2.0-flash-exp"        // Experimental
];

// UI METADATA FOR MODELS
export const MODEL_META: Record<string, { label: string, color: string, tier: number, desc: string }> = {
    "gemini-1.5-flash-002": { label: "FLASH V1.5-002", color: "bg-cyan-600 text-white shadow-cyan-500/30", tier: 1, desc: "Production Stable" },
    "gemini-1.5-pro-002": { label: "PRO V1.5-002", color: "bg-purple-600 text-white shadow-purple-500/30", tier: 2, desc: "Complex Reasoning" },
    "gemini-1.5-flash": { label: "FLASH GENERIC", color: "bg-emerald-600 text-white shadow-emerald-500/30", tier: 3, desc: "General Access" },
    "gemini-2.0-flash-exp": { label: "FLASH 2.0 EXP", color: "bg-blue-600 text-white shadow-blue-500/30", tier: 4, desc: "Experimental" }
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
        version: "3.1.1",
        date: "2026-01-02",
        features: [
            "FIX: Hardcoded 'gemini-1.5-flash-002' to resolve 404 Entity Not Found errors.",
            "STABILITY: Bypassed model alias resolution for legacy keys."
        ]
    },
    {
        version: "3.1.0",
        date: "2026-01-02",
        features: [
            "CORE: Updated API models to 'gemini-flash-latest' for better compatibility.",
            "FIX: Resolved 404 errors by using stable model aliases.",
            "SYSTEM: Enhanced key validation logic."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images, PDFs & TXT." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." }
];

export const INITIAL_EVIDENCE = "";
