import React, { useState } from 'react';
import { Home, Wallet, Play, Upload, Presentation, Bell, Headset, LogOut } from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange, onLogout, hasUploaded, language = 'en' }) => {
    const [hoveredItem, setHoveredItem] = useState(null);

    const t = {
        en: {
            home: "Home",
            wallet: "My Skill Wallet",
            learn: "Learn Skills",
            teach: "Teach Skills",
            myTeaching: "My Teaching",
            notifications: "Notifications",
            help: "Help & Support",
            logout: "Logout",
            voiceHome: "Go to main page",
            voiceWallet: "Wallet Shows learning and progress",
            voiceLearn: "Learn from videos, docs, and live classes",
            voiceTeach: "Upload your teaching modules",
            voiceMyTeaching: "Manage your teaching content",
            voiceNotifications: "View your notifications",
            voiceHelp: "Get help and support"
        },
        hi: {
            home: "होम",
            wallet: "मेरा स्किल वॉलेट",
            learn: "कौशल सीखें",
            teach: "कौशल सिखाएं",
            myTeaching: "मेरा शिक्षण",
            notifications: "सूचनाएं",
            help: "सहायता और समर्थन",
            logout: "लॉग आउट",
            voiceHome: "मुख्य पृष्ठ पर जाएं",
            voiceWallet: "वॉलेट सीखने और प्रगति को दर्शाता है",
            voiceLearn: "वीडियो, दस्तावेज़ और लाइव कक्षाओं से सीखें",
            voiceTeach: "अपने शिक्षण मॉड्यूल अपलोड करें",
            voiceMyTeaching: "अपनी शिक्षण सामग्री का प्रबंधन करें",
            voiceNotifications: "अपनी सूचनाएं देखें",
            voiceHelp: "सहायता और समर्थन प्राप्त करें"
        }
    };

    const txt = t[language] || t.en;

    const speak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            if (language === 'hi') utterance.lang = 'hi-IN';
            window.speechSynthesis.speak(utterance);
        }
    };

    const menuItems = [
        { id: 'home', label: txt.home, icon: <Home size={24} />, voice: txt.voiceHome },
        { id: 'wallet', label: txt.wallet, icon: <Wallet size={24} />, voice: txt.voiceWallet },
        { id: 'learn', label: txt.learn, icon: <Play size={24} />, voice: txt.voiceLearn },
        { id: 'teach', label: txt.teach, icon: <Upload size={24} />, voice: txt.voiceTeach },
        { id: 'teaching_dashboard', label: txt.myTeaching, icon: <Presentation size={24} />, voice: txt.voiceMyTeaching }
    ];

    menuItems.push(
        { id: 'notifications', label: txt.notifications, icon: <Bell size={24} />, voice: txt.voiceNotifications },
        { id: 'help', label: txt.help, icon: <Headset size={24} />, voice: txt.voiceHelp }
    );

    return (
        <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-16 overflow-y-auto hidden md:flex flex-col pb-20">
            <div className="flex flex-col py-4">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            onTabChange(item.id);
                            speak(item.voice);
                        }}
                        onMouseEnter={() => {
                            setHoveredItem(item.id);
                            // Optional: Speak on hover? User asked for "Tooltip voice", usually implies hover or click. 
                            // Click is safer for "Listen button" style, but "Tooltip" usually means hover.
                            // I'll stick to click for voice to avoid noise, or maybe a small delay.
                            // The user said "Tooltip voice: ...", I will add a small '?' icon or just rely on click/hover.
                            // Let's speak on hover with a delay or just click.
                            // For accessibility, click is often better for "Listen" buttons.
                            // But user said "Tooltip voice", so I will show a tooltip.
                        }}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`flex items-center gap-4 px-6 py-3 hover:bg-gray-100 transition-colors text-left relative group ${
                            activeTab === item.id ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' : 'text-gray-700'
                        }`}
                    >
                        <div className={`${activeTab === item.id ? 'text-blue-700' : 'text-gray-500'}`}>
                            {item.icon}
                        </div>
                        <span className={`font-medium ${activeTab === item.id ? 'font-bold' : ''}`}>
                            {item.label}
                        </span>

                        {/* Tooltip (Visual) */}
                        <div className="absolute left-full ml-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {item.voice}
                        </div>
                    </button>
                ))}
            </div>

            <div className="mt-auto px-6 py-4 border-t border-gray-100">
                 <button onClick={onLogout} className="flex items-center gap-4 text-gray-500 hover:text-red-600 transition-colors">
                    <LogOut size={24} />
                    <span className="font-medium">{txt.logout}</span>
                 </button>
            </div>
        </div>
    );
};

export default Sidebar;
