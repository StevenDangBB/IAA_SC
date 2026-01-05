
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
export type FindingsViewMode = 'list' | 'matrix';

export interface AnalysisResult {
    clauseId: string;
    status: FindingStatus;
    reason: string;
    suggestion: string;
    evidence: string;
    conclusion_report: string;
    crossRefs?: string[]; // New: Cross-reference suggestions
}

export interface FindingDetail {
    classification: 'N_A' | 'OFI' | 'NC_Minor' | 'NC_Major';
}

export interface ApiKeyProfile {
    id: string;
    label: string;
    key: string;
    status: 'valid' | 'invalid' | 'quota_exceeded' | 'checking' | 'unknown' | 'referrer_error';
    activeModel?: string; // The best model currently working for this key
    lastResetDate?: string; // YYYY-MM-DD to track daily resets
    latency: number; // in ms
    lastChecked: string;
}

export interface SessionSnapshot {
    id: string;
    timestamp: number;
    label: string;
    triggerType: 'AUTO_SAVE' | 'MANUAL_BACKUP'; // How this snapshot was created
    data: {
        standardKey: string;
        auditInfo: AuditInfo;
        selectedClauses: string[];
        evidence: string;
        analysisResult: AnalysisResult[] | null;
        selectedFindings: Record<string, boolean>;
        finalReportText: string | null;
        evidenceTags?: EvidenceTag[]; // New field
        matrixData?: Record<string, MatrixRow[]>; // New: Evidence Matrix Data
    };
}

// --- NEW TYPES FOR FEATURES ---

export interface EvidenceTag {
    id: string;
    clauseId: string;
    text: string;
    startIndex: number;
    endIndex: number;
    timestamp: number;
}

export interface MatrixRow {
    id: string;
    requirement: string;
    evidenceInput: string;
    status: 'pending' | 'supplied' | 'missing';
}

export interface VectorRecord {
    id: string;
    text: string;
    embedding: number[];
    metadata: {
        source: string;
        type: 'standard_content' | 'evidence_content';
    };
}

export interface PromptTemplate {
    id: string;
    label: string;
    template: string;
    description: string;
    isSystemDefault?: boolean;
}
