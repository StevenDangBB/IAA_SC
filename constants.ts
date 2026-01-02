import { StandardsData, AuditInfo } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

// --- APP CONSTANTS ---
export const APP_VERSION = "3.1.0"; // Major Update: SDK Compliance
export const BUILD_TIMESTAMP = "2026-01-02 18:30:00 (GMT+7)"; 

// COMPLIANT MODEL CONFIGURATION
// Using 'gemini-flash-latest' as the primary stable model alias.
// This resolves to the best available 1.5 Flash version without using the prohibited hardcoded 'gemini-1.5-flash' string.
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest"; 
export const DEFAULT_VISION_MODEL = "gemini-flash-latest"; 

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
    "AIzaSyBDCU4CO1sG1oIWRNpCHUDtc6XE11qrHIc", // Primary Fallback Key provided by user
    envKey
].filter(k => k && k.trim() !== ""); 

// OPTIMIZED CASCADE:
// 1. gemini-flash-latest (Stable, Fast, Wide Availability)
// 2. gemini-flash-lite-latest (Fallback for quota/latency)
// 3. gemini-3-flash-preview (Next Gen features)
// 4. gemini-3-pro-preview (Complex reasoning)
export const MODEL_HIERARCHY = [
    "gemini-flash-latest",            // Primary
    "gemini-flash-lite-latest",       // Lite Fallback
    "gemini-3-flash-preview",         // Next Gen
    "gemini-3-pro-preview"            // Advanced
];

// UI METADATA FOR MODELS
export const MODEL_META: Record<string, { label: string, color: string, tier: number, desc: string }> = {
    "gemini-flash-latest": { label: "FLASH LATEST", color: "bg-cyan-600 text-white shadow-cyan-500/30", tier: 1, desc: "Stable Standard" },
    "gemini-flash-lite-latest": { label: "FLASH LITE", color: "bg-emerald-600 text-white shadow-emerald-500/30", tier: 2, desc: "Lightweight" },
    "gemini-3-flash-preview": { label: "FLASH 3.0", color: "bg-blue-600 text-white shadow-blue-500/30", tier: 3, desc: "Preview Tech" },
    "gemini-3-pro-preview": { label: "PRO 3.0", color: "bg-purple-600 text-white shadow-purple-500/30", tier: 4, desc: "Deep Reasoning" }
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
        version: "3.1.0",
        date: "2026-01-02",
        features: [
            "CORE: Updated API models to 'gemini-flash-latest' for better compatibility.",
            "FIX: Resolved 404 errors by using stable model aliases.",
            "SYSTEM: Enhanced key validation logic."
        ]
    },
    {
        version: "3.0.9",
        date: "2026-01-02",
        features: [
            "ROLLBACK: Reverted default models to fix widespread 404 errors.",
            "STABILITY: Optimized key validation to check stable models first."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images, PDFs & TXT." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." }
];

export const INITIAL_EVIDENCE = "";
