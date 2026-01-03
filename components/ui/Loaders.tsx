
import React from 'react';
import { Icon } from './Primitives';

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
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 animate-pulse px-4 text-center max-w-[80%]">{message}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Gemini AI Processing...
        </p>
    </div>
);
