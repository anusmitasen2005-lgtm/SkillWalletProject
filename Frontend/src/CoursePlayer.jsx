import React from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import Chatbot from './components/Chatbot';

const CoursePlayer = ({ 
    lessonTitle = "Safety Basics in Construction",
    teacherName = "Rajesh Kumar",
    onBack
}) => {
    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-4 flex items-center gap-4 shadow-sm shrink-0">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} className="text-gray-700" />
                </button>
                <div>
                    <h1 className="font-bold text-lg text-gray-900 line-clamp-1">{lessonTitle}</h1>
                    <p className="text-xs text-gray-500">Instructor: {teacherName}</p>
                </div>
            </div>

            {/* Video Player Area */}
            <div className="bg-black aspect-video w-full flex items-center justify-center relative shrink-0">
                <div className="text-center text-white opacity-80">
                    <Play size={48} className="mx-auto mb-2" />
                    <p>Video Player Mockup</p>
                </div>
                
                {/* Controls Overlay Mock */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                        <Play size={20} fill="currentColor" />
                        <span className="text-xs font-mono">04:20 / 12:45</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <RotateCcw size={20} />
                        <SkipForward size={20} />
                    </div>
                </div>
            </div>

            {/* Course Content / Description */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 relative">
                <div className="max-w-2xl mx-auto space-y-6 pb-20">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="font-bold text-gray-800 mb-2">Lesson Overview</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            In this lesson, we will cover the fundamental safety protocols required at any construction site.
                            You will learn about personal protective equipment (PPE), hazard identification, and emergency procedures.
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="font-bold text-gray-800 mb-4">Resources</h2>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded flex items-center justify-center font-bold">PDF</div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold">Safety Checklist.pdf</h4>
                                    <p className="text-xs text-gray-400">2.4 MB</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chatbot Integration (Offline Mode) */}
                <Chatbot 
                    mode="recorded" 
                    teacherName={teacherName} 
                    isLive={false} 
                />
            </div>
        </div>
    );
};

export default CoursePlayer;
