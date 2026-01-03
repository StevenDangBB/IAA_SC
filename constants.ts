
import { StandardsData, AuditInfo } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

// --- APP CONSTANTS ---
export const APP_VERSION = "3.3.2"; // REFACTOR SNAPSHOT
export const BUILD_TIMESTAMP = "2026-01-03 10:15:00 (GMT+7)"; 

// Use the standard compliant models
export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview"; 
export const DEFAULT_VISION_MODEL = "gemini-3-flash-preview"; // 3.0 Flash supports vision

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

// Production Hierarchy - Updated to 3.0 Series
export const MODEL_HIERARCHY = [
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
    "gemini-2.0-flash-exp" // Fallback to experimental if needed
];

// UI METADATA FOR MODELS
export const MODEL_META: Record<string, { label: string, color: string, tier: number, desc: string }> = {
    "gemini-3-flash-preview": { label: "FLASH 3.0", color: "bg-cyan-600 text-white shadow-cyan-500/30", tier: 1, desc: "Fast & Latest" },
    "gemini-3-pro-preview": { label: "PRO 3.0", color: "bg-purple-600 text-white shadow-purple-500/30", tier: 2, desc: "Complex Reasoning" },
    "gemini-2.0-flash-exp": { label: "FLASH 2.0", color: "bg-amber-600 text-white shadow-amber-500/30", tier: 3, desc: "Experimental" }
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
        version: "3.3.2",
        date: "2026-01-03",
        features: [
            "CORE: Modularized UI Architecture (Split UI.tsx into Primitives, Icons, Loaders).",
            "UX: Improved file upload logic - allows re-uploading the same file after deletion.",
            "UI: Adjusted Clause Reference text alignment to Left for better readability.",
            "DEV: Extracted Modals and Sidebar components for cleaner codebase."
        ]
    },
    {
        version: "3.3.1",
        date: "2026-01-03",
        features: [
            "FIX: Updated model engine to Gemini 3.0 Flash/Pro to resolve API connectivity issues.",
            "FIX: Resolved API Key deletion bug in Settings.",
            "CORE: Enhanced validation logic to detect HTTP Referrer restrictions."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images, PDFs & TXT." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." }
];

export const INITIAL_EVIDENCE = "";
