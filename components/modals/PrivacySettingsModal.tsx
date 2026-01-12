
import React from 'react';
import { Modal, Icon } from '../UI';
import { PrivacySettings } from '../../types';

interface PrivacySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: PrivacySettings;
    setSettings: (s: PrivacySettings) => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({ 
    isOpen, onClose, settings, setSettings 
}) => {
    
    const handleToggle = (key: keyof PrivacySettings) => {
        setSettings({ ...settings, [key]: !settings[key] });
    };

    const toggleAll = (enable: boolean) => {
        setSettings({
            maskCompany: enable,
            maskSmo: enable,
            maskPeople: enable,
            maskEmail: enable,
            maskPhone: enable,
            maskAddress: enable,
            maskIP: enable
        });
    };

    const renderToggle = (label: string, key: keyof PrivacySettings, icon: string, desc: string) => (
        <div 
            onClick={() => handleToggle(key)}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${settings[key] ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings[key] ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-gray-100 text-slate-400 dark:bg-slate-800'}`}>
                    <Icon name={icon} size={18}/>
                </div>
                <div>
                    <h4 className={`text-sm font-bold ${settings[key] ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>{label}</h4>
                    <p className="text-[10px] text-slate-400">{desc}</p>
                </div>
            </div>
            
            <div className={`w-10 h-5 rounded-full relative transition-colors ${settings[key] ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${settings[key] ? 'left-6' : 'left-1'}`}></div>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} title="Privacy Shield Configuration" onClose={onClose}>
            <div className="space-y-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-3">
                    <Icon name="ShieldEye" className="text-indigo-600 dark:text-indigo-400 mt-1" size={24}/>
                    <div>
                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Data Redaction Active</h4>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 leading-relaxed">
                            Selected information types will be replaced with placeholders (e.g., [EMAIL_REDACTED]) <strong>before</strong> sending data to the AI API. This processing happens entirely in your browser.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pb-2">
                    <button onClick={() => toggleAll(true)} className="text-[10px] font-bold text-indigo-600 hover:underline">Select All</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => toggleAll(false)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:underline">Clear All</button>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
                    {renderToggle("Company Name", "maskCompany", "Building", "Matches exact name from Audit Charter")}
                    {renderToggle("SMO / ID", "maskSmo", "Tag", "Matches SMO code from Audit Charter")}
                    {renderToggle("Person Names", "maskPeople", "Users", "Matches Auditor & Interviewee names")}
                    {renderToggle("Emails", "maskEmail", "Mail", "Standard email patterns")}
                    {renderToggle("Phone Numbers", "maskPhone", "Phone", "Vietnamese & Intl phone patterns")}
                    {renderToggle("Addresses", "maskAddress", "MapPin", "Street/District patterns")}
                    {renderToggle("IP Addresses", "maskIP", "Globe", "IPv4 server addresses")}
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button onClick={onClose} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
                        Save & Apply Shield
                    </button>
                </div>
            </div>
        </Modal>
    );
};
