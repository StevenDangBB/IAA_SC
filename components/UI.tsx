
import React, { useState, useEffect, useRef } from 'react';

// --- Icons (Content unchanged for brevity, only UI components enhanced) ---
export const Icons: Record<string, React.ReactNode> = {
    TDLogo: (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="tealNeonGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00f2c3" stopOpacity="1" />
                    <stop offset="100%" stopColor="#0098f0" stopOpacity="1" />
                </linearGradient>
            </defs>
            <path d="M 20 20 H 65 L 55 30 H 30 V 65 L 20 75 V 20 Z" fill="url(#tealNeonGrad)"/>
            <path fillRule="evenodd" clipRule="evenodd" 
                  d="M 40 40 H 60 C 75 40, 85 50, 85 65 C 85 80, 75 90, 60 90 H 35 L 45 80 H 60 C 70 80, 75 75, 75 65 C 75 55, 70 50, 60 50 H 50 V 40 Z" 
                  fill="url(#tealNeonGrad)"/>
            <path d="M 30 65 L 60 35" stroke="white" strokeWidth="0.5" strokeOpacity="0.3"/>
        </svg>
    ),
    TDSolidLink: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <defs>
                <linearGradient id="future_td_grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan */}
                    <stop offset="50%" stopColor="#6366f1" /> {/* Indigo */}
                    <stop offset="100%" stopColor="#f59e0b" /> {/* Amber */}
                </linearGradient>
                <filter id="glow_td" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="0.6" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <path 
                d="M5 6H11V18H14C17.866 18 21 15.3137 21 12C21 8.68629 17.866 6 14 6H11" 
                stroke="url(#future_td_grad)" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                filter="url(#glow_td)"
            />
        </svg>
    ),
    // ... (Keep all existing icons)
    Session1_SparklePlus: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M3 12h18"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 22v-4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M22 12h-4"/><path d="m19.07 4.93-2.83 2.83"/></svg>,
    Session2_PlayCircle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
    Session3_Rocket: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.1 4-1 4-1"/><path d="M12 15v5s3.03-.55 4-2c1.1-1.62 1-4 1-4"/></svg>,
    Session4_FilePlus: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
    Session5_RefreshCircle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>,
    Session6_Zap: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    Session7_Compass: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
    Session8_Flag: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
    Session9_DoorOpen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/></svg>,
    Session10_Pulse: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    Session11_GridAdd: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><path d="M3 17.5h7"/><path d="M6.5 14v7"/></svg>,
    Session12_CleanSheet: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M3 9h18"/></svg>,
    Session13_PowerBtn: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>,
    Demo1_MultiFiles: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M3 15h6"/><path d="M6 12v6"/><path d="M16 18l2-2 2 2"/><path d="M18 16v6"/></svg>,
    Demo2_CloudAdd: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17l-4-4-4 4"/></svg>,
    Demo3_FolderUp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><path d="M12 10v6"/><path d="m9 13 3-3 3 3"/></svg>,
    Demo4_ImgStack: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" y1="5" x2="22" y2="5"/><line x1="19" y1="2" x2="19" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
    Demo5_Clip: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/><path d="M12 12h.01"/></svg>,
    Demo6_BoxUp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="12.01" x2="12" y2="22.08"/><polyline points="16 12 12 8 8 12"/></svg>,
    Demo7_PlusCircle: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>,
    Demo8_GridPlus: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M14 17h7"/><path d="M17.5 13.5v7"/></svg>,
    Demo9_DocUp: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg>,
    Demo10_Layers: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/><path d="M12 8v4"/></svg>,
    Demo11_Scan: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/><path d="M12 8v8"/></svg>,
    Demo12_Attach: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4.5 16.5 7-7"/><path d="m2 2 20 20"/><path d="m12 12 7-7"/><path d="M17 17v5"/><path d="M22 12h-5"/></svg>,
    Demo13_Meteor: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m13 4 8.2 2.5a2 2 0 0 1 1.3 2.5L20 17.5"/><path d="m8.5 7.5 10 10"/><path d="M2 13.5V19a2 2 0 0 0 2 2h5.5"/><path d="m13.5 8.5-5 5"/><path d="M7 15c-1.5 1-2 2.5-2 2.5s1.5.5 2.5-2"/><path d="M12 4V2"/><path d="m16 6 2-2"/><path d="M8 6 6 4"/></svg>,
    Sparkle: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-amber-400 drop-shadow-[0_0_4px_rgba(252,211,77,0.7)] animate-pulse-slow"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>,
    FilePlus2: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M3 15h6"/><path d="M6 12v6"/></svg>,
    History: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>,
    LayoutList: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M14 4h7"/><path d="M14 9h7"/><path d="M14 15h7"/><path d="M14 20h7"/></svg>),
    Tag: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>),
    FileEdit: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13.5V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2h-5.5"/><polyline points="14 2 14 8 20 8"/><path d="M10.42 12.61a2.1 2.1 0 1 1 2.97 2.97L7.95 21 4 22l1-3.95 5.42-5.44Z"/></svg>),
    Book: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    FileShield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 13v7"/><path d="M8.5 16.5c2 1 5 1 7 0"/></svg>, 
    Users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, 
    Lock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, 
    Cpu: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>, 
    CheckThick: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    CheckSquare: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-3-2V5a2 2 0 0 1 2-2h11"/></svg>,
    Square: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>,
    FileText: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>,
    Search: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    Trash2: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><path d="M14 11v6"/></svg>,
    ChevronDown: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
    ChevronUp: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
    Wand2: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>,
    AlertCircle: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    CheckCircle2: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>,
    Save: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
    ExpandPanel: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
    CollapsePanel: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
    X: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    Copy: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
    Download: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-3-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    Sun: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    Moon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    RefreshCw: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>,
    Lightbulb: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2v2"/><path d="M12 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M9 10a3 3 0 0 1 3-3 3 3 0 0 1 3 3v2H9z"/></svg>,
    AIIndicator: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>,
    UploadCloud: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>,
    Image: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
    Info: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    Settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
    Plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    Minus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    Key: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>),
    Loader: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>,
    Keyboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" ry="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M6 12h.001"/><path d="M10 12h.001"/><path d="M14 12h.001"/><path d="M18 12h.001"/><path d="M7 16h10"/></svg>,
    TextSize: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5h7v2"/><path d="M6.5 5v14"/><path d="M14 13v-2h7v2"/><path d="M17.5 11v8"/></svg>,
    AuditUser: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M22 22 18 18 16 20 20 24 24 20Z"/></svg>),
    ScanText: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/><path d="M7 12h.01"/><path d="M10 12h4"/><path d="M17 12h.01"/><path d="M12 7v10"/></svg>,
    Building: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M12 18h.01"/></svg>,
    User: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    Snowflake: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg>,
    CheckLineart: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
};

// --- Functional Components ---

export const Icon = ({ name, size = 18, className = "", onClick }: { name: string, size?: number, className?: string, onClick?: (e: any) => void }) => {
    const iconNode = Icons[name] || Icons['AlertCircle']; // Fallback
    
    if (React.isValidElement(iconNode)) {
        const element = iconNode as React.ReactElement<any>;
         return React.cloneElement(element, {
            width: size,
            height: size,
            className: `${className} ${element.props.className || ''}`,
            onClick
        });
    }
    return <span className={className} onClick={onClick}>{iconNode}</span>;
};

export const IconSelect = ({ icon, iconColor, value, onChange, options, defaultText }: any) => (
    <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300">
            <div className={iconColor}><Icon name={icon} size={16} /></div>
        </div>
        <select 
            value={value} 
            onChange={onChange}
            className="w-full appearance-none pl-10 pr-8 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer shadow-sm hover:border-indigo-200 dark:hover:border-slate-600 hover:shadow-md"
        >
            <option value="" disabled>{defaultText}</option>
            {options.map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors duration-300">
            <Icon name="ChevronDown" size={14} />
        </div>
    </div>
);

export const IconInput = ({ icon, iconColor, placeholder, value, onChange, className = "" }: any) => (
    <div className={`relative group ${className}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300">
            <div className={iconColor}><Icon name={icon} size={16} /></div>
        </div>
        <input 
            type="text" 
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm hover:border-indigo-200 dark:hover:border-slate-600 hover:shadow-md"
        />
    </div>
);

export const Modal = ({ isOpen, title, onClose, children }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 transform transition-all animate-zoom-in-spring duration-400 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-all duration-300 text-slate-400 hover:rotate-90">
                        <Icon name="X" size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const FontSizeController = ({ fontSizeScale, adjustFontSize }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    // SNAPSHOT COORDINATES: Captured once when opened, never updated by re-renders.
    const [pinnedPosition, setPinnedPosition] = useState<{ top: number, right: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleToggle = (e: React.MouseEvent) => {
        // Stop propagation to prevent immediate closing if using global click listener
        e.stopPropagation();
        
        if (!isOpen && buttonRef.current) {
            // CAPTURE CURRENT VIEWPORT POSITION
            const rect = buttonRef.current.getBoundingClientRect();
            // Calculate fixed position relative to viewport
            // We align the right edge of the popup with the right edge of the button
            const rightEdge = window.innerWidth - rect.right;
            setPinnedPosition({
                top: rect.bottom + 8,
                right: rightEdge
            });
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    return (
        <>
            <button 
                ref={buttonRef}
                onClick={handleToggle} 
                className={`p-2 rounded-xl transition-all duration-300 shadow-sm ${isOpen ? 'bg-indigo-100 text-indigo-700 dark:bg-slate-700 dark:text-indigo-400 scale-105' : 'bg-gray-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600'}`}
                title="Adjust Font Size"
            >
                <Icon name="TextSize" size={18}/>
            </button>
            
            {/* FIXED PORTAL-LIKE OVERLAY */}
            {isOpen && pinnedPosition && (
                <>
                    {/* Invisible Backdrop to handle click-outside */}
                    <div 
                        className="fixed inset-0 z-[99] cursor-default" 
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* THE STATIC CONTROL PANEL */}
                    <div 
                        className="fixed z-[100] flex items-center bg-white dark:bg-slate-900 rounded-full p-1.5 shadow-2xl border border-gray-200 dark:border-slate-700 animate-zoom-in-spring min-w-[140px] justify-between"
                        style={{
                            top: `${pinnedPosition.top}px`,
                            right: `${pinnedPosition.right}px`,
                            // Ensure it stays "glued" to screen glass coordinates
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing when clicking inside
                    >
                         <button onClick={() => adjustFontSize('decrease')} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-indigo-600 transition-all duration-200 flex-shrink-0 active:scale-90"><Icon name="Minus" size={16}/></button>
                         <span className="text-sm font-black text-slate-800 dark:text-white select-none px-2 w-12 text-center">{(fontSizeScale * 100).toFixed(0)}%</span>
                         <button onClick={() => adjustFontSize('increase')} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-indigo-600 transition-all duration-200 flex-shrink-0 active:scale-90"><Icon name="Plus" size={16}/></button>
                    </div>
                </>
            )}
        </>
    );
};

export const SparkleLoader = ({ className }: any) => (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
         <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-indigo-400 opacity-75"></span>
         <Icon name="Sparkle" size={16} className="animate-spin-slow text-yellow-300"/>
    </div>
);

export const SnowOverlay = () => {
    const flakes = Array.from({ length: 50 }).map((_, i) => ({
        left: Math.random() * 100,
        duration: Math.random() * 10 + 10, 
        delay: Math.random() * 10,
        size: Math.random() * 4 + 2, 
        opacity: Math.random() * 0.4 + 0.1,
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden select-none">
            {flakes.map((f, i) => (
                <div
                    key={i}
                    className="absolute bg-white rounded-full blur-[1px]"
                    style={{
                        left: `${f.left}%`,
                        top: -10,
                        width: `${f.size}px`,
                        height: `${f.size}px`,
                        opacity: f.opacity,
                        animation: `fall ${f.duration}s linear infinite`,
                        animationDelay: `-${f.delay}s`,
                    }}
                />
            ))}
            <style>{`
                @keyframes fall {
                    0% { transform: translateY(-10vh) translateX(0px); opacity: 0; }
                    10% { opacity: 1; }
                    50% { transform: translateY(50vh) translateX(20px); }
                    100% { transform: translateY(110vh) translateX(-20px); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export const AINeuralLoader = ({ message }: { message: string }) => (
    <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="relative w-28 h-28 mb-8">
            <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900 rounded-full opacity-50"></div>
            <div className="absolute inset-0 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-4 border-purple-100 dark:border-purple-900 rounded-full opacity-50"></div>
            <div className="absolute inset-4 border-r-4 border-purple-500 rounded-full animate-spin-reverse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                 <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-4 rounded-full shadow-lg shadow-indigo-500/50 animate-pulse">
                     <Icon name="Wand2" className="text-white" size={28}/>
                 </div>
            </div>
            {/* Orbiting particles */}
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee] animate-ping"></div>
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 animate-pulse">{message}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Gemini AI Processing...
        </p>
    </div>
);

export const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500 ease-spring">
            <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700 dark:border-slate-200">
                <div className="p-1 bg-green-500 rounded-full text-white">
                    <Icon name="CheckLineart" size={14}/>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-wider opacity-70">Notification</span>
                    <span className="text-sm font-bold">{message}</span>
                </div>
                <button onClick={onClose} className="ml-2 text-slate-500 hover:text-white dark:hover:text-slate-900 transition-colors">
                    <Icon name="X" size={16}/>
                </button>
            </div>
        </div>
    );
};
