import { Standard } from './types';

export const ISO14001: Standard = {
    name: "ISO 14001:2015 (EMS)",
    description: "Environmental Management System",
    groups: [
        { id: "PLAN_14001", title: "Plan (4-6) Context & Leadership", icon: "FileShield", clauses: [
            { id: "4", code: "4", title: "Context", description: "Org Context.", subClauses: [
                { id: "4.1", code: "4.1", title: "Org Context", description: "Env issues." },
                { id: "4.2", code: "4.2", title: "Interested parties", description: "Expectations." },
                { id: "4.3", code: "4.3", title: "Scope", description: "Boundaries." },
                { id: "4.4", code: "4.4", title: "EMS System", description: "Processes." }
            ]},
            { id: "5", code: "5", title: "Leadership", description: "Commitment.", subClauses: [
                { id: "5.1", code: "5.1", title: "Leadership & Commitment", description: "Duty." },
                { id: "5.2", code: "5.2", title: "Environmental Policy", description: "Goals." },
                { id: "5.3", code: "5.3", title: "Org Roles & Responsibilities", description: "Authorities." }
            ]},
            { id: "6", code: "6", title: "Planning", description: "Aspects.", subClauses: [
                { id: "6.1.1", code: "6.1.1", title: "General", description: "Actions." },
                { id: "6.1.2", code: "6.1.2", title: "Environmental aspects", description: "Impacts." },
                { id: "6.1.3", code: "6.1.3", title: "Compliance obligations", description: "Legal." },
                { id: "6.1.4", code: "6.1.4", title: "Planning action", description: "Achievement." },
                { id: "6.2", code: "6.2", title: "Environmental objectives", description: "Plans." }
            ]}
        ]},
        { id: "SUPPORT_DO_14001", title: "Support & Do (7-8) Operation", icon: "Cpu", clauses: [
            { id: "7", code: "7", title: "Support", description: "Resources.", subClauses: [
                { id: "7.1", code: "7.1", title: "Resources", description: "Supply." },
                { id: "7.2", code: "7.2", title: "Competence", description: "Training." },
                { id: "7.3", code: "7.3", title: "Awareness", description: "EMS awareness." },
                { id: "7.4", code: "7.4", title: "Communication", description: "Internal/External.", subClauses: [
                    { id: "7.4.1", code: "7.4.1", title: "General", description: "Criteria." },
                    { id: "7.4.2", code: "7.4.2", title: "Internal", description: "Staff." },
                    { id: "7.4.3", code: "7.4.3", title: "External", description: "Parties." }
                ]},
                { id: "7.5", code: "7.5", title: "Documented info", description: "Control." }
            ]},
            { id: "8", code: "8", title: "Operation", description: "Control.", subClauses: [
                { id: "8.1", code: "8.1", title: "Operational control", description: "Lifecycle." },
                { id: "8.2", code: "8.2", title: "Emergency preparedness", description: "Response." }
            ]}
        ]},
        { id: "CHECK_ACT_14001", title: "Check & Act (9-10) Improvement", icon: "CheckThick", clauses: [
            { id: "9", code: "9", title: "Performance Evaluation", description: "Monitoring.", subClauses: [
                { id: "9.1.1", code: "9.1.1", title: "General", description: "Measurement." },
                { id: "9.1.2", code: "9.1.2", title: "Compliance evaluation", description: "Audit." },
                { id: "9.2", code: "9.2", title: "Internal audit", description: "Scheduled review." },
                { id: "9.3", code: "9.3", title: "Management review", description: "Review outputs." }
            ]},
            { id: "10", code: "10", title: "Improvement", description: "Recurrence.", subClauses: [
                { id: "10.1", code: "10.1", title: "General", description: "Performance." },
                { id: "10.2", code: "10.2", title: "Nonconformity", description: "Corrective action." },
                { id: "10.3", code: "10.3", title: "Continual improvement", description: "Suitability." }
            ]}
        ]}
    ]
};
