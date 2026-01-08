
import { useState, useRef, useCallback } from 'react';

export const useVoiceInput = (language: 'en' | 'vi', onResult: (text: string) => void) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const toggleListening = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice-to-Text is not supported in this browser.");
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language === 'vi' ? 'vi-VN' : 'en-US';

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    onResult(finalTranscript.trim());
                }
            };

            recognition.onerror = (event: any) => {
                console.error("Speech Error", event.error);
                setIsListening(false);
            };

            recognition.onend = () => setIsListening(false);

            recognition.start();
            recognitionRef.current = recognition;
            setIsListening(true);
        } catch (e) {
            console.error("Failed to start recognition", e);
            setIsListening(false);
        }
    }, [isListening, language, onResult]);

    return { isListening, toggleListening };
};
