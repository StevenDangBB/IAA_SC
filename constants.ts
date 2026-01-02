
import { StandardsData, AuditInfo } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

// --- APP CONSTANTS ---
export const APP_VERSION = "3.0.3"; // Bumped version
export const BUILD_TIMESTAMP = "2026-01-02 10:00:00 (GMT+7)"; 
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash-exp"; // Updated to stable experimental or preview
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
// Use process.env.API_KEY which is replaced by Vite.
// We removed the hardcoded fallback key to ensure users define their own valid keys.
export const MY_FIXED_KEYS: string[] = [
    process.env.API_KEY || "", 
].filter(k => k && k.trim() !== ""); 

// OPTIMIZED CASCADE: Highest to Lowest tier
// Using latest available models for stability
export const MODEL_HIERARCHY = [
    "gemini-2.0-flash-exp",           // Newest Flash
    "gemini-1.5-pro",                 // Stable Pro
    "gemini-1.5-flash",               // Stable Flash
    "gemini-2.0-flash-thinking-exp-1219" // Reasoning fallback
];

// UI METADATA FOR MODELS
export const MODEL_META: Record<string, { label: string, color: string, tier: number, desc: string }> = {
    "gemini-2.0-flash-exp": { label: "FLASH 2.0", color: "bg-blue-600 text-white shadow-blue-500/30", tier: 1, desc: "Next Gen Speed & Multimodal" },
    "gemini-1.5-pro": { label: "PRO 1.5", color: "bg-purple-600 text-white shadow-purple-500/30", tier: 2, desc: "High Intelligence Context" },
    "gemini-1.5-flash": { label: "FLASH 1.5", color: "bg-cyan-600 text-white shadow-cyan-500/30", tier: 3, desc: "Fast & Efficient" },
    "gemini-2.0-flash-thinking-exp-1219": { label: "THINK 2.0", color: "bg-emerald-600 text-white shadow-emerald-500/30", tier: 4, desc: "Deep Reasoning" },
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
        version: "3.0.3",
        date: "2026-01-02",
        features: [
            "FIX: Removed invalid fallback API keys causing production errors.",
            "UPDATE: Upgraded default models to Gemini 2.0 Flash series.",
            "CORE: Enhanced API key validation logic."
        ]
    },
    {
        version: "3.0.2",
        date: "2026-01-02",
        features: [
            "HOTFIX: Resolved 'ReferenceError' by reverting to polyfilled process.env architecture.",
            "STABILITY: Improved API Key injection reliability across environments."
        ]
    },
    {
        version: "3.0.1",
        date: "2026-01-02",
        features: [
            "HOTFIX: Resolved API Key injection issue on production builds.",
            "CORE: Migrated environment handling to global constant injection."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images, PDFs & TXT." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." }
];

export const INITIAL_EVIDENCE = "";
