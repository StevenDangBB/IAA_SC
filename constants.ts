
import { StandardsData, AuditInfo } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

// --- APP CONSTANTS ---
export const APP_VERSION = "5.1.0-SMART-ROUTING"; 
export const BUILD_TIMESTAMP = "2026-03-01 12:00:00 (GMT+7)"; 

// CHANGE: Default fallback model.
export const DEFAULT_GEMINI_MODEL = "gemini-3-pro-preview"; 
export const DEFAULT_VISION_MODEL = "gemini-2.5-flash-image"; 

export const DEFAULT_AUDIT_INFO: AuditInfo = { 
    company: "", 
    smo: "", 
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
    envKey,
    "AIzaSyC_yJCcSrU5eiKm_0MmMq1vwK-xyB72i4U" 
].filter(k => k && k.trim() !== ""); 

// --- INTELLIGENT MODEL HIERARCHY ---
// The system will try these in order. If one hits Quota Limit (429), it moves to the next.
export const MODEL_HIERARCHY = [
    "gemini-3-pro-preview",                 // 1. High Intelligence (Reasoning)
    "gemini-2.0-flash",                     // 2. High Speed & Stability (Standard)
    "gemini-2.0-flash-lite-preview-02-05", // 3. Maximum Quota (Emergency Fallback)
    "gemini-3-flash-preview"                // 4. Cutting Edge Speed (Experimental)
];

// UI METADATA FOR MODELS
export const MODEL_META: Record<string, { label: string, color: string, tier: number, desc: string }> = {
    "gemini-3-pro-preview": { label: "PRO 3.0", color: "bg-purple-600 text-white shadow-purple-500/30", tier: 3, desc: "Max Reasoning" },
    "gemini-2.0-flash": { label: "FLASH 2.0", color: "bg-blue-600 text-white shadow-blue-500/30", tier: 2, desc: "Stable & Fast" },
    "gemini-2.0-flash-lite-preview-02-05": { label: "LITE 2.0", color: "bg-emerald-600 text-white shadow-emerald-500/30", tier: 1, desc: "High Availability" },
    "gemini-3-flash-preview": { label: "FLASH 3.0", color: "bg-cyan-600 text-white shadow-cyan-500/30", tier: 2, desc: "Next Gen Speed" },
    "gemini-2.0-flash-exp": { label: "EXP 2.0", color: "bg-amber-600 text-white shadow-amber-500/30", tier: 2, desc: "Legacy Exp" }
};

export const TABS_CONFIG = [
    { id: 'planning', label: '1. Planning', icon: 'LayoutList', colorClass: 'bg-orange-500', textClass: 'text-orange-600', borderClass: 'border-orange-500', bgSoft: 'bg-orange-50 dark:bg-orange-950/30' },
    { id: 'evidence', label: '2. Audit', icon: 'ScanText', colorClass: 'bg-blue-500', textClass: 'text-blue-600', borderClass: 'border-blue-500', bgSoft: 'bg-blue-50 dark:bg-blue-950/30' }, 
    { id: 'findings', label: '3. Findings', icon: 'Wand2', colorClass: 'bg-purple-500', textClass: 'text-purple-600', borderClass: 'border-purple-500', bgSoft: 'bg-purple-50 dark:bg-purple-950/30' }, 
    { id: 'report', label: '4. Report', icon: 'FileText', colorClass: 'bg-emerald-500', textClass: 'text-emerald-600', borderClass: 'border-emerald-500', bgSoft: 'bg-emerald-50 dark:bg-emerald-950/30' }
];

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
        version: "5.1.0-SMART-ROUTING",
        date: "2026-03-01",
        features: [
            "CORE: Added Smart Model Rotator. Automatically switches to Flash/Lite models when Pro quota is exceeded.",
            "QUOTA: Integrated Gemini 2.0 Flash Lite for maximum availability."
        ]
    },
    {
        version: "5.0.2-HOTFIX",
        date: "2026-03-01",
        features: [
            "CRITICAL: Removed Gemini 1.5 models causing 404 errors.",
            "CORE: Upgraded all synthesis tasks to Gemini 3.0 Pro/Flash."
        ]
    },
    {
        version: "5.0.0-PERFORMANCE",
        date: "2026-03-01",
        features: [
            "CORE: Major Refactoring & Code Cleanup. Tech debt cleared.",
            "UI/UX: Modern 'Glassmorphism' Interface with depth and smooth motion.",
            "PERF: Optimized Rendering Engine for Matrix & Findings views."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images, PDFs & TXT." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." },
    { icon: "LayoutList", title: "Matrix View", desc: "Structured Evidence Mapping." }
];

export const INITIAL_EVIDENCE = "";
