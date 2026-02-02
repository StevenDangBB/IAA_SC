
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
        
        // IMPROVED REGEX:
        // 1. Supports Annex controls starting with 'A.' (e.g., A.5.1) or just digits (4.1)
        // 2. Handles optional trailing dots (4.1.) common in PDF extraction
        // 3. Captures the Title line
        const headerRegex = /(?:^|\n)\s*((?:A\.)?\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\.?)\s+([^\n]+)/gi;
        
        let match;
        const matches: { code: string, title: string, index: number }[] = [];

        // 1. Find all headers positions
        while ((match = headerRegex.exec(cleanText)) !== null) {
            let code = match[1].trim();
            // Normalize: Remove trailing dot if present (e.g. "4.1." -> "4.1") to match System Keys
            if (code.endsWith('.')) {
                code = code.slice(0, -1);
            }

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
            const firstLineBreak = rawSection.indexOf('\n');
            const content = firstLineBreak > -1 ? rawSection.substring(firstLineBreak).trim() : rawSection;

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

    /**
     * HYBRID SEGMENTATION (AI-Assisted)
     * Takes the high-quality header list from AI and uses it to slice the raw text precisely.
     * This is far more accurate than Regex alone for cases like "7.5".
     */
    performHybridSegmentation(fullText: string, aiHeaders: { code: string, title: string }[]): { code: string, title: string, content: string }[] {
        if (!fullText || !aiHeaders || aiHeaders.length === 0) return [];
        
        const cleanText = fullText.replace(/\r\n/g, '\n');
        const results: { code: string, title: string, content: string }[] = [];
        
        const foundHeaders: { code: string, title: string, index: number }[] = [];

        // 1. Locate each AI-identified header in the text
        aiHeaders.forEach(h => {
            // Create a flexible regex for this specific header
            const safeCode = h.code.replace(/\./g, '\\.');
            const safeTitle = h.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Allow optional trailing dot in code and fuzzy spacing
            const pattern = new RegExp(`(?:^|\\n)\\s*${safeCode}\\.?\\s+(?:${safeTitle.split(' ').slice(0, 3).join('.*?')})`, 'i');
            
            const match = cleanText.match(pattern);
            if (match && match.index !== undefined) {
                foundHeaders.push({
                    code: h.code, // Use the clean AI code
                    title: h.title,
                    index: match.index
                });
            }
        });

        // Sort found headers by index to ensure correct slicing order
        foundHeaders.sort((a, b) => a.index - b.index);

        // 2. Slice Text
        for (let i = 0; i < foundHeaders.length; i++) {
            const current = foundHeaders[i];
            const next = foundHeaders[i + 1];
            
            const start = current.index;
            const end = next ? next.index : cleanText.length;
            
            const rawSection = cleanText.substring(start, end);
            
            // Remove the header line (approximate)
            const firstLineBreak = rawSection.indexOf('\n');
            const content = firstLineBreak > -1 ? rawSection.substring(firstLineBreak).trim() : rawSection;

            results.push({
                code: current.code,
                title: current.title,
                content: content
            });
        }

        return results;
    },

    extractClauseContent(fullText: string, clauseCode: string, clauseTitle: string): string | null {
        // Fallback for immediate memory search if DB fails
        try {
            const escapedCode = clauseCode.replace(/\./g, '\\.');
            // Robust regex: Matches "4.1" or "4.1." at start of line, captures until next numeric header
            const regex = new RegExp(`(?:^|\\n)\\s*${escapedCode}\\.?\\s+.*?(?=(?:^|\\n)\\s*(?:A\\.)?\\d+\\.\\d+|$)`, 'is');
            const match = fullText.match(regex);
            if (match) return match[0].trim();
        } catch (e) {
            console.error("Fallback extraction failed", e);
        }
        return null;
    }
};
