
import { useMemo, useCallback } from 'react';
import { Standard, Clause } from '../types';

export const useStandardUtils = (standard: Standard | undefined) => {
    // Memoize the flattening of the standard to prevent expensive recalculation on every render
    const flatClauses = useMemo(() => {
        if (!standard) return [];
        const all: Clause[] = [];
        const traverse = (list: Clause[]) => {
            list.forEach(c => {
                all.push(c);
                if (c.subClauses) traverse(c.subClauses);
            });
        };
        standard.groups.forEach(g => traverse(g.clauses));
        return all;
    }, [standard]);

    // Fast lookup for a specific clause ID
    const getClauseById = useCallback((id: string) => {
        return flatClauses.find(c => c.id === id);
    }, [flatClauses]);

    // Fast lookup for a specific clause Code
    const getClauseByCode = useCallback((code: string) => {
        return flatClauses.find(c => c.code === code);
    }, [flatClauses]);

    return { flatClauses, getClauseById, getClauseByCode };
};
