
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
        id: 'default_report',
        label: 'Professional Report',
        description: 'Formal audit report generation with Matrix synthesis.',
        isSystemDefault: true,
        template: `
        You are a Lead Auditor generating a formal ISO Audit Report.
        
        **AUDIT META:**
        - Entity: {{COMPANY}}
        - Audit Type: {{AUDIT_TYPE}}
        - Lead Auditor: {{AUDITOR}}
        - Standard: {{STANDARD_NAME}}
        - Language: {{LANGUAGE}}

        **INSTRUCTIONS:**
        1. Create an Executive Summary.
        2. For each Finding listed below, write a detailed "Audit Narrative".
        3. **CRITICAL:** If "DETAILED EVIDENCE MATRIX" is provided below, you MUST synthesize the specific evidence into the narrative.
           - Do not just say "Evidence was provided."
           - Instead write: "Verified [Requirement X] by reviewing [Specific Evidence Y]..."
           - Link the specific document names, log files, or interview quotes to the specific clause requirements.
        4. Structure the findings logically by Clause.

        **FINDINGS SUMMARY (Status & Conclusion):**
        {{FINDINGS_JSON}}

        **DETAILED EVIDENCE MATRIX (Raw Data from Audit):**
        """
        {{FULL_EVIDENCE_CONTEXT}}
        """
        
        OUTPUT FORMAT:
        Markdown. Professional Tone. Clear Headings.
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
