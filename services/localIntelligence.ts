
import { AnalysisResult } from "../types";

/**
 * ISO Audit Pro - Local Intelligence
 * Provides fallback analysis when offline or when API quota is exceeded.
 * Uses rule-based heuristics instead of heavy LLM weights for browser performance.
 */

const KEYWORDS = {
    NC_MAJOR: ['systemic failure', 'total breakdown', 'missing process', 'không có quy trình', 'chưa thiết lập', 'critical', 'nghiêm trọng'],
    NC_MINOR: ['isolated', 'single instance', 'partial', 'not fully', 'chưa đầy đủ', 'một số', 'incomplete', 'lỗi nhỏ'],
    OFI: ['improve', 'better', 'consider', 'cân nhắc', 'cải tiến', 'optimize', 'efficiency'],
    COMPLIANT: ['conforms', 'available', 'maintained', 'phù hợp', 'đầy đủ', 'tuân thủ', 'verified', 'đạt']
};

export const LocalIntelligence = {
    analyze(clauseCode: string, clauseTitle: string, evidence: string): string {
        const lowerEvidence = evidence.toLowerCase();
        let status = 'N_A';
        let reason = 'Offline Analysis: Insufficient data to determine compliance.';
        let suggestion = '';

        // 1. Heuristic Scoring
        let scores = { MAJOR: 0, MINOR: 0, OFI: 0, COMPLIANT: 0 };

        KEYWORDS.NC_MAJOR.forEach(w => { if(lowerEvidence.includes(w)) scores.MAJOR += 2; });
        KEYWORDS.NC_MINOR.forEach(w => { if(lowerEvidence.includes(w)) scores.MINOR += 1; });
        KEYWORDS.OFI.forEach(w => { if(lowerEvidence.includes(w)) scores.OFI += 1; });
        KEYWORDS.COMPLIANT.forEach(w => { if(lowerEvidence.includes(w)) scores.COMPLIANT += 1; });

        // 2. Determination
        if (scores.MAJOR > 0) {
            status = 'NC_MAJOR';
            reason = 'Offline Analysis detected critical keywords indicating a systemic issue.';
            suggestion = 'Review the entire process and establish missing controls immediately.';
        } else if (scores.MINOR > scores.COMPLIANT) {
            status = 'NC_MINOR';
            reason = 'Offline Analysis detected potential gaps in implementation.';
            suggestion = 'Investigate specific instances and correct them.';
        } else if (scores.OFI > 0) {
            status = 'OFI';
            reason = 'Opportunities for improvement found in text.';
            suggestion = 'Consider optimizing based on best practices.';
        } else if (scores.COMPLIANT > 0) {
            status = 'COMPLIANT';
            reason = 'Evidence suggests requirements are met.';
        } else {
            // Fallback if no keywords found but evidence exists
            if (evidence.length > 50) {
                status = 'COMPLIANT'; // Benefit of the doubt in offline mode
                reason = 'Offline Analysis: No obvious non-conformity keywords detected.';
            }
        }

        // 3. Construct JSON response simulating LLM
        const result = {
            clauseId: clauseCode,
            status: status,
            reason: reason,
            evidence: evidence.substring(0, 100) + '...', // Snippet
            suggestion: suggestion,
            conclusion_report: `[OFFLINE] ${reason}`,
            crossRefs: []
        };

        return JSON.stringify(result);
    }
};
