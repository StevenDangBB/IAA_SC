
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

        4. **EVENTS & MEETINGS (STRICT ENFORCEMENT)**:
           - An audit day MUST be exactly 8 hours of scheduled time (including meetings, excluding lunch).
           - Daily: "Lunch break" at {{LUNCH_START}} to {{LUNCH_END}} (All Team).
           - If the audit is 1 day total:
             - Start of day: "Opening meeting" (30 mins).
             - End of day: "Audit caucus/Washup Meeting" (30 mins) followed by "Closing Meeting" (30 mins).
           - If the audit is 2 days total:
             - Day 1 Start: "Opening meeting" (30 mins).
             - Day 1 End: "Feedback Meeting day 1" (30 mins).
             - Day 2 End: "Audit caucus/Washup meeting" (30 mins) followed by "Closing Meeting" (30 mins).
           - If the audit is 3 or more days:
             - Day 1 Start: "Opening meeting" (30 mins).
             - Day 1 End: "Feedback Meeting day 1" (30 mins).
             - Middle Days End: "Feedback Meeting day X" (30 mins) where X is the day number.
             - Last Day End: "Audit caucus/Washup meeting" (30 mins) followed by "Closing Meeting" (30 mins).

        5. **SESSION DURATION & AUDITOR ASSIGNMENT**:
           - Session duration MUST be proportional to the number of clauses planned for that session.
           - You MUST assign an auditor whose competency code matches the competency code required for the process/session.

        6. **ACTIVITY DESCRIPTIONS (MANDATORY FOR CLAUSES 4-10)**:
           - The "activity" field MUST use the following descriptions when the respective clause is audited:
             - Clause 4: Understanding the Organization: Review of internal and external issues (SWOT/PESTEL) affecting information security. Interested Parties: Identification of stakeholders and their specific security requirements. ISMS Scope: Verification of the physical, logical, and organizational boundaries. ISMS Processes: Assessment of how the system is established, implemented, and maintained.
             - Clause 5: Leadership & Commitment: Evidence of top management’s involvement and support. Information Security Policy: Review of the high-level policy for alignment with strategic direction. Roles & Responsibilities: Evaluation of the organizational structure, ensuring authorities are assigned and communicated.
             - Clause 6: Risk Assessment Process: Evaluation of the methodology used to identify and analyze risks. Risk Treatment Plan (RTP): Review of how the organization treats, accepts, or transfers risks. Statement of Applicability (SoA): A deep dive into the selection of controls from Annex A and justification for exclusions. Security Objectives: Verification that security goals are measurable, monitored, and documented.
             - Clause 7: Resources & Competence: Review of staff training records and evidence that personnel are qualified. Awareness: Interviews with staff to verify they understand the policy and their contribution. Communication: Review of the "who, what, when, and how" regarding communications. Documented Information: Assessment of the control of documents and records.
             - Clause 8: Operational Planning & Control: Evidence that the processes defined in Clause 6 are being executed as planned. Information Security Risk Assessment: Review of the results of regular risk assessments. Information Security Risk Treatment: Evidence that the RTP is being actively implemented.
             - Clause 9: Monitoring & Measurement: Review of the KPIs used to evaluate ISMS effectiveness. Internal Audit: Evaluation of the internal audit program, reports, and objectivity. Management Review: Review of minutes from top management meetings where ISMS performance was discussed.
             - Clause 10: Non-conformity & Corrective Action: Evaluation of how the organization reacts to incidents or findings to prevent recurrence. Continual Improvement: Evidence that the organization is actively enhancing the ISMS over time.

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
