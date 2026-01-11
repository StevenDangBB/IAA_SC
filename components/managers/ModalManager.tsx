
import React from 'react';
import { useUI } from '../../contexts/UIContext';
import { useAudit } from '../../contexts/AuditContext';
import { useKeyPool } from '../../contexts/KeyPoolContext';
import { processSourceFile } from '../../utils';
import { useStandardRepair } from '../../hooks/useStandardRepair';
import { useStandardHealth } from '../../hooks/useStandardHealth';

// Modals
import { SettingsModal } from '../modals/SettingsModal';
import { AddStandardModal } from '../modals/AddStandardModal';
import { IntegrityModal } from '../modals/IntegrityModal';
import { PrivacySettingsModal } from '../modals/PrivacySettingsModal';
import RecallModal from '../RecallModal';
import ProjectInfoModal from '../ReleaseNotesModal';

interface ModalManagerProps {
    onRestoreSnapshot: (snap: any) => void;
    // Pass strictly necessary props that aren't in Context
    newKeyInput: string;
    setNewKeyInput: (val: string) => void;
    handleAddKey: () => void;
}

export const ModalManager: React.FC<ModalManagerProps> = ({ 
    onRestoreSnapshot, newKeyInput, setNewKeyInput, handleAddKey 
}) => {
    const { modals, toggleModal, showToast } = useUI();
    const { 
        privacySettings, setPrivacySettings, 
        addCustomStandard, setStandardKey, setKnowledgeData,
        standards, standardKey, updateStandard, resetStandard, knowledgeBase
    } = useAudit();
    
    const { 
        apiKeys, activeKeyId, isCheckingKey, isAutoCheckEnabled, 
        toggleAutoCheck, refreshKeyStatus, deleteKey 
    } = useKeyPool();

    // Standard Health Logic (Simplified for Modal passing)
    // In a real refactor, this logic belongs in the IntegrityModal itself or a specific hook
    // For now, we pass the handlers.
    
    // We instantiate hooks here to pass data down. 
    // Ideally IntegrityModal should consume these hooks directly, but adhering to existing pattern:
    const health = useStandardHealth(standards, standardKey, knowledgeBase);
    const { handleAutoRepair, isRepairing, repairStats } = useStandardRepair();

    return (
        <>
            <SettingsModal 
                isOpen={modals.settings} 
                onClose={() => toggleModal('settings', false)} 
                apiKeys={apiKeys} 
                newKeyInput={newKeyInput} 
                setNewKeyInput={setNewKeyInput} 
                isCheckingKey={isCheckingKey}
                handleAddKey={handleAddKey}
                activeKeyId={activeKeyId} 
                editingKeyId={null} 
                editLabelInput="" 
                setEditLabelInput={() => {}}
                handleSaveLabel={() => {}} 
                handleStartEdit={() => {}} 
                handleRefreshStatus={refreshKeyStatus} 
                handleDeleteKey={deleteKey}
                isAutoCheckEnabled={isAutoCheckEnabled} 
                toggleAutoCheck={toggleAutoCheck}
            />

            <AddStandardModal
                isOpen={modals.addStandard} 
                onClose={() => toggleModal('addStandard', false)}
                onAdd={async (name, file) => {
                    toggleModal('addStandard', false);
                    const newKey = `CUSTOM_${Date.now()}`;
                    if(file) { 
                        const text = await processSourceFile(file); 
                        setKnowledgeData(text, file.name); 
                    }
                    addCustomStandard(newKey, { name, description: "Custom", groups: [] });
                    setStandardKey(newKey);
                }}
            />

            <IntegrityModal 
                isOpen={modals.integrity}
                onClose={() => toggleModal('integrity', false)}
                health={health}
                isCustomStandard={!!standardKey && !standards[standardKey]} // Logic check
                onResetStandard={() => { resetStandard(standardKey); toggleModal('integrity', false); }}
                onAutoRepair={handleAutoRepair}
                isRepairing={isRepairing}
                repairStats={repairStats}
            />

            <RecallModal
                isOpen={modals.recall}
                onClose={() => toggleModal('recall', false)}
                onRestore={onRestoreSnapshot}
            />
            
            <PrivacySettingsModal
                isOpen={modals.privacy}
                onClose={() => toggleModal('privacy', false)}
                settings={privacySettings}
                setSettings={setPrivacySettings}
            />

            <ProjectInfoModal 
                isOpen={modals.about} 
                onClose={() => toggleModal('about', false)} 
            />
        </>
    );
};
