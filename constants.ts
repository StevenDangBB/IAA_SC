
import { StandardsData } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

export const APP_VERSION = "2.5";
export const DEFAULT_GEMINI_MODEL = "gemini-3-pro-preview";
export const DEFAULT_VISION_MODEL = "gemini-3-flash-preview"; 

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
        version: "2.5 (Stable Baseline)",
        date: new Date().toISOString().substring(0, 10),
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
    },
    {
        version: "2.3 (Baseline Release)",
        date: "2024-05-25",
        features: [
            "INTEGRITY: Added Standard Health Index to monitor data quality.",
            "AI REPAIR: Self-healing capability to fix missing clause descriptions.",
            "UX: Enhanced Drag & Drop Evidence Zone with instant preview.",
            "LOCALIZATION: Added EN/VI toggles for notes and report exports.",
            "REPORTING: Support for .docx Template ingestion for custom layouts."
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
