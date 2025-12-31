
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('App Session Management', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize with default empty state', () => {
        const { container } = render(<App />);
        // Check if Company input is empty (placeholder might be visible)
        const inputs = container.querySelectorAll('input');
        // Assuming Company Name is one of the inputs
        let hasValue = false;
        inputs.forEach(input => {
            if (input.value && input.value !== "") hasValue = true;
        });
        expect(hasValue).toBe(false);
    });

    it('should save session data to localStorage (Auto-save simulation)', async () => {
        // Manually populate localStorage to simulate an auto-save
        const testData = {
            standardKey: "ISO 9001:2015",
            auditInfo: { ...DEFAULT_AUDIT_INFO, company: "Test Corp" },
            evidence: "Test Evidence"
        };
        localStorageMock.setItem("iso_session_data", JSON.stringify(testData));
        
        // Check if it exists
        expect(localStorageMock.getItem("iso_session_data")).toContain("Test Corp");
    });

    it('should clear all data when "New Session" is clicked, but backup first', async () => {
        // 1. Setup dirty state in localStorage
        const dirtyData = {
            standardKey: "ISO 9001:2015",
            auditInfo: { ...DEFAULT_AUDIT_INFO, company: "Old Company" },
            evidence: "Old Evidence"
        };
        localStorageMock.setItem("iso_session_data", JSON.stringify(dirtyData));

        render(<App />);
        
        // 2. Simulate clicking "New" button (assuming text is "New")
        const newButton = screen.getByTitle("Start New Session (Clears All Data)");
        fireEvent.click(newButton);

        // 3. Verify localStorage is cleared immediately, but backup exists
        expect(localStorageMock.getItem("iso_session_data")).toBeNull();
        expect(localStorageMock.getItem("iso_session_backup")).toContain("Old Company");
    });

    it('should allow UNDOing a "New Session" via Recall (Backup Restore) and protect data from premature Auto-save', async () => {
        // 1. Setup backup data (simulating post-New Session state)
        const backupData = {
            standardKey: "ISO 9001:2015",
            auditInfo: { ...DEFAULT_AUDIT_INFO, company: "Restored Company" },
            evidence: "Restored Evidence"
        };
        localStorageMock.setItem("iso_session_backup", JSON.stringify(backupData));
        // Ensure main session is empty
        localStorageMock.removeItem("iso_session_data");

        render(<App />);

        // 2. Click Recall
        const recallButton = screen.getByTitle("Recall Auto-Saved Session");
        fireEvent.click(recallButton);

        // 3. Check for Toast message about undo
        await waitFor(() => {
            expect(screen.getByText(/Undid 'New Session'/i)).toBeInTheDocument();
        });
        
        // 4. Verify data is put back into active session storage IMMEDIATELY (Hard sync)
        expect(localStorageMock.getItem("iso_session_data")).toContain("Restored Company");

        // 5. Advance time past debounce to ensure Auto-Save doesn't overwrite with empty/stale state
        vi.advanceTimersByTime(1000); 

        // 6. Verify data is STILL there
        expect(localStorageMock.getItem("iso_session_data")).toContain("Restored Company");
    });
});
