import { Standard } from './types';

export const ISO27001: Standard = {
    name: "ISO/IEC 27001:2022 (ISMS)",
    description: "Information Security Management System",
    groups: [
        { id: "PLAN_27001", title: "Plan (4-6) Context & Leadership", icon: "FileShield", clauses: [
            { id: "4", code: "4", title: "Context of organization", description: "Internal/external issues and scope.", subClauses: [
                { id: "4.1", code: "4.1", title: "Context", description: "Identifying security issues." },
                { id: "4.2", code: "4.2", title: "Interested parties", description: "Needs and expectations." },
                { id: "4.3", code: "4.3", title: "Scope", description: "Determining ISMS boundaries." },
                { id: "4.4", code: "4.4", title: "ISMS System", description: "Establishing processes." }
            ]},
            { id: "5", code: "5", title: "Leadership", description: "Commitment and Policy.", subClauses: [
                { id: "5.1", code: "5.1", title: "Leadership & Commitment", description: "Accountability." },
                { id: "5.2", code: "5.2", title: "Policy", description: "InfoSec policy." },
                { id: "5.3", code: "5.3", title: "Roles & Authorities", description: "Assigning responsibilities." }
            ]},
            { id: "6", code: "6", title: "Planning", description: "Risk treatment.", subClauses: [
                { id: "6.1.1", code: "6.1.1", title: "General", description: "Risk actions." },
                { id: "6.1.2", code: "6.1.2", title: "Risk assessment", description: "Information security risk process." },
                { id: "6.1.3", code: "6.1.3", title: "Risk treatment", description: "SoA and planning." },
                { id: "6.2", code: "6.2", title: "Security objectives", description: "Achievement planning." }
            ]}
        ]},
        { id: "SUPPORT_27001", title: "Support (7) Resources", icon: "LayoutList", clauses: [
            { id: "7.1", code: "7.1", title: "Resources", description: "Availability." },
            { id: "7.2", code: "7.2", title: "Competence", description: "Training requirements." },
            { id: "7.3", code: "7.3", title: "Awareness", description: "Understanding policy." },
            { id: "7.4", code: "7.4", title: "Communication", description: "Info flow rules." },
            { id: "7.5", code: "7.5", title: "Documented info", description: "Control of records." }
        ]},
        { id: "DO_27001", title: "Do (8) Operation", icon: "Cpu", clauses: [
            { id: "8.1", code: "8.1", title: "Operational planning", description: "Securing processes." },
            { id: "8.2", code: "8.2", title: "Risk assessment", description: "Execution at intervals." },
            { id: "8.3", code: "8.3", title: "Risk treatment", description: "Implementing treatments." }
        ]},
        { id: "CHECK_ACT_27001", title: "Check & Act (9-10)", icon: "CheckThick", clauses: [
            { id: "9.1", code: "9.1", title: "Monitoring", description: "Measuring effectiveness." },
            { id: "9.2", code: "9.2", title: "Internal audit", description: "Periodic checks." },
            { id: "9.3", code: "9.3", title: "Management review", description: "Strategic eval." },
            { id: "10.1", code: "10.1", title: "Continual improvement", description: "Growth." },
            { id: "10.2", code: "10.2", title: "Nonconformity", description: "Corrective actions." }
        ]},
        { id: "ANNEX_A_5", title: "Annex A.5 Organizational (37 Controls)", icon: "Lock", clauses: [
            { id: "A.5.1", code: "A.5.1", title: "Policies for information security", description: "Reviewed for suitability." },
            { id: "A.5.2", code: "A.5.2", title: "InfoSec roles", description: "Defined responsibilities." },
            { id: "A.5.3", code: "A.5.3", title: "Segregation of duties", description: "Conflict reduction." },
            { id: "A.5.4", code: "A.5.4", title: "Management responsibilities", description: "Committing to security." },
            { id: "A.5.5", code: "A.5.5", title: "Contact with authorities", description: "Regulation flow." },
            { id: "A.5.6", code: "A.5.6", title: "Special interest groups", description: "Trend tracking." },
            { id: "A.5.7", code: "A.5.7", title: "Threat intelligence", description: "Info collection." },
            { id: "A.5.8", code: "A.5.8", title: "IS in project mgmt", description: "Lifecycle inclusion." },
            { id: "A.5.9", code: "A.5.9", title: "Inventory of assets", description: "Critical asset list." },
            { id: "A.5.10", code: "A.5.10", title: "Acceptable use of assets", description: "Usage rules." },
            { id: "A.5.11", code: "A.5.11", title: "Return of assets", description: "Termination retrieval." },
            { id: "A.5.12", code: "A.5.12", title: "Classification of info", description: "Labeling based on value." },
            { id: "A.5.13", code: "A.5.13", title: "Labeling of info", description: "Visual markers." },
            { id: "A.5.14", code: "A.5.14", title: "Information transfer", description: "Securing transit." },
            { id: "A.5.15", code: "A.5.15", title: "Access control", description: "Authorization rules." },
            { id: "A.5.16", code: "A.5.16", title: "Identity management", description: "User ID lifecycle." },
            { id: "A.5.17", code: "A.5.17", title: "Authentication info", description: "Secrets management." },
            { id: "A.5.18", code: "A.5.18", title: "Access rights", description: "Provisioning/revoking." },
            { id: "A.5.19", code: "A.5.19", title: "IS in supplier relationships", description: "Agreements." },
            { id: "A.5.20", code: "A.5.20", title: "Supplier agreements", description: "Addressing security." },
            { id: "A.5.21", code: "A.5.21", title: "ICT supply chain", description: "Sourcing risks." },
            { id: "A.5.22", code: "A.5.22", title: "Monitoring suppliers", description: "Auditing delivery." },
            { id: "A.5.23", code: "A.5.23", title: "Cloud services", description: "SaaS security." },
            { id: "A.5.24", code: "A.5.24", title: "Incident management", description: "Planning response." },
            { id: "A.5.25", code: "A.5.25", title: "Incident assessment", description: "Severity eval." },
            { id: "A.5.26", code: "A.5.26", title: "Incident response", description: "Action taken." },
            { id: "A.5.27", code: "A.5.27", title: "Incident learning", description: "Root cause." },
            { id: "A.5.28", code: "A.5.28", title: "Evidence collection", description: "Forensics." },
            { id: "A.5.29", code: "A.5.29", title: "IS during disruption", description: "BCP security." },
            { id: "A.5.30", code: "A.5.30", title: "ICT readiness", description: "DR planning." },
            { id: "A.5.31", code: "A.5.31", title: "Legal compliance", description: "Regulatory requirements." },
            { id: "A.5.32", code: "A.5.32", title: "IP Rights", description: "Copyright protection." },
            { id: "A.5.33", code: "A.5.33", title: "Protection of records", description: "Integrity." },
            { id: "A.5.34", code: "A.5.34", title: "Privacy of PII", description: "GDPR/Data protection." },
            { id: "A.5.35", code: "A.5.35", title: "Independent review", description: "External auditing." },
            { id: "A.5.36", code: "A.5.36", title: "Policy compliance", description: "Adherence." },
            { id: "A.5.37", code: "A.5.37", title: "Operating procedures", description: "Standard documentation." }
        ]},
        { id: "ANNEX_A_6", title: "Annex A.6 People (8 Controls)", icon: "Users", clauses: [
            { id: "A.6.1", code: "A.6.1", title: "Screening", description: "Background checks." },
            { id: "A.6.2", code: "A.6.2", title: "Terms of employment", description: "HR contracts." },
            { id: "A.6.3", code: "A.6.3", title: "Awareness", description: "InfoSec education." },
            { id: "A.6.4", code: "A.6.4", title: "Disciplinary process", description: "Breach handling." },
            { id: "A.6.5", code: "A.6.5", title: "Termination responsibilities", description: "Post-exit." },
            { id: "A.6.6", code: "A.6.6", title: "Confidentiality", description: "NDAs." },
            { id: "A.6.7", code: "A.6.7", title: "Remote working", description: "Teleworking rules." },
            { id: "A.6.8", code: "A.6.8", title: "Event reporting", description: "Anomaly reporting." }
        ]},
        { id: "ANNEX_A_7", title: "Annex A.7 Physical (14 Controls)", icon: "Building", clauses: [
            { id: "A.7.1", code: "A.7.1", title: "Physical perimeters", description: "Barriers." },
            { id: "A.7.2", code: "A.7.2", title: "Physical entry", description: "Access systems." },
            { id: "A.7.3", code: "A.7.3", title: "Securing offices", description: "Locks." },
            { id: "A.7.4", code: "A.7.4", title: "Security monitoring", description: "CCTV." },
            { id: "A.7.5", code: "A.7.5", title: "Physical protection", description: "Disaster proofing." },
            { id: "A.7.6", code: "A.7.6", title: "Secure areas", description: "Restricted protocols." },
            { id: "A.7.7", code: "A.7.7", title: "Clear desk/screen", description: "Clean policy." },
            { id: "A.7.8", code: "A.7.8", title: "Equipment siting", description: "Safe placement." },
            { id: "A.7.9", code: "A.7.9", title: "Assets off-premises", description: "Mobile security." },
            { id: "A.7.10", code: "A.7.10", title: "Storage media", description: "Drive handling." },
            { id: "A.7.11", code: "A.7.11", title: "Utilities", description: "Power/Water safety." },
            { id: "A.7.12", code: "A.7.12", title: "Cabling security", description: "Line protection." },
            { id: "A.7.13", code: "A.7.13", title: "Equipment maintenance", description: "Care logs." },
            { id: "A.7.14", code: "A.7.14", title: "Secure disposal", description: "Data wiping." }
        ]},
        { id: "ANNEX_A_8", title: "Annex A.8 Technological (34 Controls)", icon: "Cpu", clauses: [
            { id: "A.8.1", code: "A.8.1", title: "Endpoint devices", description: "Device agents." },
            { id: "A.8.2", code: "A.8.2", title: "Privileged access", description: "Admin rights." },
            { id: "A.8.3", code: "A.8.3", title: "Information access", description: "Need-to-know." },
            { id: "A.8.4", code: "A.8.4", title: "Source code access", description: "IP security." },
            { id: "A.8.5", code: "A.8.5", title: "Authentication", description: "MFA usage." },
            { id: "A.8.6", code: "A.8.6", title: "Capacity mgmt", description: "Resources." },
            { id: "A.8.7", code: "A.8.7", title: "Malware protection", description: "AV/EDR." },
            { id: "A.8.8", code: "A.8.8", title: "Vulnerabilities", description: "Patching." },
            { id: "A.8.9", code: "A.8.9", title: "Configuration", description: "Hardening." },
            { id: "A.8.10", code: "A.8.10", title: "Deletion", description: "Erasure." },
            { id: "A.8.11", code: "A.8.11", title: "Data masking", description: "Privacy." },
            { id: "A.8.12", code: "A.8.12", title: "DLP", description: "Leakage prevention." },
            { id: "A.8.13", code: "A.8.13", title: "Backup", description: "Redundancy." },
            { id: "A.8.14", code: "A.8.14", title: "Redundancy ICT", description: "HA systems." },
            { id: "A.8.15", code: "A.8.15", title: "Logging", description: "Audit trails." },
            { id: "A.8.16", code: "A.8.16", title: "Monitoring", description: "Health alerts." },
            { id: "A.8.17", code: "A.8.17", title: "Clock sync", description: "NTP." },
            { id: "A.8.18", code: "A.8.18", title: "Privileged utilities", description: "Restrict tools." },
            { id: "A.8.19", code: "A.8.19", title: "Software install", description: "Whitelisting." },
            { id: "A.8.20", code: "A.8.20", title: "Network security", description: "Firewalls." },
            { id: "A.8.21", code: "A.8.21", title: "Network services", description: "VPN/Gateways." },
            { id: "A.8.22", code: "A.8.22", title: "Segregation", description: "VLANs." },
            { id: "A.8.23", code: "A.8.23", title: "Web filtering", description: "Proxy." },
            { id: "A.8.24", code: "A.8.24", title: "Cryptography", description: "Encryption." },
            { id: "A.8.25", code: "A.8.25", title: "Secure SDLC", description: "Dev security." },
            { id: "A.8.26", code: "A.8.26", title: "Application security", description: "Design." },
            { id: "A.8.27", code: "A.8.27", title: "Architecture", description: "Engineering." },
            { id: "A.8.28", code: "A.8.28", title: "Secure coding", description: "OWASP." },
            { id: "A.8.29", code: "A.8.29", title: "Security testing", description: "VAPT." },
            { id: "A.8.30", code: "A.8.30", title: "Outsourced dev", description: "Contractor code." },
            { id: "A.8.31", code: "A.8.31", title: "Separation envs", description: "Dev/Prod." },
            { id: "A.8.32", code: "A.8.32", title: "Change mgmt", description: "RFCs." },
            { id: "A.8.33", code: "A.8.33", title: "Test info", description: "Protect data." },
            { id: "A.8.34", code: "A.8.34", title: "IS during audit", description: "Auditor access." }
        ]}
    ]
};