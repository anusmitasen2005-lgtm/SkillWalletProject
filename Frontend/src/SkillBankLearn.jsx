import React, { useState, useEffect } from 'react';
import { Video, FileText, Calendar, Play, Clock, User, Bell, Volume2, VolumeX } from 'lucide-react';
import axios from 'axios';

export default function SkillBankLearn({ userId }) {
    const [activeTab, setActiveTab] = useState('video'); // video, doc, live
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [speakingTab, setSpeakingTab] = useState(null); // id of tab currently speaking

    // Tab Data
    const tabs = [
        { id: 'video', label: 'Video Lessons', icon: Video, voice: "Video Lessons. Watch and learn practical skills." },
        { id: 'doc', label: 'Documents', icon: FileText, voice: "Documents and Guides. Read step by step instructions." },
        { id: 'live', label: 'Live Classes', icon: Calendar, voice: "Live Classes. Interact directly with teachers." }
    ];

    const toggleSpeech = (id, text, e) => {
        if (e) e.stopPropagation();
        
        if (speakingTab === id) {
            // Stop
            window.speechSynthesis.cancel();
            setSpeakingTab(null);
        } else {
            // Play
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(text);
            msg.lang = 'en-US';
            msg.onend = () => setSpeakingTab(null);
            window.speechSynthesis.speak(msg);
            setSpeakingTab(id);
        }
    };

    // Cleanup
    useEffect(() => {
        return () => window.speechSynthesis.cancel();
    }, []);

    // Fetch Items
    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                let url = 'http://localhost:8000/api/v1/skillbank/lessons';
                if (activeTab === 'live') {
                    url = 'http://localhost:8000/api/v1/skillbank/sessions';
                } else {
                    url += `?type=${activeTab === 'video' ? 'video' : 'document'}`;
                }

                const res = await axios.get(url);
                setItems(res.data);
            } catch (e) {
                console.error("Failed to fetch lessons", e);
            }
            setLoading(false);
        };

        fetchItems();
    }, [activeTab]);

    // Handle Tab Change
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        // No auto-speak
    };

    // Handle Card Click (Assuming we keep speech on card click or remove it? 
    // User said "only play only when i select the icon speaker icon". 
    // This implies removing auto-play on card click too, maybe? 
    // Or maybe card click is "opening skill" which user mentioned.
    // I will remove speech from card click to be safe and consistent, 
    // or add a speaker icon to the card? 
    // "voice instructions continuously play while i open skill" - likely refers to the tab/intro.
    // I will leave card click speech for now as it might be content-related, 
    // BUT user said "only play only when i select the icon". 
    // So I should probably add a speaker icon to the cards too if I want to be strict.
    // For now, I'll disable the auto-speech on card click and just let it open/expand or do nothing if it was just speech.
    // The current card click logic just speaks and maybe sets reminder. 
    // I'll add a speaker icon to the card for the speech part.
    
    // Actually, looking at the code, handleCardClick speaks the description.
    // I will modify the card to have a speaker button.
    
    const handleCardClick = (item) => {
        // Only action logic here (like reminder for live class)
        if (activeTab === 'live') {
            if (window.confirm("Would you like to set a reminder for this class?")) {
                alert("Reminder set! We will send an SMS to your registered number.");
            }
        }
    };

    return (
        <div className="px-4">
            {/* Tabs */}
            <div className="flex justify-between gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex flex-col items-center p-3 rounded-xl min-w-[100px] transition-all relative ${
                            activeTab === tab.id 
                                ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                                : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                    >
                        <div className="absolute top-1 right-1">
                             <div 
                                onClick={(e) => toggleSpeech(tab.id, tab.voice, e)}
                                className={`p-1 rounded-full ${speakingTab === tab.id ? 'bg-yellow-400 text-black' : 'bg-transparent opacity-50 hover:opacity-100 hover:bg-black/10'}`}
                             >
                                 {speakingTab === tab.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                             </div>
                        </div>
                        <tab.icon size={24} className="mb-2 mt-2" />
                        <span className="text-xs font-bold text-center leading-tight">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : (
                <div className="space-y-4">
                    {Array.isArray(items) && items.length > 0 ? items.map(item => (
                        <div 
                            key={item.id}
                            onClick={() => handleCardClick(item)}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:scale-95 transition-transform cursor-pointer relative overflow-hidden group"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                            
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-800 text-lg leading-tight pr-8">{item.title}</h3>
                                <button
                                    onClick={(e) => {
                                        const text = activeTab === 'live' 
                                            ? `Live Class: ${item.title}. Scheduled for ${new Date(item.scheduled_at).toLocaleString()}. Taught by ${item.teacher_name}.`
                                            : `${item.title}. ${item.description}. Taught by ${item.teacher_name}.`;
                                        toggleSpeech(`item-${item.id}`, text, e);
                                    }}
                                    className={`p-2 rounded-full absolute top-2 right-2 ${speakingTab === `item-${item.id}` ? 'bg-blue-100 text-blue-600' : 'text-gray-300 hover:text-blue-500'}`}
                                >
                                    {speakingTab === `item-${item.id}` ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                </button>
                            </div>
                            
                            {activeTab === 'live' && (
                                <div className="flex gap-2 mb-2">
                                    <button 
                                        className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm hover:bg-red-700 transition-colors z-10"
                                    >
                                        JOIN
                                    </button>
                                    <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold flex items-center">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />
                                        LIVE
                                    </span>
                                </div>
                            )}
                            
                            <p className="text-gray-500 text-sm mb-3 line-clamp-2">{item.description}</p>
                            
                            <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
                                <div className="flex items-center gap-1">
                                    <User size={14} />
                                    <span>{item.teacher_name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {activeTab === 'live' ? (
                                        <>
                                            <Clock size={14} />
                                            <span>{new Date(item.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </>
                                    ) : (
                                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md font-bold">
                                            {item.price === 0 ? 'FREE' : `₹${item.price}`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-10 text-gray-400">
                            No items found in this category.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
