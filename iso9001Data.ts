import { Standard } from './types';

export const ISO9001: Standard = {
    name: "ISO 9001:2015 (QMS)",
    description: "Quality Management System",
    groups: [
        { id: "PLAN_9001", title: "Plan (4-6) Context & Leadership", icon: "FileShield", clauses: [
            { id: "4", code: "4", title: "Context of organization", description: "Internal and external issues that affect its ability to achieve intended results.", subClauses: [
                { id: "4.1", code: "4.1", title: "Understanding the organization", description: "Determining internal and external issues relevant to its purpose." },
                { id: "4.2", code: "4.2", title: "Interested parties", description: "Understanding the needs and expectations of stakeholders." },
                { id: "4.3", code: "4.3", title: "Scope of QMS", description: "Determining the boundaries and applicability of the quality system." },
                { id: "4.4", code: "4.4", title: "QMS processes", description: "Establishing, implementing, and maintaining processes." }
            ]},
            { id: "5", code: "5", title: "Leadership", description: "Top management commitment, policy and roles.", subClauses: [
                { id: "5.1", code: "5.1", title: "Leadership commitment", description: "Demonstrating leadership and commitment to customer focus." },
                { id: "5.2", code: "5.2", title: "Policy", description: "Establishing and communicating the quality policy." },
                { id: "5.3", code: "5.3", title: "Roles & Authorities", description: "Ensuring responsibilities and authorities are assigned." }
            ]},
            { id: "6", code: "6", title: "Planning", description: "Risks, opportunities and quality objectives.", subClauses: [
                { id: "6.1", code: "6.1", title: "Risks & Opportunities", description: "Actions to address risks and opportunities." },
                { id: "6.2", code: "6.2", title: "Quality objectives", description: "Establishing objectives and planning to achieve them." },
                { id: "6.3", code: "6.3", title: "Planning of changes", description: "Carrying out changes in a planned manner." }
            ]}
        ]},
        { id: "SUPPORT_9001", title: "Support (7) Resources", icon: "LayoutList", clauses: [
            { id: "7.1", code: "7.1", title: "Resources", description: "Providing necessary resources for the QMS.", subClauses: [
                { id: "7.1.1", code: "7.1.1", title: "General", description: "Determining and providing resources for QMS." },
                { id: "7.1.2", code: "7.1.2", title: "People", description: "Providing persons necessary for effective implementation." },
                { id: "7.1.3", code: "7.1.3", title: "Infrastructure", description: "Maintenance of buildings, equipment, and transport." },
                { id: "7.1.4", code: "7.1.4", title: "Process Environment", description: "Managing social (non-discriminatory), psychological (stress-reducing), and physical (temperature, hygiene) factors." },
                { id: "7.1.5", code: "7.1.5", title: "Monitoring resources", description: "Calibration and measurement traceability." },
                { id: "7.1.6", code: "7.1.6", title: "Knowledge", description: "Maintaining organizational knowledge and lessons learned." }
            ]},
            { id: "7.2", code: "7.2", title: "Competence", description: "Ensuring workers are competent based on education/training." },
            { id: "7.3", code: "7.3", title: "Awareness", description: "Ensuring persons are aware of quality policy and objectives." },
            { id: "7.4", code: "7.4", title: "Communication", description: "Determining internal and external communications." },
            { id: "7.5", code: "7.5", title: "Documented info", description: "Control of information required by the standard.", subClauses: [
                { id: "7.5.1", code: "7.5.1", title: "General", description: "Determining necessary documented information for QMS." },
                { id: "7.5.2", code: "7.5.2", title: "Creating & Updating", description: "Ensuring proper identification, format, and review." },
                { id: "7.5.3", code: "7.5.3", title: "Control of info", description: "Ensuring availability, protection, and storage control.", subClauses: [
                    { id: "7.5.3.1", code: "7.5.3.1", title: "Availability", description: "Ensuring info is available where needed." },
                    { id: "7.5.3.2", code: "7.5.3.2", title: "Control", description: "Distribution, access, retrieval and use." }
                ]}
            ]}
        ]},
        { id: "DO_9001", title: "Do (8) Operation", icon: "Cpu", clauses: [
            { id: "8.1", code: "8.1", title: "Operational planning", description: "Control of processes to meet P/S requirements." },
            { id: "8.2", code: "8.2", title: "Requirements for P/S", description: "Determining requirements and communicating with customers." },
            { id: "8.3", code: "8.3", title: "Design and development", description: "D&D of products and services.", subClauses: [
                { id: "8.3.1", code: "8.3.1", title: "General", description: "Establishing a D&D process." },
                { id: "8.3.2", code: "8.3.2", title: "Planning", description: "Determining D&D stages and controls." },
                { id: "8.3.3", code: "8.3.3", title: "Inputs", description: "Requirements essential for D&D." },
                { id: "8.3.4", code: "8.3.4", title: "Controls", description: "Ensuring reviews, verification, and validation." },
                { id: "8.3.5", code: "8.3.5", title: "Outputs", description: "Meeting input requirements." },
                { id: "8.3.6", code: "8.3.6", title: "Changes", description: "Controlling modifications to D&D." }
            ]},
            { id: "8.4", code: "8.4", title: "External Providers", description: "Control of externally provided P/S.", subClauses: [
                { id: "8.4.1", code: "8.4.1", title: "General", description: "Evaluating and selecting external providers." },
                { id: "8.4.2", code: "8.4.2", title: "Type & Extent", description: "Controlling the impact of providers on results." },
                { id: "8.4.3", code: "8.4.3", title: "Information", description: "Communicating requirements to providers clearly." }
            ]},
            { id: "8.5", code: "8.5", title: "Production & Delivery", description: "Control of production and service provision.", subClauses: [
                { id: "8.5.1", code: "8.5.1", title: "Control", description: "Availability of info, equipment and monitoring." },
                { id: "8.5.2", code: "8.5.2", title: "Identification", description: "Ensuring traceability throughout provision." },
                { id: "8.5.3", code: "8.5.3", title: "Property", description: "Safeguarding customer or provider assets." },
                { id: "8.5.4", code: "8.5.4", title: "Preservation", description: "Ensuring conformity during processing." },
                { id: "8.5.5", code: "8.5.5", title: "Post-delivery", description: "Statutory, regulatory, and warranty duties." },
                { id: "8.5.6", code: "8.5.6", title: "Control of changes", description: "Reviewing and controlling changes for production." }
            ]},
            { id: "8.6", code: "8.6", title: "Release of P/S", description: "Verification that requirements have been met." },
            { id: "8.7", code: "8.7", title: "Nonconforming outputs", description: "Ensuring unintended use is prevented." }
        ]},
        { id: "CHECK_ACT_9001", title: "Check & Act (9-10)", icon: "CheckThick", clauses: [
            { id: "9.1", code: "9.1", title: "Monitoring & Evaluation", description: "Determining what needs to be monitored." },
            { id: "9.2", code: "9.2", title: "Internal audit", description: "Scheduled review of QMS performance." },
            { id: "9.3", code: "9.3", title: "Management review", description: "Top management review of system suitability." },
            { id: "10.1", code: "10.1", title: "Improvement", description: "Determining opportunities for improvement." },
            { id: "10.2", code: "10.2", title: "NC & Corrective action", description: "Managing nonconformities and root causes." },
            { id: "10.3", code: "10.3", title: "Continual improvement", description: "Continually improving QMS effectiveness." }
        ]}
    ]
};
