
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { ApiKeyProfile } from '../types';
import { MY_FIXED_KEYS } from '../constants';
import { validateApiKey } from '../services/geminiService';

interface KeyPoolContextType {
    apiKeys: ApiKeyProfile[];
    activeKeyId: string;
    isCheckingKey: boolean;
    addKey: (key: string, label?: string) => Promise<string>;
    deleteKey: (id: string) => void;
    refreshKeyStatus: (id: string) => Promise<void>;
    checkAllKeys: () => Promise<void>;
    getActiveKey: () => ApiKeyProfile | undefined;
    isAutoCheckEnabled: boolean;
    toggleAutoCheck: (enabled: boolean) => void;
    setActiveKeyId: (id: string) => void;
}

const KeyPoolContext = createContext<KeyPoolContextType | undefined>(undefined);

export const KeyPoolProvider = ({ children }: React.PropsWithChildren<{}>) => {
    const [apiKeys, setApiKeys] = useState<ApiKeyProfile[]>([]);
    const [activeKeyId, setActiveKeyId] = useState<string>("");
    const [isCheckingKey, setIsCheckingKey] = useState(false);
    const [isAutoCheckEnabled, setIsAutoCheckEnabled] = useState(true); // Default to true for reliability
    
    const apiKeysRef = useRef<ApiKeyProfile[]>([]);
    const activeKeyIdRef = useRef<string>("");
    const hasMounted = useRef(false);
    
    // Sync refs
    useEffect(() => { apiKeysRef.current = apiKeys; }, [apiKeys]);
    useEffect(() => { activeKeyIdRef.current = activeKeyId; }, [activeKeyId]);

    // --- INITIALIZATION ---
    useEffect(() => {
        try {
            const stored = localStorage.getItem("iso_api_keys");
            let loadedKeys: ApiKeyProfile[] = stored ? JSON.parse(stored) : [];
            const existingKeySet = new Set(loadedKeys.map(k => k.key));
            let hasChanges = false;
            
            // Inject Environment Keys if not present
            MY_FIXED_KEYS.forEach((fixedKey, index) => {
                if (fixedKey && !existingKeySet.has(fixedKey)) {
                    loadedKeys.push({ 
                        id: `env_key_${index}_${Math.random().toString(36).substr(2, 5)}`, 
                        label: `Env Key ${index + 1}`, 
                        key: fixedKey, 
                        status: 'checking', // START AS CHECKING to avoid Red Flash
                        latency: 0, 
                        lastChecked: new Date().toISOString() 
                    });
                    hasChanges = true;
                }
            });

            // Ensure loaded keys have a neutral state on boot if they were 'checking'
            loadedKeys = loadedKeys.map(k => ({
                ...k,
                status: k.status === 'checking' ? 'unknown' : k.status
            }));

            if (loadedKeys.length > 0 && !loadedKeys.some(k => k.id === activeKeyId)) {
                // If local storage has an active ID, use it, otherwise default to first
                const savedActiveId = localStorage.getItem("iso_active_key_id");
                const targetId = savedActiveId && loadedKeys.some(k => k.id === savedActiveId) ? savedActiveId : loadedKeys[0].id;
                setActiveKeyId(targetId);
                // Also set this key to 'checking' visually so UI shows yellow
                loadedKeys = loadedKeys.map(k => k.id === targetId ? { ...k, status: 'checking' as const } : k);
            }

            setApiKeys(loadedKeys);
            if(hasChanges) localStorage.setItem("iso_api_keys", JSON.stringify(loadedKeys));
            
            const autoCheck = localStorage.getItem('iso_auto_check');
            if (autoCheck !== null) setIsAutoCheckEnabled(autoCheck === 'true');
            
            hasMounted.current = true;

        } catch (e) { console.error("Key Load Error", e); }
    }, []);

    // --- IMMEDIATE VALIDATION ON MOUNT ---
    useEffect(() => {
        if (!hasMounted.current) return;
        if (!activeKeyId) return;

        // Force check the active key immediately on load to ensure status is fresh
        // We use a small timeout to allow the initial render to paint the 'checking' state
        const timer = setTimeout(() => {
            refreshKeyStatus(activeKeyId);
        }, 100);

        return () => clearTimeout(timer);
    }, [activeKeyId, hasMounted.current]); // Depend on activeKeyId change to re-verify if user switches keys

    // --- BACKGROUND ROTATION ---
    useEffect(() => {
        if (!isAutoCheckEnabled) return;
        
        const interval = setInterval(() => {
            if (!isCheckingKey && apiKeysRef.current.length > 0) {
                performSingleSmartCheck();
            }
        }, 45000); // Check every 45s (Optimized frequency)
        
        return () => clearInterval(interval);
    }, [isAutoCheckEnabled]);

    const performSingleSmartCheck = async () => {
        const keys = apiKeysRef.current;
        if (keys.length === 0) return;

        // Prioritize: 
        // 1. Active Key if it's not valid
        // 2. Oldest checked key
        
        const activeKey = keys.find(k => k.id === activeKeyIdRef.current);
        if (activeKey && activeKey.status !== 'valid' && activeKey.status !== 'checking') {
            console.log(`[KeyPool] Auto-repairing active key: ${activeKey.label}`);
            await refreshKeyStatus(activeKey.id);
            return;
        }

        const sorted = [...keys].sort((a, b) => {
            const timeA = a.lastChecked ? new Date(a.lastChecked).getTime() : 0;
            const timeB = b.lastChecked ? new Date(b.lastChecked).getTime() : 0;
            return timeA - timeB;
        });

        const candidate = sorted[0];
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        const lastTime = candidate.lastChecked ? new Date(candidate.lastChecked).getTime() : 0;

        if (lastTime < fiveMinutesAgo) {
            console.log(`[KeyPool] Background refreshing stale key: ${candidate.label}`);
            await refreshKeyStatus(candidate.id);
        }
    };

    const determineCapabilities = async (key: string) => {
        const result = await validateApiKey(key);
        return {
            status: result.isValid ? 'valid' : (result.errorType || 'unknown'),
            activeModel: result.activeModel,
            latency: result.latency,
            errorMessage: result.errorMessage
        };
    };

    const addKey = async (key: string, label?: string): Promise<string> => {
        if (!key.trim()) return 'empty';
        if (apiKeys.some(k => k.key === key.trim())) return 'duplicate';
        
        setIsCheckingKey(true);
        const caps = await determineCapabilities(key);
        
        const newProfile: ApiKeyProfile = {
            id: Date.now().toString(),
            label: label || `Key ${apiKeys.length + 1}`,
            key: key.trim(),
            status: caps.status as any,
            activeModel: caps.activeModel,
            latency: caps.latency,
            lastChecked: new Date().toISOString()
        };

        if (caps.status === 'valid' || caps.status === 'quota_exceeded') {
            const newKeys = [...apiKeys, newProfile];
            setApiKeys(newKeys);
            localStorage.setItem("iso_api_keys", JSON.stringify(newKeys));
            
            if (apiKeys.length === 0 || caps.status === 'valid') {
                setActiveKeyId(newProfile.id);
                localStorage.setItem("iso_active_key_id", newProfile.id);
            }
        }
        
        setIsCheckingKey(false);
        return caps.status;
    };

    const deleteKey = (id: string) => {
        const newKeys = apiKeys.filter(k => k.id !== id);
        setApiKeys(newKeys);
        localStorage.setItem("iso_api_keys", JSON.stringify(newKeys));
        
        if (activeKeyId === id) {
            const next = newKeys.find(k => k.status === 'valid') || newKeys[0];
            const nextId = next ? next.id : "";
            setActiveKeyId(nextId);
            if(nextId) localStorage.setItem("iso_active_key_id", nextId);
            else localStorage.removeItem("iso_active_key_id");
        }
    };

    const refreshKeyStatus = useCallback(async (id: string) => {
        const currentKeys = apiKeysRef.current;
        const profile = currentKeys.find(k => k.id === id);
        
        if (!profile) return;

        // Optimistic Update: Set to checking immediately so UI reflects activity
        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'checking' } : k));
        
        // Non-blocking check
        try {
            const caps = await determineCapabilities(profile.key);
            
            setApiKeys(prev => {
                const next = prev.map(k => k.id === id ? {
                    ...k,
                    status: caps.status as any,
                    activeModel: caps.activeModel || k.activeModel,
                    latency: caps.latency,
                    lastChecked: new Date().toISOString()
                } : k);
                localStorage.setItem("iso_api_keys", JSON.stringify(next));
                return next;
            });
        } catch (error) {
            console.error("Critical error during key refresh", error);
            setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'unknown' } : k));
        }
    }, []);

    const checkAllKeys = async () => {
        setIsCheckingKey(true);
        // Prioritize Active Key first
        if (activeKeyId) await refreshKeyStatus(activeKeyId);
        
        for(const k of apiKeys) {
            if (k.id !== activeKeyId) {
                await refreshKeyStatus(k.id);
                await new Promise(r => setTimeout(r, 200)); 
            }
        }
        setIsCheckingKey(false);
    };

    const toggleAutoCheck = (enabled: boolean) => {
        setIsAutoCheckEnabled(enabled);
        localStorage.setItem('iso_auto_check', String(enabled));
    };

    const getActiveKey = useCallback(() => apiKeys.find(k => k.id === activeKeyId), [apiKeys, activeKeyId]);

    return (
        <KeyPoolContext.Provider value={{
            apiKeys, activeKeyId, isCheckingKey, addKey, deleteKey, refreshKeyStatus,
            checkAllKeys, getActiveKey, isAutoCheckEnabled, toggleAutoCheck, setActiveKeyId
        }}>
            {children}
        </KeyPoolContext.Provider>
    );
};

export const useKeyPool = () => {
    const context = useContext(KeyPoolContext);
    if (!context) throw new Error("useKeyPool must be used within KeyPoolProvider");
    return context;
};
