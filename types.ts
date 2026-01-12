
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
    address: string; // New field
    scope: string;   // New field
    soa: string;     // New field (ISO 27001 specific)
    smo: string;
    auditor: string;
    type: string;
    // Interviewee removed from global scope, moved to AuditProcess
}

export interface PrivacySettings {
    maskCompany: boolean;
    maskSmo: boolean;
    maskPeople: boolean; // Auditee/Interiewees
    maskEmail: boolean;
    maskPhone: boolean;
    maskAddress: boolean;
    maskIP: boolean;
}

// --- NEW PROCESS ARCHITECTURE (formerly Scope) ---
export interface AuditProcess {
    id: string;
    name: string; // e.g., "Purchasing", "Production", "Management"
    evidence: string; // Raw text evidence for this process
    interviewees: string[]; // List of people interviewed for this process
    matrixData: Record<string, MatrixRow[]>; // Matrix data for this process
    evidenceTags: EvidenceTag[];
    uploadedFiles: any[]; // Store file references per process
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
    crossRefs?: string[]; 
    processId?: string; // Track which process this finding belongs to
    processName?: string;
}

export interface FindingDetail {
    classification: 'N_A' | 'OFI' | 'NC_Minor' | 'NC_Major';
}

export interface ApiKeyProfile {
    id: string;
    label: string;
    key: string;
    status: 'valid' | 'invalid' | 'quota_exceeded' | 'checking' | 'unknown' | 'referrer_error';
    activeModel?: string; 
    lastResetDate?: string; 
    latency: number; 
    lastChecked: string;
}

export interface SessionSnapshot {
    id: string;
    timestamp: number;
    label: string;
    triggerType: 'AUTO_SAVE' | 'MANUAL_BACKUP'; 
    data: {
        standardKey: string;
        auditInfo: AuditInfo;
        selectedClauses: string[];
        privacySettings?: PrivacySettings;
        
        // Multi-Process Data Structure
        activeProcessId: string;
        processes: AuditProcess[];
        
        analysisResult: AnalysisResult[] | null;
        selectedFindings: Record<string, boolean>;
        finalReportText: string | null;
    };
}

// --- EXISTING TYPES ---

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

export interface UploadedFile {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'success' | 'error';
    result?: string;
    error?: string;
}
