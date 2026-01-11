import React from 'react';
import { Menu, Search, Globe, Bell } from 'lucide-react';

const TopBar = ({ toggleSidebar, userProfile, language, setLanguage }) => {
    
    const speak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <div className="h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4">
            {/* Left: Menu & Logo */}
            <div className="flex items-center gap-4">
                <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 rounded-full md:hidden">
                    <Menu size={24} />
                </button>
                <div className="flex items-center gap-2" onClick={() => speak("Skill Wallet. Your digital professional identity.")}>
                    <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                        S
                    </div>
                    <span className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">Skill Wallet</span>
                </div>
            </div>

            {/* Center: Search (Optional/Future) */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search skills, jobs, or people..." 
                        className="w-full bg-gray-100 border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 sm:gap-6">
                
                {/* Language Toggle */}
                <button 
                    onClick={() => {
                        const newLang = language === 'en' ? 'hi' : 'en';
                        setLanguage(newLang);
                        speak(newLang === 'en' ? "Language changed to English" : "Bhasha Hindi mein badal di gayi hai");
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    <Globe size={18} className="text-gray-600" />
                    <span className="text-sm font-bold text-gray-700">{language === 'en' ? 'English' : 'हिंदी'}</span>
                </button>

                {/* Notifications */}
                <button className="relative p-2 hover:bg-gray-100 rounded-full">
                    <Bell size={24} className="text-gray-600" />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                {/* Profile Photo */}
                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                    {userProfile?.profile_photo_file_path ? (
                        <img src={`http://localhost:8000/${userProfile.profile_photo_file_path}`} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-700 font-bold">
                            {userProfile?.name ? userProfile.name[0] : 'U'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopBar;
