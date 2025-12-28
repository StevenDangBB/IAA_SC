
import { StandardsData } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

export const APP_VERSION = "2.6"; // Bump version
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
        version: "2.6 (Smart Model Cascade)",
        date: new Date().toISOString().substring(0, 10),
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
    },
    {
        version: "2.4 (Performance & Fluidity)",
        date: "2024-06-01",
        features: [
            "CORE AI UPDATE: Implemented 'Batch Processing' engine. Analysis is now split into sequential chunks to eliminate API Token Limits (429 Errors) and prevent Timeouts on large datasets.",
            "FLUID UX: Completely overhauled animation system using Spring Physics. Menus, tabs, and modals now move with natural momentum.",
            "VISUALS: New 'Glassmorphism' UI elements, Fluid Navigation Tabs, and smooth Accordion transitions.",
            "RESPONSIVE: Enhanced layout logic for smaller screens (Stacked Action Buttons, Auto-collapsing Sidebars).",
            "FEEDBACK: Added real-time progress indicators (e.g., 'Analyzing batch 1/4...') during complex AI tasks."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text from Images & PDFs." },
    { icon: "Wand2", title: "AI Analysis", desc: "Expert compliance evaluation." },
    { icon: "FileText", title: "Auto Report", desc: "Synthesizes final audit findings." }
];

export const INITIAL_EVIDENCE = `AUDIT INFO: Interview with [Name], Process [PROCESS ID], Effective Date [Effective date].
EVIDENCE: Records reviewed show implementation of [Control Name]. Documentation is [Status].`;
