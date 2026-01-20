
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
    address: string;
    scope: string;
    soa: string;
    smo: string;
    auditor: string;
    leadAuditorCode?: string; 
    type: string;
    totalEmployees?: number; // Global Headcount Cap
    totalSites?: number; // New: Total Sites count
}

export interface PrivacySettings {
    maskCompany: boolean;
    maskSmo: boolean;
    maskPeople: boolean;
    maskEmail: boolean;
    maskPhone: boolean;
    maskAddress: boolean;
    maskIP: boolean;
}

export interface AuditProcess {
    id: string;
    name: string;
    competencyCode?: string;
    siteIds?: string[]; 
    evidence: string;
    interviewees: string[];
    matrixData: Record<string, MatrixRow[]>;
    evidenceTags: EvidenceTag[];
    uploadedFiles: any[];
}

export type FindingStatus = 'COMPLIANT' | 'NC_MAJOR' | 'NC_MINOR' | 'OFI' | 'N_A';
export type FindingsViewMode = 'list' | 'matrix';

export interface AnalysisResult {
    clauseId: string;
    status: FindingStatus;
    reason: string;
    reason_en?: string;
    reason_vi?: string;
    suggestion: string;
    evidence: string;
    conclusion_report: string;
    crossRefs?: string[]; 
    processId?: string;
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
        activeProcessId: string;
        processes: AuditProcess[];
        auditSites?: AuditSite[];
        auditTeam?: AuditMember[];
        auditPlanConfig?: AuditPlanConfig;
        auditSchedule?: AuditScheduleItem[];
        analysisResult: AnalysisResult[] | null;
        selectedFindings: Record<string, boolean>;
        finalReportText: string | null;
    };
}

// --- SMART PLANNING TYPES ---

export interface AuditSite {
    id: string;
    name: string;
    address: string;
    scope: string; 
    isMain: boolean;
    employeeCount?: number; // New: Headcount at this specific site
}

export interface AuditMember {
    id: string;
    name: string;
    role: 'Lead Auditor' | 'Auditor' | 'Technical Expert';
    competencyCodes: string;
    manDays: number;
    isRemote: boolean; 
    availability?: string; 
}

export interface AuditPlanConfig {
    auditDates: string[]; 
    startTime: string;
    endTime: string;
    lunchStartTime: string; 
    lunchEndTime: string;   
}

export interface AuditScheduleItem {
    day: number;
    date: string; 
    timeSlot: string;
    activity: string;
    siteName: string;
    auditorName: string;
    processName?: string;
    clauseRefs?: string[];
    isRemote?: boolean;
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
