
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ApiKeyProfile } from '../types';
import { MODEL_HIERARCHY, MY_FIXED_KEYS } from '../constants';
import { validateApiKey } from '../services/geminiService';

interface KeyPoolContextType {
    apiKeys: ApiKeyProfile[];
    activeKeyId: string;
    isCheckingKey: boolean;
    addKey: (key: string, label?: string) => Promise<boolean>;
    deleteKey: (id: string) => void;
    refreshKeyStatus: (id: string) => Promise<void>;
    checkAllKeys: () => Promise<void>;
    getActiveKey: () => ApiKeyProfile | undefined;
    isAutoCheckEnabled: boolean;
    toggleAutoCheck: (enabled: boolean) => void;
    setActiveKeyId: (id: string) => void;
}

const KeyPoolContext = createContext<KeyPoolContextType | undefined>(undefined);

export const KeyPoolProvider = ({ children }: { children: ReactNode }) => {
    const [apiKeys, setApiKeys] = useState<ApiKeyProfile[]>([]);
    const [activeKeyId, setActiveKeyId] = useState<string>("");
    const [isCheckingKey, setIsCheckingKey] = useState(false);
    const [isAutoCheckEnabled, setIsAutoCheckEnabled] = useState(false);

    // Initial Load
    useEffect(() => {
        try {
            const stored = localStorage.getItem("iso_api_keys");
            const loadedKeys: ApiKeyProfile[] = stored ? JSON.parse(stored) : [];
            const existingKeySet = new Set(loadedKeys.map(k => k.key));
            let hasChanges = false;
            
            // Inject Environment Keys if not present
            MY_FIXED_KEYS.forEach((fixedKey, index) => {
                if (fixedKey && !existingKeySet.has(fixedKey)) {
                    loadedKeys.push({ 
                        id: `env_key_${index}_${Math.random().toString(36).substr(2, 5)}`, 
                        label: `Env Key ${index + 1}`, 
                        key: fixedKey, 
                        status: 'unknown', 
                        latency: 0, 
                        lastChecked: new Date().toISOString() 
                    });
                    hasChanges = true;
                }
            });

            setApiKeys(loadedKeys);
            if(hasChanges) localStorage.setItem("iso_api_keys", JSON.stringify(loadedKeys));

            const savedActiveId = localStorage.getItem("iso_active_key_id");
            if (savedActiveId && loadedKeys.some(k => k.id === savedActiveId)) {
                setActiveKeyId(savedActiveId);
            } else if (loadedKeys.length > 0) {
                setActiveKeyId(loadedKeys[0].id);
            }
            
            // Auto-check init
            const autoCheck = localStorage.getItem('iso_auto_check') === 'true';
            setIsAutoCheckEnabled(autoCheck);

        } catch (e) { console.error("Key Load Error", e); }
    }, []);

    // Background Check Loop
    useEffect(() => {
        if (!isAutoCheckEnabled) return;
        const interval = setInterval(() => {
            if (!isCheckingKey && apiKeys.length > 0) performBackgroundHealthCheck();
        }, 60000);
        return () => clearInterval(interval);
    }, [isAutoCheckEnabled, isCheckingKey, apiKeys]);

    const performBackgroundHealthCheck = async () => {
        // Find oldest checked key
        const sorted = [...apiKeys].sort((a, b) => new Date(a.lastChecked || 0).getTime() - new Date(b.lastChecked || 0).getTime());
        const candidate = sorted[0];
        if (candidate) await refreshKeyStatus(candidate.id);
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

    const addKey = async (key: string, label?: string) => {
        if (!key.trim()) return false;
        if (apiKeys.some(k => k.key === key.trim())) return false;
        
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

        const newKeys = [...apiKeys, newProfile];
        setApiKeys(newKeys);
        localStorage.setItem("iso_api_keys", JSON.stringify(newKeys));
        
        if (apiKeys.length === 0 || caps.status === 'valid') {
            setActiveKeyId(newProfile.id);
            localStorage.setItem("iso_active_key_id", newProfile.id);
        }
        
        setIsCheckingKey(false);
        return caps.status === 'valid';
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

    const refreshKeyStatus = async (id: string) => {
        const profile = apiKeys.find(k => k.id === id);
        if(!profile) return;

        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'checking' } : k));
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
    };

    const checkAllKeys = async () => {
        setIsCheckingKey(true);
        for(const k of apiKeys) {
            await refreshKeyStatus(k.id);
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
