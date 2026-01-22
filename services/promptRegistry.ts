
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
        1. Plain text only. No Markdown.
        2. Start with:
           PROCESS: {{PROCESS_NAME}}
           Execution performed by: {{AUDITOR}}
           Auditees: {{INTERVIEWEES}}
        3. For each finding:
           CLAUSE: [Code] [Title]
           STATUS: [Status]
           OBSERVATION: [Reason in target lang]
           EVIDENCE: [Evidence text preserved exactly]
           ----------------------------------------
        4. Do not summarize evidence. Keep line breaks.
        `
    },
    SCHEDULING: {
        id: 'smart_scheduler_v2',
        label: 'Smart Scheduler',
        description: 'Optimized logic for audit agenda.',
        isSystemDefault: true,
        template: `
        ROLE: ISO Scheduler.
        TASK: Map clauses to time slots.
        
        PARAMS:
        Time: {{START_TIME}}-{{END_TIME}} | Lunch: {{LUNCH_START}}-{{LUNCH_END}}
        Dates: {{DATES}}
        
        INPUTS:
        Sites: {{SITES_COMPACT}}
        Team: {{TEAM_COMPACT}}
        Reqs:
        {{PROCESS_REQUIREMENTS}}

        RULES:
        1. Cover ALL clauses in Reqs.
        2. Group by Process.
        3. Assign ONLY valid auditors from [VALID_AUDITORS].
        4. Output JSON Array.

        JSON SCHEMA:
        [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "timeSlot": "HH:MM-HH:MM",
            "activity": "Audit [Process]",
            "siteName": "Site",
            "auditorName": "Name",
            "processName": "Process",
            "clauseRefs": ["4.1"],
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
