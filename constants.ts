
import { StandardsData } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

export const APP_VERSION = "2.8"; // Stable Snapshot
export const DEFAULT_GEMINI_MODEL = "gemini-3-pro-preview";
export const DEFAULT_VISION_MODEL = "gemini-3-flash-preview"; 

// NEW: Define the fallback order based on intelligence vs stability/quota
export const MODEL_HIERARCHY = [
    "gemini-3-pro-preview",       // Tier 1: Highest Intelligence
    "gemini-3-flash-preview",     // Tier 2: High Speed & Intelligence
    "gemini-2.5-flash",           // Tier 3: High Stability (Legacy)
    "gemini-flash-lite-latest"    // Tier 4: Lowest Cost/Latency fallback
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
        version: "2.8 (Stable Snapshot)",
        date: "2024-06-25",
        features: [
            "SMART EXPORT ENGINE: New chunk-based export system with auto-translation (EN/VI) and pause/resume capabilities.",
            "MATRIX EDITING: Directly edit compliance status, evidence, and reasons from the Matrix view.",
            "RESCUE KEY: Instant API key injection during export failures to prevent data loss.",
            "DRAG & DROP: Seamlessly drag image evidence directly into the analysis workspace."
        ]
    },
    {
        version: "2.7 (AI Architecture Upgrade)",
        date: "2024-06-18", // Fixed release date
        features: [
            "SMART MODEL PROBING: System now proactively 'probes' your API keys against all models (Pro → Flash → Lite) at startup. It locks in the highest performing model available for the day, preventing repetitive downgrade errors.",
            "TEMPLATE INTELLIGENCE: The Report Engine is now context-aware. It analyzes your uploaded document's structure and tone, then synthesizes findings to fit that exact format (instead of just appending text).",
            "PERMANENT FAILOVER: If a model hits a Quota Limit mid-session, the system automatically downgrades that specific Key for the remainder of the session to ensure zero-interruption workflow.",
            "VISUAL FEEDBACK: Added 'Template Active' indicators and enhanced 'Model Status' visualizers."
        ]
    },
    {
        version: "2.6 (Smart Model Cascade)",
        date: "2024-06-10",
        features: [
            "AI CORE: Implemented 'Smart Cascade' strategy. If the Pro model hits quota limits, the system automatically downgrades to Flash and then Lite models to ensure continuity.",
            "FAILOVER: Logic now iterates through [All Keys x All Models] matrix before giving up.",
            "STABILITY: Fixed API Key validation logic to use micro-generation instead of token counting for accurate 429 detection."
        ]
    },
    {
        version: "2.5 (Stable Baseline)",
        date: "2024-06-05",
        features: [
            "BRANDING: Restored signature 'TD Logo' for sidebar collapsed state while strictly maintaining the 'Infinity' animation for the active state.",
            "MOBILE UX: Optimized Header layout for small screens. Hidden non-essential elements and compacted API status to reduce clutter.",
            "VISUAL POLISH: Refined spacing, shadow effects, and interactions for the 'API Ready' indicator and Sidebar toggles.",
            "PERFORMANCE: Codebase baselined and fitted for upcoming major architecture improvements."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images & PDFs." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." }
];

export const INITIAL_EVIDENCE = "";
