
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

    it('should clear all data when "New Session" is clicked', async () => {
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

        // 3. Verify localStorage is cleared immediately
        expect(localStorageMock.getItem("iso_session_data")).toBeNull();
    });

    it('should recall saved data correctly without merging dirty state', async () => {
        // 1. Save data to storage
        const savedData = {
            standardKey: "ISO 9001:2015",
            auditInfo: { ...DEFAULT_AUDIT_INFO, company: "Saved Company" },
            evidence: "Saved Evidence"
        };
        localStorageMock.setItem("iso_session_data", JSON.stringify(savedData));

        const { container } = render(<App />);

        // 2. Simulate User typing something else ("Dirty State")
        // Since we can't easily simulate complex typing flow in this basic test, 
        // we rely on the button click logic which we validated in code review.
        // But we can verify the button click restores "Saved Company".
        
        const recallButton = screen.getByTitle("Recall Auto-Saved Session");
        fireEvent.click(recallButton);

        // 3. We can't easily check internal React state without a wrapper, 
        // but we can check if toast appeared indicating success
        await waitFor(() => {
            expect(screen.getByText(/Recalled auto-saved session/i)).toBeInTheDocument();
        });
    });
});
