import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';
import { DEFAULT_AUDIT_INFO } from './constants';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock global confirm/alert
window.confirm = vi.fn(() => true);
window.alert = vi.fn();

// Mock dependencies
vi.mock('./services/geminiService', () => ({
    generateOcrContent: vi.fn(),
    generateAnalysis: vi.fn(),
    generateTextReport: vi.fn(),
    validateApiKey: vi.fn().mockResolvedValue({ isValid: true, latency: 100 }),
    fetchFullClauseText: vi.fn(),
}));

// Mock ResizeObserver
vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
});

describe('App Session Management (Explicit Authority Architecture)', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should NOT overwrite existing localStorage with empty state on initial load', async () => {
        // 1. Pre-populate localStorage with valuable data
        const valuableData = {
            standardKey: "ISO 9001:2015",
            auditInfo: { ...DEFAULT_AUDIT_INFO, company: "Valuable Corp" },
            evidence: "Critical Evidence"
        };
        localStorageMock.setItem("iso_session_data", JSON.stringify(valuableData));

        // 2. Render App (State starts empty)
        render(<App />);

        // 3. Fast-forward past auto-save debounce
        vi.advanceTimersByTime(2000);

        // 4. Verify localStorage still holds the valuable data, NOT overwritten by empty state
        const stored = JSON.parse(localStorageMock.getItem("iso_session_data") || "{}");
        expect(stored.company).toBe("Valuable Corp");
    });

    it('should ALLOW overwrite if New Session is explicitly clicked', async () => {
        // 1. Setup existing data
        const oldData = {
            standardKey: "ISO 9001:2015",
            auditInfo: { ...DEFAULT_AUDIT_INFO, company: "Old Corp" },
            evidence: "Old Evidence"
        };
        localStorageMock.setItem("iso_session_data", JSON.stringify(oldData));

        const { getByTitle } = render(<App />);

        // 2. Click New Session
        const newButton = getByTitle("Start New Session (Clears All Data)");
        newButton.click();

        // 3. Verify data is cleared immediately from storage
        expect(localStorageMock.getItem("iso_session_data")).toBeNull();

        // 4. Wait for auto-save (debounce) to trigger on the new empty state
        vi.advanceTimersByTime(1000);

        // 5. Verify NEW empty state is written (because user explicitly authorized it via New Session)
        const stored = JSON.parse(localStorageMock.getItem("iso_session_data") || "{}");
        expect(stored.auditInfo.company).toBe(""); // Should be empty now
    });

    it('should protect data during Recall race condition', async () => {
        // 1. Setup backup data
        const backupData = {
            standardKey: "ISO 9001:2015",
            auditInfo: { ...DEFAULT_AUDIT_INFO, company: "Restored Corp" },
            evidence: "Restored Evidence"
        };
        localStorageMock.setItem("iso_session_backup", JSON.stringify(backupData));
        localStorageMock.removeItem("iso_session_data"); // Simulate active session lost

        const { getByTitle } = render(<App />);

        // 2. Click Recall
        const recallButton = getByTitle("Recall Auto-Saved Session");
        recallButton.click();

        // 3. Verify Hard Write happened immediately
        expect(localStorageMock.getItem("iso_session_data")).toContain("Restored Corp");

        // 4. Advance time. If the logic is flawed, the empty state from the render cycle might overwrite the hard write.
        vi.advanceTimersByTime(1000);

        // 5. Verify integrity maintained
        expect(localStorageMock.getItem("iso_session_data")).toContain("Restored Corp");
    });
});