
import { AnalysisResult } from "../types";

/**
 * ISO Audit Pro - Local Intelligence & Structure Parser
 * 
 * CORE FEATURES:
 * 1. Heuristic Analysis (Offline Audit Logic)
 * 2. Structural Parsing (Splitting huge PDFs into granular Clauses)
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
            if (evidence.length > 50) {
                status = 'COMPLIANT'; 
                reason = 'Offline Analysis: No obvious non-conformity keywords detected.';
            }
        }

        const result = {
            clauseId: clauseCode,
            status: status,
            reason: reason,
            evidence: evidence.substring(0, 100) + '...', 
            suggestion: suggestion,
            conclusion_report: `[OFFLINE] ${reason}`,
            crossRefs: []
        };

        return JSON.stringify(result);
    },

    /**
     * ADVANCED STRUCTURE PARSER
     * Scans a full standard text document and splits it into structured objects.
     * { code: "4.1", title: "...", content: "..." }
     */
    parseStandardToStructuralData(fullText: string): { code: string, title: string, content: string }[] {
        if (!fullText) return [];
        
        const cleanText = fullText.replace(/\r\n/g, '\n');
        const results: { code: string, title: string, content: string }[] = [];
        
        // Regex to identify clause headers (e.g., "4.1 Context", "10.2 Nonconformity")
        // Matches start of line + Digits.Digits + Space + Title (Words)
        const headerRegex = /(?:^|\n)\s*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\s+([^\n]+)/g;
        
        let match;
        const matches: { code: string, title: string, index: number }[] = [];

        // 1. Find all headers positions
        while ((match = headerRegex.exec(cleanText)) !== null) {
            // Filter out obviously wrong matches (e.g. inside a sentence)
            // A real header usually doesn't have too much text before it on the same line if it was trimmed,
            // but our regex handles newlines.
            
            // Heuristic: Code should not be too long (ISO usually max 3 levels deep e.g. 8.5.1)
            const code = match[1];
            if (code.length > 10) continue; 

            matches.push({
                code: code,
                title: match[2].trim(),
                index: match.index
            });
        }

        // 2. Extract content between headers
        for (let i = 0; i < matches.length; i++) {
            const current = matches[i];
            const next = matches[i + 1];
            
            const start = current.index;
            const end = next ? next.index : cleanText.length;
            
            // Extract and clean
            const rawSection = cleanText.substring(start, end);
            
            // Remove the header line itself to get just the body content
            // The header is roughly "Code Title" length
            const firstLineBreak = rawSection.indexOf('\n');
            const content = firstLineBreak > -1 ? rawSection.substring(firstLineBreak).trim() : rawSection;

            // Only add if content has substance
            if (content.length > 10) {
                results.push({
                    code: current.code,
                    title: current.title,
                    content: content
                });
            }
        }

        return results;
    },

    // Legacy/Fallback single extractor (Kept for compatibility)
    extractClauseContent(fullText: string, clauseCode: string, clauseTitle: string): string | null {
        // ... (This can leverage the new parser cache ideally, but keeping simple regex for now)
        const parsed = this.parseStandardToStructuralData(fullText);
        const found = parsed.find(p => p.code === clauseCode);
        return found ? found.content : null;
    }
};
