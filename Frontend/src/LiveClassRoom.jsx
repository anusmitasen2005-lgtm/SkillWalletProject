import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Circle, Volume2, X } from 'lucide-react';
import Chatbot from './components/Chatbot';

const LiveClassRoom = ({ 
    classTitle = "Wall Painting – Advanced Finishing",
    teacherName = "Suresh Verma",
    onLeave
}) => {
    const [instructionsPlayed, setInstructionsPlayed] = useState(false);

    // Initial Voice Instruction
    useEffect(() => {
        if (!instructionsPlayed) {
            const text = "You can ask your doubts here using chat or voice. Your teacher will reply during the class.";
            const utterance = new SpeechSynthesisUtterance(text);
            // utterance.lang = 'hi-IN'; // Could be Hindi based on preference
            window.speechSynthesis.speak(utterance);
            setInstructionsPlayed(true);
        }
        return () => window.speechSynthesis.cancel();
    }, [instructionsPlayed]);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onLeave} className="p-2 hover:bg-gray-800 rounded-full">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">{classTitle}</h1>
                        <p className="text-xs text-gray-400">Trainer: {teacherName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse">
                    <Circle size={8} fill="currentColor" className="text-white" />
                    <span className="text-xs font-bold uppercase tracking-wide">Live Now</span>
                </div>
            </div>

            {/* Instruction Strip */}
            <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                        <Volume2 size={14} />
                    </div>
                    <span>You can ask doubts using chat or voice.</span>
                </div>
                <button onClick={() => setInstructionsPlayed(true)} className="opacity-50 hover:opacity-100">
                    <X size={16} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative bg-gray-800 flex items-center justify-center overflow-hidden">
                {/* Simulated Video Stream */}
                <div className="text-center opacity-50">
                    <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Users size={48} className="text-gray-500" />
                    </div>
                    <p className="text-gray-400">Live Video Stream</p>
                    <p className="text-xs text-gray-600 mt-2">(Teacher Camera Feed)</p>
                </div>

                {/* Chatbot Integration */}
                <Chatbot 
                    mode="live" 
                    teacherName={teacherName} 
                    isLive={true} 
                />
            </div>
        </div>
    );
};

export default LiveClassRoom;
