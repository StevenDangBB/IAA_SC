
import { PromptTemplate } from '../types';

const DEFAULT_PROMPTS: Record<string, PromptTemplate> = {
    ANALYSIS: {
        id: 'default_analysis',
        label: 'Standard Analysis',
        description: 'Strict ISO compliance check.',
        isSystemDefault: true,
        template: `
        Analyze EVIDENCE against ISO "{{STANDARD_NAME}}", Clause "{{CLAUSE_CODE}}: {{CLAUSE_TITLE}}".
        Req: {{CLAUSE_DESC}}
        
        CTX:
        """
        {{RAG_CONTEXT}}
        """

        EVIDENCE:
        """
        {{EVIDENCE}}
        """
        
        RULES:
        1. **Cross-Clause Validation**: Look at "BROADER CONTEXT" in the evidence. If evidence from a related clause (e.g. A.5.24) covers the requirements of this clause (e.g. A.5.25), mark as COMPLIANT. Do NOT mark NC simply because "Direct Evidence" is empty.
        2. **Process Approach**: Evaluate if the process described in "GENERAL PROCESS EVIDENCE" effectively meets the intent of this clause.
        3. **Hierarchy**: Evidence in sub-clauses (e.g. 7.5.1) verifies the parent (7.5).
        4. **Compliance**: Mark NC *only* if the requirement is missing in ALL provided evidence streams (Direct, Broader Context, and General Process).

        OUTPUT JSON:
        {
          "status": "COMPLIANT" | "NC_MINOR" | "NC_MAJOR" | "OFI" | "N_A",
          "reason": "Concise technical justification. If based on broader context, explicitly state 'Verified via [Related Clause] evidence'.",
          "reason_en": "English justification.",
          "reason_vi": "Vietnamese justification.",
          "evidence": "Key quote or summary of the supporting evidence.",
          "suggestion": "If NC/OFI, specific action.",
          "crossRefs": ["ISO 9001: 7.5.3"]
        }
        `
    },
    REPORT: {
        id: 'batch_process_report',
        label: 'Batch Process Report',
        description: 'Generates report section for a whole process at once.',
        isSystemDefault: true,
        template: `
        ROLE: ISO Audit Reporter.
        TASK: Convert JSON findings for process "{{PROCESS_NAME}}" into PLAIN TEXT report.
        
        CTX:
        Org: {{COMPANY}} | Std: {{STANDARD_NAME}} | Lang: {{LANGUAGE}}
        Auditor: {{AUDITOR}} | Interviewees: {{INTERVIEWEES}}

        INPUT JSON (Findings):
        {{FINDINGS_JSON}}

        OUTPUT FORMAT RULES:
        1. Plain text only. STRICTLY NO MARKDOWN. Do NOT use **bold** or *italics* or # headers.
        2. STRICTLY NO CONVERSATIONAL TEXT. Start directly with the content. Do not include "Here is the report" or similar.
        3. Start with:
           PROCESS: {{PROCESS_NAME}}
           Execution performed by: {{AUDITOR}}
           Auditees: {{INTERVIEWEES}}
        4. For each finding:
           CLAUSE: [Code] [Title]
           STATUS: [Status]
           OBSERVATION: [Reason in target lang]
           EVIDENCE: [Evidence text preserved exactly]
           ----------------------------------------
        5. Do not summarize evidence. Keep line breaks.
        `
    },
    SCHEDULING: {
        id: 'smart_scheduler_v4',
        label: 'Smart Scheduler V4',
        description: 'Strict 8-Hour Rule & AM/PM Slot Enforcement.',
        isSystemDefault: true,
        template: `
        ROLE: Expert ISO Lead Auditor & Scheduler.
        TASK: Create a professional audit agenda strictly adhering to availability and work hours.
        
        GLOBAL PARAMETERS:
        - Work Day Start: {{START_TIME}}
        - Work Day End: {{END_TIME}}
        - Lunch Break: {{LUNCH_START}} to {{LUNCH_END}} (This period MUST be empty for everyone)
        - 1.0 WD = 8 Hours of Work (excluding lunch).
        - 0.5 WD = 4 Hours of Work (Morning OR Afternoon).
        
        INPUTS:
        Sites: {{SITES_COMPACT}}
        Team: {{TEAM_COMPACT}} (Format: Name,Role,Codes,[Date=YYYY-MM-DD|WD=X|Slot=AM/PM/FULL/OFF...])
        Process Requirements:
        {{PROCESS_REQUIREMENTS}}

        CRITICAL RESOURCE ALLOCATION RULES:
        
        1. **MANDATORY SLOT ENFORCEMENT (WD ALLOCATION)**: 
           - You MUST check the 'Slot' and 'WD' for each auditor on each date.
           - If Slot='OFF' (WD=0): This auditor is UNAVAILABLE. Do not assign them any clauses, meetings, or activities on this specific date.
           - If Slot='AM' (WD=0.5): Schedule ONLY between {{START_TIME}} and {{LUNCH_START}}. Max duration: 4 hours. Do NOT schedule in PM.
           - If Slot='PM' (WD=0.5): Schedule ONLY between {{LUNCH_END}} and {{END_TIME}}. Max duration: 4 hours. Do NOT schedule in AM.
           - If Slot='FULL' (WD=1.0): Schedule active audit tasks for exactly 8 hours total (Morning + Afternoon, skipping lunch).
        
        2. **LOAD BALANCING**:
           - Split processes/clauses among available auditors.
           - Parallel sessions are allowed if different auditors are used.

        3. **DETAILED ACTIVITY DESCRIPTIONS**:
           - Format: "Topic Name / Tên Chủ đề (Clause IDs)"
           - Use NEWLINES to separate topics within one session.

        4. **EVENTS**:
           - Day 1 Start: "Opening Meeting" (All Team present).
           - Daily: "Lunch Break" at {{LUNCH_START}} (All Team).
           - Last Day End: "Closing Meeting" (All Team present).

        JSON OUTPUT SCHEMA:
        [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "timeSlot": "HH:MM - HH:MM", // Ensure correct math (Start + Duration)
            "activity": "Context (4.1)\nLeadership (5.1)", 
            "siteName": "Site Name",
            "auditorName": "Name", 
            "processName": "Process Name",
            "clauseRefs": ["4.1", "4.2"], 
            "isRemote": false
          }
        ]
        `
    },
    OCR: {
        id: 'ocr_extraction',
        label: 'OCR Extraction',
        description: 'Extract text from image.',
        isSystemDefault: true,
        template: `
        You are an OCR engine. Output ONLY the text found in the image.
        Maintain layout/tables if possible. No conversational text.
        `
    }
};

class PromptRegistryService {
    private prompts: Record<string, PromptTemplate>;

    constructor() {
        this.prompts = { ...DEFAULT_PROMPTS };
        this.loadUserOverrides();
    }

    private loadUserOverrides() {
        try {
            const saved = localStorage.getItem('iso_prompt_overrides');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.prompts = { ...this.prompts, ...parsed };
            }
        } catch (e) {
            console.error("Failed to load prompt overrides", e);
        }
    }

    public getPrompt(type: 'ANALYSIS' | 'REPORT' | 'SCHEDULING' | 'OCR'): PromptTemplate {
        return this.prompts[type] || DEFAULT_PROMPTS[type];
    }

    public updatePrompt(type: 'ANALYSIS' | 'REPORT' | 'SCHEDULING' | 'OCR', newTemplate: string) {
        this.prompts[type] = {
            ...this.prompts[type],
            template: newTemplate,
            isSystemDefault: false
        };
        localStorage.setItem('iso_prompt_overrides', JSON.stringify(this.prompts));
    }

    public resetToDefault(type: 'ANALYSIS' | 'REPORT' | 'SCHEDULING' | 'OCR') {
        this.prompts[type] = { ...DEFAULT_PROMPTS[type] };
        localStorage.setItem('iso_prompt_overrides', JSON.stringify(this.prompts));
    }

    public hydrate(template: string, data: Record<string, string>): string {
        let text = template;
        for (const [key, value] of Object.entries(data)) {
            // Replace {{KEY}} with value
            const regex = new RegExp(`{{${key}}}`, 'g');
            text = text.replace(regex, value || "");
        }
        return text;
    }
}

export const PromptRegistry = new PromptRegistryService();
