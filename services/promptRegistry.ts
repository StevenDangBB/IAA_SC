
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
        1. Parent-Child: Evidence in sub-clauses (e.g. 6.1) validates parent (6).
        2. PDCA: PDCA-related clause evidence implies compliance.
        3. NC: Mark NC only if missing in DIRECT, BROADER, & GENERAL context.

        OUTPUT JSON:
        {
          "status": "COMPLIANT" | "NC_MINOR" | "NC_MAJOR" | "OFI" | "N_A",
          "reason": "Concise technical justification.",
          "reason_en": "English justification.",
          "reason_vi": "Vietnamese justification.",
          "evidence": "Key quote or summary.",
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
        id: 'smart_scheduler_v3',
        label: 'Smart Scheduler V3',
        description: 'Strict Load Balancing & Availability Enforcement.',
        isSystemDefault: true,
        template: `
        ROLE: Expert ISO Lead Auditor & Scheduler.
        TASK: Create a professional audit agenda.
        
        PARAMS:
        Standard Day: 8 Hours Work (1.0 WD).
        Time: {{START_TIME}}-{{END_TIME}} | Lunch: {{LUNCH_START}}-{{LUNCH_END}}
        Dates: {{DATES}}
        
        INPUTS:
        Sites: {{SITES_COMPACT}}
        Team: {{TEAM_COMPACT}} (Format: Name, Role, Competency, AvailabilityMatrix)
        Process Requirements:
        {{PROCESS_REQUIREMENTS}}

        CRITICAL RULES (STRICT ENFORCEMENT):
        
        1. **MANDATORY RESOURCE USAGE**: 
           - Look at the 'Availability' column for EACH auditor.
           - If an auditor has 'Date=YYYY-MM-DD|WD=X' (where X > 0) for a specific date, you **MUST** assign activity to them on that date.
           - **FAILURE CONDITION**: If an auditor has WD > 0 on a date but 0 tasks, re-distribute tasks immediately.
        
        2. **LOAD BALANCING**:
           - Do NOT assign all tasks to the Lead Auditor.
           - If multiple auditors are available on the same day, you must SPLIT the processes/clauses between them.
           - Create parallel sessions (same time slot, different auditor, different process).

        3. **DETAILED ACTIVITY DESCRIPTIONS (IMPORTANT)**:
           - In the 'activity' field, DO NOT just write "Audit of [Process]".
           - You MUST list the topics/clauses being covered in that session, grouping them logically.
           - Format: "Topic Name / Tên Chủ đề (Clause IDs)"
           - Use NEWLINES ("\n") to separate different topics within the same activity string.
           - Example Output:
             "Context of Organization / Bối cảnh (4.1, 4.2, 4.3)\nLeadership / Lãnh đạo (5.1, 5.2)\nRisk Management / Quản lý rủi ro (6.1)"

        4. **EVENTS**:
           - Day 1 Start: "Opening Meeting" (All Team).
           - Daily: "Lunch Break" at {{LUNCH_START}} (All Team).
           - Daily End: "Interim Briefing" (All Team, except last day).
           - Last Day End: "Closing Meeting" (All Team).

        5. **TIMING**:
           - Calculate end times based on WD. 
           - Example: 0.5 WD means finish around 12:00. 1.0 WD means finish at {{END_TIME}}.

        JSON OUTPUT SCHEMA:
        [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "timeSlot": "HH:MM-HH:MM",
            "activity": "Context (4.1)\nLeadership (5.1)", // Detailed multi-line string
            "siteName": "Site Name",
            "auditorName": "Name", // Must match team list
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
