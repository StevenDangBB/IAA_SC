import { StandardsData } from './types';

export const APP_VERSION = "1.1";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
export const DEFAULT_VISION_MODEL = "gemini-2.5-flash-preview-09-2025"; 

export const AUDIT_TYPES: Record<string, string> = {
    "Stage 1": "Initial review of documentation and readiness.",
    "Stage 2": "Evaluation of implementation and effectiveness of the management system.",
    "Internal": "First-party audit to check own system.",
    "PRE ASSESSMENT": "Gap analysis assessment.",
    "PRE TRANSFER REVIEW": "Check valid certification for transfer.",
    "PRE TRANSFER VISIT": "Check valid certification for transfer.",
    "READINESS REVIEW": "Ensure readiness for transition process.",
    "TRANSITION AUDIT": "Ensure transition to new standard.",
    "IAV1": "Determine readiness for stage 2.",
    "IAV2": "Certification assessment.",
    "CAV": "Surveillance assessment.",
    "MAJOR NC CLOSE-OUT": "Verify correction of major NC.",
    "RAV": "Re-assessment of existing certification."
};

export const STANDARDS_DATA: StandardsData = {
    "ISO 27001:2002": {
        name: "ISO/IEC 27001:2022 (ISMS)",
        description: "Information Security Management System",
        groups: [
            { id: "PLAN_27001", title: "Plan (4-6) Context & Planning", icon: "FileShield", clauses: [
                { id: "4.1", code: "4.1", title: "Understanding the organization and its context", description: "Determine external and internal issues relevant to purpose." },
                { id: "4.2", code: "4.2", title: "Understanding the needs and expectations of interested parties", description: "Determine interested parties and their requirements." },
                { id: "4.3", code: "4.3", title: "Determining the scope of the ISMS", description: "Determine boundaries and applicability of the ISMS." },
                { id: "4.4", code: "4.4", title: "Information security management system", description: "Establish, implement, maintain and continually improve the ISMS." },
                { id: "5.1", code: "5.1", title: "Leadership and commitment", description: "Top management shall demonstrate leadership and commitment." },
                { id: "5.2", code: "5.2", title: "Policy", description: "Establish an information security policy." },
                { id: "5.3", code: "5.3", title: "Organizational roles, responsibilities and authorities", description: "Ensure responsibilities and authorities are assigned." },
                { id: "6.1.1", code: "6.1.1", title: "General actions to address risks and opportunities", description: "Determine risks and opportunities to be addressed." },
                { id: "6.1.2", code: "6.1.2", title: "Information security risk assessment", description: "Define and apply an information security risk assessment process." },
                { id: "6.1.3", code: "6.1.3", title: "Information security risk treatment", description: "Define and apply an information security risk treatment process." },
                { id: "6.2", code: "6.2", title: "Information security objectives and plans", description: "Establish information security objectives at relevant functions." },
                { id: "6.3", code: "6.3", title: "Planning of changes", description: "Changes shall be carried out in a planned manner." }
            ]},
            { id: "SUPPORT_27001", title: "Support (7)", icon: "LayoutList", clauses: [
                { id: "7.1", code: "7.1", title: "Resources", description: "Determine and provide necessary resources." },
                { id: "7.2", code: "7.2", title: "Competence", description: "Ensure necessary competence of persons." },
                { id: "7.3", code: "7.3", title: "Awareness", description: "Ensure persons are aware of policy and contribution." },
                { id: "7.4", code: "7.4", title: "Communication", description: "Determine need for internal and external communications." },
                { id: "7.5", code: "7.5", title: "Documented information", description: "Include required and necessary documented information." }
            ]},
            { id: "DO_27001", title: "Do (8) Operation", icon: "Cpu", clauses: [
                { id: "8.1", code: "8.1", title: "Operational planning and control", description: "Plan, implement and control processes to meet requirements." },
                { id: "8.2", code: "8.2", title: "Information security risk assessment", description: "Perform risk assessments at planned intervals." },
                { id: "8.3", code: "8.3", title: "Information security risk treatment", description: "Implement risk treatment plan." }
            ]},
             { id: "CHECK_ACT_27001", title: "Check & Act (9-10) Performance & Improvement", icon: "CheckThick", clauses: [
                { id: "9.1", code: "9.1", title: "Monitoring, measurement, analysis and evaluation", description: "Evaluate performance and effectiveness of ISMS." },
                { id: "9.2", code: "9.2", title: "Internal audit", description: "Conduct internal audits at planned intervals." },
                { id: "9.3", code: "9.3", title: "Management review", description: "Top management reviews ISMS at planned intervals." },
                { id: "10.1", code: "10.1", title: "Continual improvement", description: "Continually improve suitability, adequacy and effectiveness." },
                { id: "10.2", code: "10.2", title: "Nonconformity and corrective action", description: "React to nonconformity and take corrective action." }
            ]}
        ]
    },
    "ISO 9001:2015": {
        name: "ISO 9001:2015 (QMS)",
        description: "Quality Management System",
        groups: [
            { id: "PLAN_9001", title: "Plan (4-6) Context & Planning", icon: "FileShield", clauses: [
                { id: "4.1", code: "4.1", title: "Understanding the organization and its context", description: "Determine external and internal issues relevant to purpose and strategic direction." },
                { id: "4.2", code: "4.2", title: "Understanding the needs and expectations of interested parties", description: "Determine interested parties and their requirements relevant to the QMS." },
                { id: "4.3", code: "4.3", title: "Determining the scope of the QMS", description: "Determine boundaries and applicability of the QMS." },
                { id: "4.4", code: "4.4", title: "Quality management system and its processes", description: "Establish, implement, maintain and continually improve the QMS." },
                { id: "5.1", code: "5.1", title: "Leadership and commitment", description: "Top management shall demonstrate leadership and commitment with respect to the QMS and customer focus." },
                { id: "5.2", code: "5.2", title: "Policy", description: "Establish, implement and maintain a quality policy." },
                { id: "5.3", code: "5.3", title: "Organizational roles, responsibilities and authorities", description: "Ensure responsibilities and authorities are assigned, communicated and understood." },
                { id: "6.1", code: "6.1", title: "Actions to address risks and opportunities", description: "Determine risks and opportunities to be addressed to ensure QMS results." },
                { id: "6.2", code: "6.2", title: "Quality objectives and planning to achieve them", description: "Establish quality objectives at relevant functions, levels and processes." },
                { id: "6.3", code: "6.3", title: "Planning of changes", description: "Changes to the QMS shall be carried out in a planned manner." }
            ]},
            { id: "SUPPORT_9001", title: "Support (7)", icon: "LayoutList", clauses: [
                { id: "7.1", code: "7.1", title: "Resources", description: "Determine and provide necessary resources (People, Infrastructure, Environment, Monitoring, Knowledge)." },
                { id: "7.2", code: "7.2", title: "Competence", description: "Ensure necessary competence of persons affecting quality performance." },
                { id: "7.3", code: "7.3", title: "Awareness", description: "Ensure persons are aware of policy, objectives and contribution." },
                { id: "7.4", code: "7.4", title: "Communication", description: "Determine internal and external communications relevant to the QMS." },
                { id: "7.5", code: "7.5", title: "Documented information", description: "Include required and necessary documented information." }
            ]},
            { id: "DO_9001", title: "Do (8) Operation", icon: "Cpu", clauses: [
                { id: "8.1", code: "8.1", title: "Operational planning and control", description: "Plan, implement and control processes to meet requirements." },
                { id: "8.2", code: "8.2", title: "Requirements for products and services", description: "Customer communication, determining and review of requirements." },
                { id: "8.3", code: "8.3", title: "Design and development of products and services", description: "Establish a design and development process." },
                { id: "8.4", code: "8.4", title: "Control of externally provided processes, products and services", description: "Ensure externally provided processes, products and services conform to requirements." },
                { id: "8.5", code: "8.5", title: "Production and service provision", description: "Implement production and service provision under controlled conditions." },
                { id: "8.6", code: "8.6", title: "Release of products and services", description: "Verify requirements have been met before release." },
                { id: "8.7", code: "8.7", title: "Control of nonconforming outputs", description: "Ensure outputs that do not conform are identified and controlled." }
            ]},
            { id: "CHECK_ACT_9001", title: "Check & Act (9-10) Performance & Improvement", icon: "CheckThick", clauses: [
                { id: "9.1", code: "9.1", title: "Monitoring, measurement, analysis and evaluation", description: "Determine what needs to be monitored and evaluated. Customer Satisfaction." },
                { id: "9.2", code: "9.2", title: "Internal audit", description: "Conduct internal audits at planned intervals." },
                { id: "9.3", code: "9.3", title: "Management review", description: "Top management reviews QMS at planned intervals." },
                { id: "10.1", code: "10.1", title: "General", description: "Determine and select opportunities for improvement." },
                { id: "10.2", code: "10.2", title: "Nonconformity and corrective action", description: "React to nonconformity and take corrective action." },
                { id: "10.3", code: "10.3", title: "Continual improvement", description: "Continually improve suitability, adequacy and effectiveness of the QMS." }
            ]}
        ]
    },
    "ISO 14001:2015": {
        name: "ISO 14001:2015 (EMS)",
        description: "Environmental Management System",
        groups: [
            { id: "PLAN_14001", title: "Plan (4-6) Context & Planning", icon: "FileShield", clauses: [
                { id: "4.1", code: "4.1", title: "Understanding the organization and its context", description: "Determine external and internal issues relevant to environmental purpose." },
                { id: "4.2", code: "4.2", title: "Understanding the needs and expectations of interested parties", description: "Determine interested parties and their requirements." },
                { id: "4.3", code: "4.3", title: "Determining the scope of the EMS", description: "Determine boundaries and applicability of the EMS." },
                { id: "4.4", code: "4.4", title: "Environmental management system", description: "Establish, implement, maintain and continually improve the EMS." },
                { id: "5.1", code: "5.1", title: "Leadership and commitment", description: "Top management shall demonstrate leadership and commitment with respect to the EMS." },
                { id: "5.2", code: "5.2", title: "Environmental policy", description: "Establish, implement and maintain an environmental policy." },
                { id: "5.3", code: "5.3", title: "Organizational roles, responsibilities and authorities", description: "Ensure responsibilities and authorities are assigned and communicated." },
                { id: "6.1", code: "6.1", title: "Actions to address risks and opportunities", description: "Determine risks/opportunities related to environmental aspects and compliance obligations." },
                { id: "6.2", code: "6.2", title: "Environmental objectives and planning to achieve them", description: "Establish environmental objectives at relevant functions and levels." },
                { id: "6.3", code: "6.3", title: "Planning of changes", description: "Changes to the EMS shall be carried raut in a planned manner." }
            ]},
            { id: "SUPPORT_14001", title: "Support (7)", icon: "LayoutList", clauses: [
                { id: "7.1", code: "7.1", title: "Resources", description: "Determine and provide necessary resources for the EMS." },
                { id: "7.2", code: "7.2", title: "Competence", description: "Ensure necessary competence of persons doing work under control." },
                { id: "7.3", code: "7.3", title: "Awareness", description: "Ensure persons are aware of environmental policy and aspects." },
                { id: "7.4", code: "7.4", title: "Communication", description: "Determine internal and external communications relevant to the EMS." },
                { id: "7.5", code: "7.5", title: "Documented information", description: "Include required and necessary documented information." }
            ]},
            { id: "DO_14001", title: "Do (8) Operation", icon: "Cpu", clauses: [
                { id: "8.1", code: "8.1", title: "Operational planning and control", description: "Establish, implement, control and maintain processes needed for EMS." },
                { id: "8.2", code: "8.2", title: "Emergency preparedness and response", description: "Establish, implement and maintain processes needed to respond to potential emergency situations." }
            ]},
            { id: "CHECK_ACT_14001", title: "Check & Act (9-10) Performance & Improvement", icon: "CheckThick", clauses: [
                { id: "9.1", code: "9.1", title: "Monitoring, measurement, analysis and evaluation", description: "Monitor, measure, analyze and evaluate environmental performance." },
                { id: "9.2", code: "9.2", title: "Internal audit", description: "Conduct internal audits at planned intervals." },
                { id: "9.3", code: "9.3", title: "Management review", description: "Top management reviews EMS at planned intervals." },
                { id: "10.1", code: "10.1", title: "General", description: "Determine opportunities for improvement." },
                { id: "10.2", code: "10.2", title: "Nonconformity and corrective action", description: "React to nonconformity and take corrective action." },
                { id: "10.3", code: "10.3", title: "Continual improvement", description: "Continually improve suitability, adequacy and effectiveness of the EMS." }
            ]}
        ]
    }
};

export const RELEASE_NOTES = [
    {
        version: "1.1 (Stable)",
        date: new Date().toISOString().substring(0, 10),
        features: [
            "BASELINED TO STABLE V1.1.",
            "IMPROVEMENT: Export Notes now forces 100% English translation.",
            "IMPROVEMENT: Export Report now forces 100% English translation.",
            "FIXED BUG: Corrected Sparkle Loader contrast.",
            "IMPROVEMENT: Enhanced Report Generation visual loading effect."
        ]
    }
];

export const KEY_CAPABILITIES = [
    { icon: "ScanText", title: "Smart OCR", desc: "Extracts text/tables from Images & PDFs." },
    { icon: "Wand2", title: "AI Analysis", desc: "Evaluate compliance." },
    { icon: "FileText", title: "Auto Report", desc: "Generate findings." },
    { icon: "LayoutList", title: "Multi-Standard", desc: "ISO 27001, 9001, etc." }
];

export const INITIAL_EVIDENCE = `AUDIT INFO: Interview with [Interviewee Name], Process [Clause ID], Date [YYYY/MM/DD].
AUDITOR CONCLUSION (OPTIONAL): Preliminary finding is Compliant.
EVIDENCE: The documented procedure PR-01 for [Process Name] is available, rev 3. Records for the last three months show consistent adherence to process requirements.`;