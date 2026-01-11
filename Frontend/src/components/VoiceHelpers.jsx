import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Mic, MicOff } from 'lucide-react';

// --- Text-to-Speech Component ---
export const InstructionSpeaker = ({ text, language = 'en', className = "" }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);

    const toggleVoice = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            window.speechSynthesis.cancel(); // Stop any previous
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Basic language mapping
            if (language === 'hi') {
                utterance.lang = 'hi-IN';
            } else {
                utterance.lang = 'en-US';
            }
            
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    return (
        <button 
            type="button"
            onClick={toggleVoice} 
            className={`p-2 rounded-full transition-colors ${isSpeaking ? 'bg-blue-600 text-white animate-pulse' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} ${className}`}
            title={isSpeaking ? "Stop Speaking" : "Read Instructions"}
        >
            {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
    );
};

// --- Speech-to-Text Component ---
export const VoiceInput = ({ onResult, language = 'en', className = "" }) => {
    const [isListening, setIsListening] = useState(false);

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice input is not supported in this browser. Please use Chrome.");
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (onResult) {
                onResult(transcript);
            }
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => setIsListening(false);

        recognition.start();
    };

    return (
        <button 
            type="button"
            onClick={startListening}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${isListening ? 'bg-red-50 text-red-600 animate-pulse' : 'text-gray-400 hover:text-blue-600 hover:bg-gray-50'} ${className}`}
            title="Speak to Type"
        >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
    );
};
