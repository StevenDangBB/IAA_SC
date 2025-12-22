export interface Clause {
    id: string;
    code: string;
    title: string;
    description: string;
}

export interface Group {
    id: string;
    title: string;
    icon: string;
    clauses: Clause[];
}

export interface Standard {
    name: string;
    description: string;
    groups: Group[];
}

export interface StandardsData {
    [key: string]: Standard;
}

export interface AuditInfo {
    company: string;
    smo: string;
    department: string;
    interviewee: string;
    auditor: string;
    type: string;
}

export interface AnalysisResult {
    clauseId: string;
    status: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING';
    reason: string;
    suggestion: string;
    evidence: string;
    conclusion_report: string;
}

export interface FindingDetail {
    classification: 'N_A' | 'OFI' | 'NC_Minor' | 'NC_Major';
}

export interface FindingStats {
    OFI: number;
    NC_Minor: number;
    NC_Major: number;
}