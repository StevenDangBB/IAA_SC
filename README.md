
# ISO Audit Assistant (Project Onyx)

**Version:** 4.1.0-STABLE
**Engine:** Google Gemini 3.0 Pro / Flash 3.0

Professional ISO Audit Assistant leveraging Gemini AI for compliance analysis, OCR evidence extraction, and automated reporting.

## 🚀 Deployment & Installation

### 1. Prerequisites
- Node.js 18+
- Google Gemini API Key

### 2. Manual Setup (Codespaces / Local)

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key:**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_KEY=AIzaSy...YOUR_KEY_HERE
   ```

3. **Start Dev Server:**
   ```bash
   npm run dev
   ```

### 3. Production Build
```bash
npm run build
# The 'dist' folder is now ready for deployment (Netlify, Vercel, GitHub Pages)
```

## 🛡️ Checkpoint System (Backup Strategy)

This project uses a rigorous checkpoint system to snapshot stable baselines.

**To create a new snapshot:**
```bash
npm run checkpoint
```
This will create a timestamped backup in the `_backups` directory, preserving all source code and configuration.

## 🌟 Key Features (v4.1.0)

- **Smart Resource Sync:** Bi-directional synchronization between Logistics planning and Global Audit Context.
- **Performance Core:** React Memoization for high-speed table rendering (Matrix/Planning).
- **Dual-Stream Analysis:** Combines Structured Matrix evidence with Unstructured Documents.
- **Privacy Shield:** Client-side PII redaction before AI transmission.
- **Offline Intelligence:** Heuristic fallback engine when API is unavailable.
- **Strict Process Architecture:** Data is organized by specific audit processes (e.g., HR, IT, Ops).

## ⚠️ Important Note
This application relies on `IndexedDB` for vector storage and large file handling. Clearing browser data will remove locally cached Knowledge Base files (though audit text data is persisted in LocalStorage).
