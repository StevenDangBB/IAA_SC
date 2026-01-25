
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
        description: 'Optimized logic for audit agenda with grouping.',
        isSystemDefault: true,
        template: `
        ROLE: Expert ISO Lead Auditor & Scheduler.
        TASK: Create a professional audit agenda based on the inputs.
        
        PARAMS:
        Time: {{START_TIME}}-{{END_TIME}} | Lunch: {{LUNCH_START}}-{{LUNCH_END}}
        Dates: {{DATES}}
        
        INPUTS:
        Sites: {{SITES_COMPACT}}
        Team: {{TEAM_COMPACT}} (Format: Name, Role, Competency, Availability)
        Process Requirements (Name, Code, Site, Clauses):
        {{PROCESS_REQUIREMENTS}}

        CRITICAL MANDATORY RULES (FAILURE TO FOLLOW = ERROR):
        1. **RESOURCE UTILIZATION**: You MUST schedule ALL auditors listed in 'Team'. Do NOT leave any auditor idle if there is work. If multiple auditors are available, parallelize the sessions (different auditors auditing different processes at the same time).
        2. **LEAD AUDITOR**: The Lead Auditor must attend Opening (first activity) and Closing (last activity).
        3. **GROUPING**: Group related clauses into logical activities.
           - DO NOT list: "4.1 Context", "4.2 Interested Parties", "4.3 Scope" as 3 separate rows.
           - DO LIST: Activity="Context & Leadership", ClauseRefs=["4.1", "4.2", "4.3", "5.1"]
        4. **COVERAGE**: Every clause listed in 'Process Requirements' must appear in the 'clauseRefs' of at least one activity.
        5. **OPENING/CLOSING**:
           - Day 1, Start Time: "Opening Meeting" (All Team)
           - Last Day, End Time: "Closing Meeting" (All Team)
           - End of each day (except last): "Interim Briefing" (All Team)
        6. **ACTIVITY NAMING (CRITICAL)**: 
           - The 'activity' field MUST be descriptive and explicitly reference the clause topic to help the Auditee prepare.
           - BAD: "Production", "HR", "Sales"
           - GOOD: "Production: Control of Production & Preservations (8.5)", "HR: Competence, Awareness & Training Records (7.2, 7.3)", "Sales: Contract Review & Customer Satisfaction (8.2, 9.1)"

        JSON OUTPUT SCHEMA:
        [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "timeSlot": "HH:MM-HH:MM",
            "activity": "Activity Name (Must be descriptive, e.g., 'HR: Training & Competency Check')",
            "siteName": "Site Name",
            "auditorName": "Name", // Specific auditor assigned
            "processName": "Process Name",
            "clauseRefs": ["4.1", "4.2", ...], // ALL clauses covered in this slot
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
