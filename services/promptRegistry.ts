
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
        id: 'system_integration_report_v1',
        label: 'System Integration Format',
        description: 'Strict Plain Text format structured by clause. No Markdown/Tables.',
        isSystemDefault: true,
        template: `
        ROLE: ISO Audit Data Processor.
        TASK: Convert audit findings into a STRICT PLAIN TEXT format for legacy system integration.

        CRITICAL FORMATTING RULES:
        1. OUTPUT MUST BE PLAIN TEXT ONLY.
        2. NO Markdown characters allowed (Do NOT use **, ##, __, or tables with |).
        3. NO introductory text, executive summaries, or conclusions.
        4. Use exactly "====================" (20 dashes) as a separator between clauses.
        5. Synthesize specific evidence from the "EVIDENCE MATRIX" into the "VERIFIED_EVIDENCE" field.

        REQUIRED BLOCK STRUCTURE (Repeat for each clause):

        CLAUSE_ID: [Code]
        CLAUSE_TITLE: [Title]
        STATUS: [Status]
        
        FINDING_DETAIL:
        [Detailed reasoning and conclusion text]

        VERIFIED_EVIDENCE:
        [Specific documents, logs, or observations verified]

        ====================

        INPUT CONTEXT:
        Entity: {{COMPANY}}
        Standard: {{STANDARD_NAME}}
        Auditor: {{AUDITOR}}
        Target Language: {{LANGUAGE}}

        FINDINGS DATA:
        {{FINDINGS_JSON}}

        EVIDENCE MATRIX (Source Data):
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
