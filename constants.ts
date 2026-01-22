
import { StandardsData, AuditInfo, AuditPlanConfig } from './types';
import { ISO9001 } from './iso9001Data';
import { ISO27001 } from './iso27001Data';
import { ISO14001 } from './iso14001Data';

// --- APP CONSTANTS ---
export const APP_VERSION = "4.2.0-OPTIMIZED"; 
export const BUILD_TIMESTAMP = "2026-03-08 09:00:00 (GMT+7)"; 

// CHANGE: Default fallback model.
export const DEFAULT_GEMINI_MODEL = "gemini-3-pro-preview"; 
export const DEFAULT_VISION_MODEL = "gemini-2.5-flash-image"; 

export const DEFAULT_AUDIT_INFO: AuditInfo = { 
    company: "", 
    address: "",
    scope: "",
    soa: "",
    smo: "", 
    auditor: "", 
    type: "",
    totalEmployees: 0,
    totalSites: 0 
};

export const DEFAULT_PLAN_CONFIG: AuditPlanConfig = {
    auditDates: [new Date().toISOString().split('T')[0]], // Default to today
    startTime: "08:30",
    endTime: "17:00",
    lunchStartTime: "12:00",
    lunchEndTime: "13:00"
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
    { id: 'evidence', label: '2. Audit', icon: 'FileSearch', colorClass: 'bg-blue-500', textClass: 'text-blue-600', borderClass: 'border-blue-500', bgSoft: 'bg-blue-50 dark:bg-blue-950/30' }, 
    { id: 'findings', label: '3. Findings', icon: 'Wand2', colorClass: 'bg-purple-500', textClass: 'text-purple-600', borderClass: 'border-purple-500', bgSoft: 'bg-purple-50 dark:bg-purple-950/30' }, 
    { id: 'report', label: '4. Report', icon: 'FileText', colorClass: 'bg-emerald-500', textClass: 'text-emerald-600', borderClass: 'border-emerald-500', bgSoft: 'bg-emerald-50 dark:bg-emerald-950/30' }
];

export const AUDIT_TYPES: Record<string, string> = {
    "Pre Assessment": "The objective of the assessment is to ascertain the organisation's progress towards implementing a management system by conducting a gap analysis.",
    "Pre-transfer Review": "To confirm if the certification is valid and eligible for transfer, recommending a result.",
    "Pre-transfer visit": "To confirm if the certification is valid and eligible for transfer, recommending a result.",
    "Readiness Review": "The objective of the readiness review is to ensure the client organization has planned and initiated the implementation of the changes within the standard that will affect their transition process. The review will also include confirmation of the time needed, locations to be visited, and timeframes to allow planning of the transition audit.",
    "IAV1": "The objective of the assessment is to determine the organisation's readiness for the stage 2 audit and to ensure its effective planning.",
    "IAV2": "The objective of the assessment is to conduct a certification assessment to ensure the elements of the proposed scope of registration and the requirements of the management standard are effectively addressed by the organisation's management system and to confirm the forward strategic plan. If this visit is part of a multi-location assessment, the final recommendation will be contingent of the findings from all assessments.",
    "CAV": "The objective of the assessment is to conduct a surveillance assessment and look for positive evidence to ensure the elements of the scope of certification and the requirements of the management standard are effectively addressed by the organisation's management system demonstrating the ability to support the achievement of statutory, regulatory and contractual requirements and the organisations specified objectives, as applicable with regard to the scope of the management standard, and to confirm the on-going achievement and applicability of the forward strategic plan.",
    "M-NC Close out": "The objective of the assessment is to verify the effectiveness of the corrective action taken to address the major non-conformity and the minor non-conformities raised at the last assessment visit.",
    "Migration Op1": "The objective of the visit is to conduct an audit against the requirements of ISO 45001 which takes into consideration existing arrangements for certification to BS OHSAS 18001. The audit will ensure the proposed scope of certification to ISO 45001 and the requirements of the management system are effectively addressed and implemented.",
    "Migration Op2": "The objective of the visit is to plan and progress migration to ISO 45001 whilst confirming existing management system arrangements for conformity to BS OHSAS 18001 are maintained. The audit will provide a plan for ensuring the proposed scope of certification to ISO 45001 and the requirements of the management system are effectively addressed and implemented.",
    "Migration Op3": "The objective of the visit is to conduct an audit against the requirements of ISO 45001 as part of a full recertification audit. The audit will ensure the proposed scope of certification to ISO 45001 and the requirements of the management system are effectively addressed and implemented. (Note: this option is not applicable to registrations that involve recertification by strategic review and additional time will be required to cover the significant new and changed requirements in ISO 45001:2018)",
    "Recert op1": "The objective of the assessment is to ascertain the integrity of the organisation's management system over the current assessment cycle to enable re-certification and confirm the forward strategic assessment plan.",
    "Recert op2": "The objective of the assessment is to conduct a re-assessment of the existing certification to ensure the elements of the proposed scope of registration and the requirements of the management standard are effectively addressed by the organisation's management system.",
    "Transition Audit (1)": "The objective of the visit is to conduct a certification transition assessment to ensure the elements of the scope of registration and the requirements of the new management standard are effectively addressed by the organization's management system.",
    "Transition Audit (2)": "The objective of the visit is to conduct a certification transition and surveillance assessment to ensure the elements of the scope of registration and the requirements of the new management standard are effectively addressed by the organization's management system.",
    "Transition Audit (3)": "The objective of the visit is to conduct a certification transition and recertification assessment to ensure the elements of the scope of registration and the requirements of the new management standard are effectively addressed by the organization's management system.",
    "Verification Audit": "The objective of the assessment was to conduct verification of the requirements of the management standard are effectively addressed by the organization's management system and to confirm the forward strategic plan."
};

export const STANDARDS_DATA: StandardsData = {
    "ISO 9001:2015": ISO9001,
    "ISO 27001:2022": ISO27001,
    "ISO 14001:2015": ISO14001
};

export const RELEASE_NOTES = [
    {
        version: "4.2.0-OPTIMIZED",
        date: "2026-03-08",
        features: [
            "PERFORMANCE: Reduced AI Token usage by 40% via Compact-CSV Context Injection.",
            "CORE: Rendering optimization for Planning Matrix and Schedule Generator.",
            "UX: Hardware-accelerated animations for smoother transitions on lower-end devices."
        ]
    },
    {
        version: "4.1.0-STABLE",
        date: "2026-03-07",
        features: [
            "REFACTOR: Codebase cleanup and performance optimization for Planning View.",
            "FEATURE: Bi-directional Resource Sync. Adding staff in Planning now auto-updates Global Headcount.",
            "UX: Improved Auditor Competency tagging and visual cues."
        ]
    },
    {
        version: "4.0.0-GOLD",
        date: "2026-03-06",
        features: [
            "PRD DEPLOYMENT: System Architecture finalized. Dual-Stream Analysis engine is now stable.",
            "PERFORMANCE: React Rendering optimization for Evidence Matrix with >500 rows.",
            "DOCS: Added comprehensive 'User Manual' and 'Data Topology' in the Info section."
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
