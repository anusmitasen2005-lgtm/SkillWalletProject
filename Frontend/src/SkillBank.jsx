import React, { useState, useEffect } from 'react';
import { BookOpen, Video, FileText, Calendar, ArrowLeft, Mic, Volume2, VolumeX } from 'lucide-react';
import SkillBankLearn from './SkillBankLearnNew';
import SkillBankTeach from './SkillBankTeach';

export default function SkillBank({ userId, onClose }) {
    const [mode, setMode] = useState('learn'); // 'learn' or 'teach'
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    // Voice Helper
    const toggleVoice = (text) => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            window.speechSynthesis.cancel(); // Stop any other
            const msg = new SpeechSynthesisUtterance(text);
            msg.lang = 'en-US';
            msg.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(msg);
            setIsSpeaking(true);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const welcomeText = "Welcome to Skill Bank. Here you have two possibilities. You can learn from others, or you can teach what you already know.";

    const handleTeachClick = () => {
        setMode('teach');
        // No auto-play
    };

    return (
        <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
                    <button 
                        onClick={onClose}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                            <BookOpen className="text-blue-600" size={20} />
                            SkillBank
                        </h1>
                        <button 
                            onClick={() => toggleVoice(welcomeText)}
                            className={`p-1 rounded-full transition-colors ${isSpeaking ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                            {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </div>
                    <div className="w-8" /> {/* Spacer */}
                </div>
            </div>

            <div className="max-w-md mx-auto pb-20">
                {/* Learn / Teach Toggle (Visual Separation) */}
                {mode === 'learn' && (
                    <div className="px-4 mt-6">
                        <button 
                            onClick={handleTeachClick}
                            className="w-full bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all"
                        >
                            <div>
                                <h3 className="text-amber-900 font-bold text-lg">Teach What You Know</h3>
                                <p className="text-amber-800 text-sm opacity-80">Share your skill & earn</p>
                            </div>
                            <div className="bg-amber-500 text-white p-2 rounded-full">
                                <Mic size={20} />
                            </div>
                        </button>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="mt-4">
                    {mode === 'learn' ? (
                        <SkillBankLearn userId={userId} />
                    ) : (
                        <SkillBankTeach userId={userId} onBack={() => setMode('learn')} />
                    )}
                </div>
            </div>
        </div>
    );
}
