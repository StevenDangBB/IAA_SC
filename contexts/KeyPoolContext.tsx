
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ApiKeyProfile } from '../types';
import { MY_FIXED_KEYS } from '../constants';

interface KeyPoolContextType {
    apiKeys: ApiKeyProfile[];
    activeKeyId: string;
    isCheckingKey: boolean; // Kept for interface compatibility but always false
    addKey: (key: string, label?: string) => Promise<string>;
    deleteKey: (id: string) => void;
    refreshKeyStatus: (id: string) => Promise<void>; // Deprecated placeholder
    checkAllKeys: () => Promise<void>; // Deprecated placeholder
    getActiveKey: () => ApiKeyProfile | undefined;
    isAutoCheckEnabled: boolean;
    toggleAutoCheck: (enabled: boolean) => void;
    setActiveKeyId: (id: string) => void;
}

const KeyPoolContext = createContext<KeyPoolContextType | undefined>(undefined);

export const KeyPoolProvider = ({ children }: React.PropsWithChildren<{}>) => {
    const [apiKeys, setApiKeys] = useState<ApiKeyProfile[]>([]);
    const [activeKeyId, setActiveKeyId] = useState<string>("");
    
    // Legacy support refs
    const apiKeysRef = useRef<ApiKeyProfile[]>([]);
    useEffect(() => { apiKeysRef.current = apiKeys; }, [apiKeys]);

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
                        id: `env_key_${index}`, 
                        label: `Default Key ${index + 1}`, 
                        key: fixedKey, 
                        status: 'valid', // Assume valid
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
        } catch (e) { console.error("Key Load Error", e); }
    }, []);

    // Simplified Add Key - No Validation
    const addKey = async (key: string, label?: string): Promise<string> => {
        if (!key.trim()) return 'empty';
        if (apiKeys.some(k => k.key === key.trim())) return 'duplicate';
        
        const newProfile: ApiKeyProfile = {
            id: Date.now().toString(),
            label: label || `Key ${apiKeys.length + 1}`,
            key: key.trim(),
            status: 'valid', // Always assume valid
            activeModel: 'gemini-1.5-flash', // Default assumption
            latency: 0,
            lastChecked: new Date().toISOString()
        };

        const newKeys = [...apiKeys, newProfile];
        setApiKeys(newKeys);
        localStorage.setItem("iso_api_keys", JSON.stringify(newKeys));
        
        // Auto select if first key
        if (apiKeys.length === 0) {
            setActiveKeyId(newProfile.id);
            localStorage.setItem("iso_active_key_id", newProfile.id);
        }
        
        return 'valid';
    };

    const deleteKey = (id: string) => {
        const newKeys = apiKeys.filter(k => k.id !== id);
        setApiKeys(newKeys);
        localStorage.setItem("iso_api_keys", JSON.stringify(newKeys));
        
        if (activeKeyId === id) {
            const next = newKeys[0];
            const nextId = next ? next.id : "";
            setActiveKeyId(nextId);
            if(nextId) localStorage.setItem("iso_active_key_id", nextId);
            else localStorage.removeItem("iso_active_key_id");
        }
    };

    // Placeholder functions to maintain interface compatibility without logic
    const refreshKeyStatus = async () => {}; 
    const checkAllKeys = async () => {};
    const toggleAutoCheck = () => {};

    const getActiveKey = useCallback(() => apiKeys.find(k => k.id === activeKeyId), [apiKeys, activeKeyId]);

    return (
        <KeyPoolContext.Provider value={{
            apiKeys, activeKeyId, isCheckingKey: false, addKey, deleteKey, refreshKeyStatus,
            checkAllKeys, getActiveKey, isAutoCheckEnabled: false, toggleAutoCheck, setActiveKeyId
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
