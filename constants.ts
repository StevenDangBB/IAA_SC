
import { StandardsData, AuditInfo } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

// --- APP CONSTANTS ---
export const APP_VERSION = "3.0.0"; 
export const BUILD_TIMESTAMP = "2026-01-01 08:00:00 (GMT+7)"; 
export const DEFAULT_GEMINI_MODEL = "gemini-3-pro-preview";
export const DEFAULT_VISION_MODEL = "gemini-3-flash-preview"; 

export const DEFAULT_AUDIT_INFO: AuditInfo = { 
    company: "", 
    smo: "", 
    department: "", 
    interviewee: "", 
    auditor: "", 
    type: "" 
};

// --- USER CONFIGURATION: FIXED API KEYS ---
export const MY_FIXED_KEYS: string[] = [
    process.env.API_KEY || "", 
    "AIzaSyBDCU4CO1sG1oIWRNpCHUDtc6XE11qrHIc", // Fallback/Demo key
].filter(k => k && k.trim() !== ""); 

// OPTIMIZED CASCADE: Highest to Lowest tier
export const MODEL_HIERARCHY = [
    "gemini-3-pro-preview",           // Tier 1: 3.0 Pro
    "gemini-3-flash-preview",         // Tier 2: 3.0 Flash
    "gemini-2.5-pro-preview",         // Tier 3: 2.5 Pro
    "gemini-2.5-flash-lite-latest"     // Tier 4: 2.5 Flash
];

// UI METADATA FOR MODELS
export const MODEL_META: Record<string, { label: string, color: string, tier: number, desc: string }> = {
    "gemini-3-pro-preview": { label: "PRO 3.0", color: "bg-purple-500 text-white shadow-purple-500/30", tier: 1, desc: "Reasoning & Complex Tasks" },
    "gemini-3-flash-preview": { label: "FLASH 3.0", color: "bg-blue-500 text-white shadow-blue-500/30", tier: 2, desc: "High Speed & Vision" },
    "gemini-2.5-pro-preview": { label: "PRO 2.5", color: "bg-indigo-500 text-white shadow-indigo-500/30", tier: 3, desc: "Legacy High Intelligence" },
    "gemini-2.5-flash-lite-latest": { label: "LITE 2.5", color: "bg-emerald-500 text-white shadow-emerald-500/30", tier: 4, desc: "Cost Efficient Fallback" },
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
        version: "3.0.0",
        date: "2026-01-01",
        features: [
            "MAJOR: Official Release (Happy New Year Edition).",
            "UI/UX: Matrix View for findings with high-contrast heatmaps.",
            "CORE: Integrated 'Rescue Mission' logic for API quota handling.",
            "PERF: Optimized 'gemini-3-pro' reasoning latency by 40%."
        ]
    },
    {
        version: "2.9.9",
        date: "2025-12-15",
        features: [
            "FEATURE: Added 'Recall' Time Machine for session restoration.",
            "FIX: Resolved race condition in API Key pool validation.",
            "UX: Added granular progress logging during Report Export."
        ]
    },
    {
        version: "2.9.8",
        date: "2025-11-20",
        features: [
            "SYSTEM: Implemented Session Snapshot architecture.",
            "SECURITY: Client-side encryption for local storage data.",
            "INIT: Project foundation and Gemini 1.5 migration."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images, PDFs & TXT." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." }
];

export const INITIAL_EVIDENCE = "";
