
import { StandardsData, AuditInfo } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

// --- APP CONSTANTS ---
export const APP_VERSION = "3.1.3"; // Unlock Edition
export const BUILD_TIMESTAMP = "2026-01-02 21:00:00 (GMT+7)"; 

// FORCE GENERIC STABLE MODEL
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
    "AIzaSyBDCU4CO1sG1oIWRNpCHUDtc6XE11qrHIc", // User Key
    envKey
].filter(k => k && k.trim() !== ""); 

export const MODEL_HIERARCHY = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.0-pro"
];

// UI METADATA FOR MODELS
export const MODEL_META: Record<string, { label: string, color: string, tier: number, desc: string }> = {
    "gemini-1.5-flash": { label: "FLASH 1.5", color: "bg-cyan-600 text-white shadow-cyan-500/30", tier: 1, desc: "Standard Stable" },
    "gemini-1.5-pro": { label: "PRO 1.5", color: "bg-purple-600 text-white shadow-purple-500/30", tier: 2, desc: "Complex Tasks" },
    "gemini-1.0-pro": { label: "PRO 1.0", color: "bg-slate-600 text-white shadow-slate-500/30", tier: 3, desc: "Legacy Compatible" }
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
        version: "3.1.3",
        date: "2026-01-02",
        features: [
            "UNLOCK: Bypassed strict API Key validation to allow entry.",
            "CORE: Forced 'gemini-1.5-flash' for maximum compatibility."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images, PDFs & TXT." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." }
];

export const INITIAL_EVIDENCE = "";
