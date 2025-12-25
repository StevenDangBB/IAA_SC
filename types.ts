
export interface Clause {
    id: string;
    code: string;
    title: string;
    description: string;
    subClauses?: Clause[];
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

export type FindingStatus = 'COMPLIANT' | 'NC_MAJOR' | 'NC_MINOR' | 'OFI' | 'N_A';

export interface AnalysisResult {
    clauseId: string;
    status: FindingStatus;
    reason: string;
    suggestion: string;
    evidence: string;
    conclusion_report: string;
}

export interface FindingDetail {
    classification: 'N_A' | 'OFI' | 'NC_Minor' | 'NC_Major';
}

export interface ApiKeyProfile {
    id: string;
    label: string;
    key: string;
    status: 'valid' | 'invalid' | 'quota_exceeded' | 'checking' | 'unknown';
    latency: number; // in ms
    lastChecked: string;
}
