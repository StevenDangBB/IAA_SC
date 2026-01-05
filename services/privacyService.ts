
/**
 * ISO Audit Pro - Privacy Shield
 * Handles PII redaction before sending data to Cloud APIs.
 */

export const PrivacyService = {
    // Regex Patterns
    patterns: {
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        phoneVN: /(84|0[3|5|7|8|9])+([0-9]{8})\b/g,
        // Simple name detection (looks for Capitalized Words that aren't start of sentence)
        // This is naive but efficient for a client-side check without NLP model
        potentialName: /(?<!^|\. |\? |! )([A-Z][a-z]+ [A-Z][a-z]+)/g 
    },

    redact(text: string): string {
        if (!text) return "";
        let redacted = text;

        // 1. Redact Emails
        redacted = redacted.replace(this.patterns.email, '[EMAIL_REDACTED]');

        // 2. Redact Phone Numbers
        redacted = redacted.replace(this.patterns.phoneVN, '[PHONE_REDACTED]');

        // 3. Optional: Redact money/salary if specific keywords found
        // (Simple heuristic)
        if (redacted.toLowerCase().includes('salary') || redacted.toLowerCase().includes('lương')) {
             redacted = redacted.replace(/(\d{1,3}[,.]\d{3}[,.]\d{3}|\d{7,})/g, '[MONEY_REDACTED]');
        }

        return redacted;
    }
};
