
import { PrivacySettings, AuditInfo } from "../types";

/**
 * ISO Audit Pro - Privacy Shield
 * Handles PII redaction before sending data to Cloud APIs.
 */

export const PrivacyService = {
    // Regex Patterns
    patterns: {
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        phoneVN: /(\+84|0)(3|5|7|8|9)([0-9]{8})\b/g,
        ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
        // Simple name detection (looks for Capitalized Words that aren't start of sentence)
        // This is naive but efficient for a client-side check without NLP model
        potentialName: /(?<!^|\. |\? |! )([A-Z][a-z]+ [A-Z][a-z]+)/g 
    },

    redact(text: string, settings?: PrivacySettings, contextInfo?: AuditInfo): string {
        if (!text) return "";
        let redacted = text;

        if (!settings) return redacted;

        // 1. Context-Specific Masking (Company Name, SMO, Auditor)
        if (contextInfo) {
            if (settings.maskCompany && contextInfo.company && contextInfo.company.length > 2) {
                // Escape special chars for regex
                const escaped = contextInfo.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                redacted = redacted.replace(new RegExp(escaped, 'gi'), '[COMPANY_REDACTED]');
            }
            if (settings.maskSmo && contextInfo.smo && contextInfo.smo.length > 2) {
                const escaped = contextInfo.smo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                redacted = redacted.replace(new RegExp(escaped, 'gi'), '[SMO_REDACTED]');
            }
            if (settings.maskPeople && contextInfo.auditor && contextInfo.auditor.length > 2) {
                const escaped = contextInfo.auditor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                redacted = redacted.replace(new RegExp(escaped, 'gi'), '[AUDITOR_REDACTED]');
            }
        }

        // 2. Pattern-Based Masking
        if (settings.maskEmail) {
            redacted = redacted.replace(this.patterns.email, '[EMAIL_REDACTED]');
        }

        if (settings.maskPhone) {
            redacted = redacted.replace(this.patterns.phoneVN, '[PHONE_REDACTED]');
        }

        if (settings.maskIP) {
            redacted = redacted.replace(this.patterns.ipAddress, '[IP_REDACTED]');
        }

        if (settings.maskAddress) {
            // Heuristic for simple addresses (e.g., "123 Street Name")
            redacted = redacted.replace(/\d+\s+[A-Za-z]+\s+(Street|St|Ave|Avenue|Road|Rd|Lane|Ln|Ward|District)/gi, '[ADDRESS_REDACTED]');
        }

        // 3. Optional: Redact money/salary if specific keywords found
        if (redacted.toLowerCase().includes('salary') || redacted.toLowerCase().includes('lương')) {
             redacted = redacted.replace(/(\d{1,3}[,.]\d{3}[,.]\d{3}|\d{7,})/g, '[MONEY_REDACTED]');
        }

        return redacted;
    }
};
