
import React from 'react';
import { Icon } from '../../UI';
import { UploadedFile } from '../../../types';

interface FilePreviewGridProps {
    files: UploadedFile[];
    onRemoveFile?: (fileId: string) => void;
}

export const FilePreviewGrid: React.FC<FilePreviewGridProps> = ({ files, onRemoveFile }) => {
    if (files.length === 0) return null;

    return (
        <div className="px-4 md:px-6 pt-4 pb-2">
            <div className="flex flex-wrap gap-3">
                {files.map((fileEntry) => {
                    const isImage = fileEntry.file.type.startsWith('image/');
                    const isPdf = fileEntry.file.type.includes('pdf');
                    
                    return (
                        <div key={fileEntry.id} className="relative group w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden transition-all hover:shadow-md">
                            {isImage ? (
                                <img src={URL.createObjectURL(fileEntry.file)} alt="preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                            ) : (
                                <div className="flex flex-col items-center p-2 text-center">
                                    <Icon name={isPdf ? "BookOpen" : "FileText"} size={24} className="text-slate-400 mb-1"/>
                                    <span className="text-[9px] text-slate-500 line-clamp-2 leading-tight break-all">{fileEntry.file.name}</span>
                                </div>
                            )}
                            
                            {/* Status Indicator Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-start justify-end p-1">
                                {fileEntry.status === 'processing' && (
                                    <div className="absolute inset-0 bg-white/80 dark:bg-black/50 flex items-center justify-center">
                                        <Icon name="Loader" size={16} className="animate-spin text-indigo-600"/>
                                    </div>
                                )}
                                {fileEntry.status === 'success' && <div className="bg-emerald-500 rounded-full p-0.5"><Icon name="CheckThick" size={10} className="text-white"/></div>}
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onRemoveFile && onRemoveFile(fileEntry.id); }}
                                    className="bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-sm"
                                    title="Remove File"
                                >
                                    <Icon name="X" size={10}/>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
