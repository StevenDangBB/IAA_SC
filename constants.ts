
import { StandardsData } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

export const APP_VERSION = "2.9.6"; 
export const BUILD_TIMESTAMP = "2024-06-28 22:15:00 (GMT+7)";
export const DEFAULT_GEMINI_MODEL = "gemini-3-pro-preview";
export const DEFAULT_VISION_MODEL = "gemini-3-flash-preview"; 

// --- USER CONFIGURATION: FIXED API KEYS ---
// Paste your 7 fixed keys here to avoid re-entering them.
// They will be automatically loaded into the app.
export const MY_FIXED_KEYS: string[] = [
    "AIzaSyBDCU4CO1sG1oIWRNpCHUDtc6XE11qrHIc", // Key 1
    "AIzaSyCJeFzNQ3FRUdhPbLutqhb7yoLDbEvyBXg", // Key 2 
    "AIzaSyBBjQy2C0QuDf9Ov_N2VypAn8MiTQuV-kc", // Key 3
    "AIzaSyDqI8qaXCbYxhLJSUj79-CYxnhKy8MoneA", // Key 4
    "AIzaSyB1HWvcu5oiO2SEYsACpi88nSVuR__YXQY", // Key 5
    "AIzaSyCmZy2gkChgRapwn3mrib8fymDcioWWYg8", // Key 6
    "AIzaSyAcAlhAPUscnR89qb3Am5ogU9ZHjI3qLCk", // Key 7
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
        version: "2.9.6",
        date: "2024-06-28",
        features: [
            "CHECKPOINT SNAPSHOT: System state frozen for deployment stability.",
            "TIMESTAMP SYNC: Build time localized to Hanoi/Bangkok (GMT+7).",
            "HOTFIX: Optimized static assets loading and version integrity.",
        ]
    },
    {
        version: "2.9.5",
        date: "2024-06-28",
        features: [
            "INDIVIDUAL OCR: Process files one by one with real-time status updates.",
            "PDF & TXT SUPPORT: Seamlessly extract evidence from documents and text files.",
            "ERROR HANDLING: Clear visual feedback for failed files (API quota, invalid key, etc.).",
            "ZAP COMMANDS: Updated command palette and synchronized finding colors."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images, PDFs & TXT." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." }
];

export const INITIAL_EVIDENCE = "";
