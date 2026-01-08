
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
    },

    /**
     * Extracts text for a specific clause from a large document string using Smart Hierarchical Scanning.
     * Dramatically improved to reduce dependency on AI.
     */
    extractClauseContent(fullText: string, clauseCode: string, clauseTitle: string): string | null {
        if (!fullText) return null;

        // 1. Normalize Text: Normalize newlines and spaces to handle OCR quirks
        // We keep newlines as distinct markers but collapse multiple spaces
        const cleanText = fullText.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');
        const escapedCode = clauseCode.replace(/\./g, '\\.');

        // 2. Define Scan Strategy
        // Strategy A: Strict Header Match (Code + Start of Title) - Highest Confidence
        // ^(Line Start) + Code + (Dot optional) + Space + Title Word
        const titleStart = clauseTitle.split(' ')[0].replace(/[^a-zA-Z0-9]/g, ''); 
        const regexStrict = new RegExp(`(?:^|\\n)\\s*${escapedCode}\\.?\\s+.*${titleStart}`, 'i');

        // Strategy B: Loose Header Match (Code Only at Start of Line) - Medium Confidence
        // Use this if strict fails (common in OCR where title might be misspelled)
        const regexLoose = new RegExp(`(?:^|\\n)\\s*${escapedCode}\\.?\\s+`, 'i');

        // Execute Search
        let match = cleanText.match(regexStrict);
        let matchType = 'strict';
        
        if (!match) {
            match = cleanText.match(regexLoose);
            matchType = 'loose';
        }

        if (match && match.index !== undefined) {
            const startIndex = match.index;
            // Advance past the match header to start capturing content
            const contentStartIndex = startIndex; // Include header in output for context
            
            // 3. Smart End Detection (Lookahead)
            // We need to find where this clause ends. It ends when:
            // a) The next sibling clause starts (e.g. if 4.1, look for 4.2)
            // b) The next parent clause starts (e.g. if 4.1, look for 5 or 5.0 or 5.1)
            // c) A generic new clause pattern starts at the beginning of a line
            
            const parts = clauseCode.split('.').map(Number);
            const lastNum = parts[parts.length - 1];
            
            // Construct next sibling code (e.g., 9.2 -> 9.3)
            const nextSiblingParts = [...parts];
            nextSiblingParts[nextSiblingParts.length - 1] = lastNum + 1;
            const nextSiblingCode = nextSiblingParts.join('\\.');

            // Construct next parent code (e.g., 9.2 -> 10)
            const nextParentCode = (parts[0] + 1).toString();

            // Regex to find the NEXT header. 
            // We look for [NextSibling] OR [NextParent] OR [Generic Clause Pattern like X.X]
            // We prioritize specific next codes.
            
            const restOfText = cleanText.substring(startIndex + match[0].length);
            
            // Dynamic Regex for stopping point
            // Stop at:
            // 1. Next Sibling (e.g. "4.2")
            // 2. Next Parent (e.g. "5." or "5 ")
            // 3. Annex A (Specific to ISO)
            // 4. "Bibliography" or common footer sections if at end
            const stopRegex = new RegExp(`(?:^|\\n)\\s*(${nextSiblingCode}|${nextParentCode}\\.|${nextParentCode}\\s|Annex|Bibliography)`, 'i');
            
            const nextMatch = restOfText.match(stopRegex);
            
            let extractedContent = "";
            
            if (nextMatch && nextMatch.index !== undefined) {
                // Found a logical stopping point
                extractedContent = match[0] + restOfText.substring(0, nextMatch.index);
            } else {
                // No specific sibling/parent found. 
                // Fallback: Look for ANY likely clause header (Digit.Digit) that appears at start of line
                // But we must be careful not to catch bullet points like "1." inside text.
                // We assume ISO clauses are at least X.X
                
                const genericStopRegex = /(?:^|\n)\s*\d{1,2}\.\d{1,2}(\.\d{1,2})?\s+[A-Z]/;
                const genericMatch = restOfText.match(genericStopRegex);
                
                if (genericMatch && genericMatch.index !== undefined && genericMatch.index > 50) { 
                    // Ensure we grabbed at least some text before stopping
                    extractedContent = match[0] + restOfText.substring(0, genericMatch.index);
                } else {
                    // End of document or unrecognized structure
                    // Cap at 3000 chars to prevent returning whole doc
                    extractedContent = match[0] + restOfText.substring(0, 3000);
                }
            }

            // Cleanup
            return extractedContent.trim();
        }

        return null;
    }
};
