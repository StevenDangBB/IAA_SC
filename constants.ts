import { StandardsData } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

export const APP_VERSION = "2.3";
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
        version: "2.3 (Baseline Release)",
        date: new Date().toISOString().substring(0, 10),
        features: [
            "INTEGRITY: Added Standard Health Index to monitor data quality.",
            "AI REPAIR: Self-healing capability to fix missing clause descriptions.",
            "UX: Enhanced Drag & Drop Evidence Zone with instant preview.",
            "LOCALIZATION: Added EN/VI toggles for notes and report exports.",
            "REPORTING: Support for .docx Template ingestion for custom layouts."
        ]
    },
    {
        version: "2.2 (Decoupled Data)",
        date: "2024-05-20",
        features: [
            "DATA: Fully isolated standard modules to prevent truncation.",
            "ISO 27001: Complete 93 controls + PDCA structure.",
            "ISO 9001: Included 8.4, 8.6, 8.7.",
            "ISO 14001: Included 5.3, 7.4, 9.3.",
            "DIAGNOSTIC: Clause count badge added to sidebar."
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