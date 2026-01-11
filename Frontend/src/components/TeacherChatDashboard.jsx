import React from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';

export default function TeacherChatDashboard({ onBack }) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white p-4 shadow-sm border-b border-gray-200 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare size={24} className="text-blue-600" />
                    Student Questions
                </h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <MessageSquare size={40} className="text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Messages Yet</h2>
                <p className="text-gray-500 max-w-xs">
                    When students ask questions about your lessons, they will appear here.
                </p>
                <button onClick={onBack} className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all">
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
}
