
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

        EVIDENCE (User Input & Tags):
        """
        {{EVIDENCE}}
        """
        
        CROSS-REFERENCE CHECK:
        Check if this evidence also relates to other common ISO standards (like ISO 9001 if auditing 27001, or vice versa).

        DETERMINE:
        1. Status (COMPLIANT, NC_MINOR, NC_MAJOR, OFI, or N_A).
        2. Reason (Why? Be specific based on evidence).
        3. Evidence Quote (Verbatim support).
        4. Suggestion (If NC or OFI).
        5. CrossRefs (Array of strings, e.g. ["ISO 9001: 7.5.3"]).
        
        Output a SINGLE JSON Object.
        `
    },
    REPORT: {
        id: 'system_integration_report_v3_full_evidence',
        label: 'Process-Based Integration Format (Full Evidence)',
        description: 'Plain Text format preserving exact evidence structure.',
        isSystemDefault: true,
        template: `
        ROLE: ISO Audit Data Processor.
        TASK: Convert audit findings into a STRICT PLAIN TEXT format for legacy system integration, GROUPED BY PROCESS.

        CRITICAL FORMATTING RULES:
        1. OUTPUT MUST BE PLAIN TEXT ONLY.
        2. Group findings by PROCESS Name.
        3. List Interviewees for each process.
        4. CRITICAL: For 'VERIFIED_EVIDENCE', you MUST output the EXACT, FULL text provided in the input JSON for that finding. 
           - Do NOT summarize, truncate, or reformat. 
           - KEEP ALL original line breaks, bullet points, and spacing exactly as they appear in the source.
           - If the evidence spans multiple lines, print them exactly as is.
        5. Use exactly "====================" (20 dashes) as a separator between clauses.

        REQUIRED STRUCTURE:

        PROCESS: [Process Name]
        INTERVIEWEES: [List of names]

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

    public getPrompt(type: 'ANALYSIS' | 'REPORT'): PromptTemplate {
        return this.prompts[type] || DEFAULT_PROMPTS[type];
    }

    public updatePrompt(type: 'ANALYSIS' | 'REPORT', newTemplate: string) {
        this.prompts[type] = {
            ...this.prompts[type],
            template: newTemplate,
            isSystemDefault: false
        };
        localStorage.setItem('iso_prompt_overrides', JSON.stringify(this.prompts));
    }

    public resetToDefault(type: 'ANALYSIS' | 'REPORT') {
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
