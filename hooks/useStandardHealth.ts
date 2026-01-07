
import { useMemo } from 'react';
import { StandardsData, Clause } from '../types';

export const useStandardHealth = (standards: StandardsData, standardKey: string, knowledgeBase: string | null) => {
    return useMemo(() => {
        if (!standardKey || !standards[standardKey]) return { isHealthy: false, score: 0, integrity: [], completeness: [] };
        const data = standards[standardKey];
        const integrity: { label: string, status: 'pass' | 'fail', detail: string }[] = [];
        const completeness: { label: string, status: 'pass' | 'fail', detail: string }[] = [];
        
        const allClauses = data.groups.flatMap(g => g.clauses);
        const flatten = (list: Clause[]): Clause[] => {
            return list.reduce((acc, c) => {
                acc.push(c);
                if (c.subClauses) acc.push(...flatten(c.subClauses));
                return acc;
            }, [] as Clause[]);
        };
        const flatList = flatten(allClauses);

        // 1. Structure Integrity
        const missingDesc = flatList.filter(c => !c.description || c.description.trim().length < 2).length;
        integrity.push({ 
            label: 'Content Quality', 
            status: missingDesc === 0 ? 'pass' : 'fail', 
            detail: missingDesc === 0 ? 'Descriptions OK' : `${missingDesc} incomplete` 
        });
        
        const uniqueCodes = new Set(flatList.map(c => c.code));
        const duplicateCount = flatList.length - uniqueCodes.size;
        integrity.push({ 
            label: 'Data Cleanliness', 
            status: duplicateCount === 0 ? 'pass' : 'fail', 
            detail: duplicateCount === 0 ? 'Clean' : `${duplicateCount} Duplicates` 
        });

        // 2. Ground Truth Validation
        if (knowledgeBase && knowledgeBase.length > 1000) {
            let missingInSource = 0;
            const sampleClauses = flatList.slice(0, 20); 
            sampleClauses.forEach(c => {
                if (!knowledgeBase.includes(c.code)) missingInSource++;
            });
            const ratio = missingInSource / sampleClauses.length;
            const isSourceValid = ratio < 0.2; 

            completeness.push({
                label: 'Source Verification',
                status: isSourceValid ? 'pass' : 'fail',
                detail: isSourceValid ? 'Matches Document' : `${(ratio*100).toFixed(0)}% Clauses Missing in Source`
            });
        } else {
             completeness.push({
                label: 'Source Verification',
                status: 'fail',
                detail: 'No Source Document Linked'
            });
        }

        // 3. Standard Specific Checks
        if (standardKey.includes("9001")) {
            const crucial = ['8.4', '8.6', '8.7', '7.1.4'];
            crucial.forEach(code => {
                const found = flatList.some(c => c.code === code);
                completeness.push({ label: `Clause ${code}`, status: found ? 'pass' : 'fail', detail: found ? 'Present' : 'Missing (Required)' });
            });
        }
        
        if (standardKey.includes("27001")) {
            const annexItems = flatList.filter(c => c.code.startsWith("A."));
            const isFullSet = annexItems.length >= 90; 
            completeness.push({ label: 'Annex A Controls', status: isFullSet ? 'pass' : 'fail', detail: isFullSet ? `${annexItems.length} Controls (OK)` : `${annexItems.length}/93 (Incomplete)` });
        }

        const integrityPass = integrity.every(i => i.status === 'pass');
        const completenessPass = completeness.every(i => i.status === 'pass');
        const isHealthy = integrityPass && completenessPass;
        const totalItems = integrity.length + completeness.length;
        const passItems = integrity.filter(i => i.status === 'pass').length + completeness.filter(i => i.status === 'pass').length;
        const score = Math.round((passItems / (totalItems || 1)) * 100);

        return { isHealthy, score, integrity, completeness };
    }, [standards, standardKey, knowledgeBase]);
};
