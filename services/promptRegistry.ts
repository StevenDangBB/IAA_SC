
import { PromptTemplate } from '../types';

const DEFAULT_PROMPTS: Record<string, PromptTemplate> = {
    ANALYSIS: {
        id: 'default_analysis',
        label: 'Standard Analysis',
        description: 'Strict ISO compliance check based on evidence.',
        isSystemDefault: true,
        template: `
        Analyze the provided EVIDENCE against ISO Standard "{{STANDARD_NAME}}", Clause "{{CLAUSE_CODE}}: {{CLAUSE_TITLE}}".
        Clause Requirement: {{CLAUSE_DESC}}
        
        CONTEXT (Retrieved from Knowledge Base):
        """
        {{RAG_CONTEXT}}
        """

        EVIDENCE SECTIONS:
        """
        {{EVIDENCE}}
        """
        
        CROSS-REFERENCE CHECK:
        Check if this evidence also relates to other common ISO standards (like ISO 9001 if auditing 27001, or vice versa).

        HIERARCHY & GROUPING RULE (SMART AUDIT):
        1. **Parent-Child Inheritance:** If evaluating a parent clause (e.g., Clause 6), evidence found in its sub-clauses (e.g., 6.1, 6.2, 6.3) in the 'BROADER CONTEXT' section MUST be considered valid evidence for the parent.
        2. **PDCA Context:** If evidence exists in other clauses within the same PDCA phase (Plan/Do/Check/Act) that satisfies the intent of this clause, mark as COMPLIANT.
        3. **Missing Evidence:** Only mark as NC (Non-Conformity) if evidence is missing from DIRECT EVIDENCE **AND** BROADER CONTEXT **AND** GENERAL PROCESS EVIDENCE.

        DETERMINE:
        1. Status (COMPLIANT, NC_MINOR, NC_MAJOR, OFI, or N_A).
        2. Reason (Why? Be specific based on evidence. If Compliant via sub-clause, state "Compliance demonstrated via evidence in Clause X").
        3. **reason_en**: The Reason/Observation in clear professional English.
        4. **reason_vi**: The Reason/Observation translated into professional Vietnamese.
        5. Evidence Quote (Verbatim support, or summary of related clause evidence).
        6. Suggestion (If NC or OFI).
        7. CrossRefs (Array of strings, e.g. ["ISO 9001: 7.5.3"]).
        
        Output a SINGLE JSON Object.
        `
    },
    REPORT: {
        id: 'system_integration_report_v3_process_grouped',
        label: 'Process-Based Integration Format',
        description: 'Plain Text format grouped by Process with Auditor info.',
        isSystemDefault: true,
        template: `
        ROLE: ISO Audit Data Processor.
        TASK: Convert audit findings into a STRICT PLAIN TEXT format for legacy system integration, GROUPED BY PROCESS.

        CRITICAL FORMATTING RULES:
        1. OUTPUT MUST BE PLAIN TEXT ONLY.
        2. **GROUPING:** All findings must be grouped under their respective PROCESS Name.
        3. **HEADER:** Start each process section with:
           "PROCESS: [Process Name]"
           "AUDITOR: {{AUDITOR}}"
        4. CRITICAL: For 'VERIFIED_EVIDENCE', you MUST output the EXACT, FULL text provided in the input JSON for that finding. 
           - Do NOT summarize, truncate, or reformat. 
           - KEEP ALL original line breaks, bullet points, and spacing exactly as they appear in the source.
        5. Use exactly "====================" (20 dashes) as a separator between clauses.

        REQUIRED STRUCTURE:

        PROCESS: [Process Name]
        AUDITOR: {{AUDITOR}}
        INTERVIEWEES: [List of names if available]

        [Repeat for each finding in this process]
        CLAUSE_ID: [Code]
        CLAUSE_TITLE: [Title]
        STATUS: [Status]
        FINDING_DETAIL: [Reasoning]
        VERIFIED_EVIDENCE:
        [...Insert the exact full raw text of the evidence here, preserving all line breaks...]
        ====================

        INPUT CONTEXT:
        Entity: {{COMPANY}}
        Standard: {{STANDARD_NAME}}
        Auditor: {{AUDITOR}}
        Target Language: {{LANGUAGE}}

        FINDINGS DATA (Aggregated by Process):
        {{FINDINGS_JSON}}

        FULL EVIDENCE CONTEXT:
        """
        {{FULL_EVIDENCE_CONTEXT}}
        """
        `
    },
    SCHEDULING: {
        id: 'smart_scheduler_exhaustive',
        label: 'Exhaustive Schedule Logic',
        description: 'Logic to map every clause to a time slot.',
        isSystemDefault: true,
        template: `
        ROLE: Expert ISO Lead Auditor.
        TASK: Create a granular Audit Agenda (JSON) that covers EVERY SINGLE clause listed in the INPUT.

        CONSTRAINTS:
        - Time: {{START_TIME}} to {{END_TIME}}
        - Lunch: {{LUNCH_START}} to {{LUNCH_END}} (No audits during lunch)
        - Available Dates: {{DATES}} (DD-MM-YYYY)
        - Site Constraints: Respect "SiteIDs" in input. If empty, any site is valid.

        INPUT DATA (Compact Format):
        SITES: {{SITES_COMPACT}}
        TEAM: {{TEAM_COMPACT}}
        PROCESS_MAP:
        {{PROCESS_REQUIREMENTS}}

        CRITICAL RULES (ALGORITHMIC EXECUTION):
        1. **EXHAUSTIVENESS**: You MUST schedule every clause code listed inside the [ ] brackets in PROCESS_MAP. 
           - If a Process has [4.1, 4.2], there MUST be agenda items covering 4.1 and 4.2.
           - You can group multiple clauses into one time slot if they are small (e.g. "4.1, 4.2, 4.3" in 60 mins).
        2. **GROUPING**: Keep the 'Process' as the main anchor. Do not jump between processes randomly. Finish one process before moving to the next if possible.
        3. **ALLOCATION**: Assign specific Auditors based on 'CompetencyCodes'. If no code matches, use any available Auditor.
        4. **OUTPUT**: Strict JSON Array. No markdown.

        JSON FORMAT:
        [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "timeSlot": "08:30-09:30",
            "activity": "Audit of [Process Name]: [Specific Activity]",
            "siteName": "Name of Site",
            "auditorName": "Name of Auditor",
            "processName": "Exact Process Name from Input",
            "clauseRefs": ["4.1", "4.2"], // MUST list the clauses covered here
            "isRemote": false
          }
        ]
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

    public getPrompt(type: 'ANALYSIS' | 'REPORT' | 'SCHEDULING'): PromptTemplate {
        return this.prompts[type] || DEFAULT_PROMPTS[type];
    }

    public updatePrompt(type: 'ANALYSIS' | 'REPORT' | 'SCHEDULING', newTemplate: string) {
        this.prompts[type] = {
            ...this.prompts[type],
            template: newTemplate,
            isSystemDefault: false
        };
        localStorage.setItem('iso_prompt_overrides', JSON.stringify(this.prompts));
    }

    public resetToDefault(type: 'ANALYSIS' | 'REPORT' | 'SCHEDULING') {
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
