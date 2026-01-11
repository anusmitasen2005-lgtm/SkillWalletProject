import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ExternalLink, Share2, Bookmark, MapPin, Building2, BookOpen } from 'lucide-react';
import { InstructionSpeaker } from './VoiceHelpers';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const OpportunitiesSection = ({ userId, language }) => {
    const [activeTab, setActiveTab] = useState('schemes'); // schemes | training
    const [data, setData] = useState({ schemes: [], trainings: [], last_updated: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) fetchOpportunities();
    }, [userId]);

    const fetchOpportunities = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/skillbank/opportunities/${userId}`);
            setData(res.data);
        } catch (err) {
            console.error("Failed to fetch opportunities", err);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = (url, title) => {
        const text = `Check this out: ${title} - ${url}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    const getIntroText = () => {
        if (language === 'hi') return "ये आपके क्षेत्र में उपलब्ध सरकारी योजनाएं और प्रशिक्षण कार्यक्रम हैं।";
        return "These are real government schemes and training programs available near your area.";
    };

    const getEmptyText = () => {
        if (language === 'hi') return "अभी आपके क्षेत्र के लिए कोई योजना नहीं मिली। नई योजना आने पर हम आपको सूचित करेंगे।";
        return "No schemes found for your area right now. We will notify you if new schemes are announced.";
    };

    if (loading) return (
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
        </div>
    );

    const activeList = activeTab === 'schemes' ? data.schemes : data.trainings;

    return (
        <div className="mt-8 space-y-6">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h2 className="text-xl font-black text-gray-900">Opportunities Near You</h2>
                    {data.last_updated && (
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                            Updated Today
                        </p>
                    )}
                </div>
                <InstructionSpeaker text={getIntroText()} language={language} autoPlay={true} />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('schemes')}
                    className={`flex-1 py-4 px-2 rounded-xl text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                        activeTab === 'schemes' ? 'bg-white shadow-md text-blue-700' : 'text-gray-500 hover:bg-gray-200'
                    }`}
                >
                    <Building2 size={24} />
                    <span>Govt Schemes</span>
                </button>
                <button
                    onClick={() => setActiveTab('training')}
                    className={`flex-1 py-4 px-2 rounded-xl text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                        activeTab === 'training' ? 'bg-white shadow-md text-green-700' : 'text-gray-500 hover:bg-gray-200'
                    }`}
                >
                    <MapPin size={24} />
                    <span>Training Near You</span>
                </button>
            </div>

            {/* List */}
            <div className="space-y-4">
                {activeList.length > 0 ? (
                    activeList.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            {/* Decorative Stripe */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${activeTab === 'schemes' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                            
                            <div className="pl-3">
                                <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2">
                                    {item.title}
                                </h3>
                                
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="bg-gray-100 text-gray-600 text-[10px] font-bold uppercase px-2 py-1 rounded-md">
                                        {item.source}
                                    </span>
                                    {activeTab === 'training' && (
                                        <span className="bg-green-100 text-green-700 text-[10px] font-bold uppercase px-2 py-1 rounded-md">
                                            Offline / Online
                                        </span>
                                    )}
                                </div>

                                <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                                    {item.summary}
                                </p>

                                {/* Actions */}
                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                                    <a 
                                        href={item.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex-1 bg-blue-50 text-blue-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-100"
                                    >
                                        <ExternalLink size={16} />
                                        Open Official Site
                                    </a>
                                    
                                    <button 
                                        onClick={() => handleShare(item.url, item.title)}
                                        className="w-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-100"
                                    >
                                        <Share2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Voice Helper for Card */}
                            <div className="absolute top-4 right-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                <InstructionSpeaker 
                                    text={`This is ${item.title}. Tap open to see details.`} 
                                    language={language} 
                                    mini={true}
                                />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 px-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="text-4xl mb-4 grayscale opacity-50">🏛️</div>
                        <p className="text-gray-500 font-medium mb-2">
                            {getEmptyText()}
                        </p>
                    </div>
                )}
            </div>
            
            <p className="text-center text-xs text-gray-400 px-6">
                Disclaimer: We only show links from official government websites (gov.in, nic.in). We do not guarantee enrollment.
            </p>
        </div>
    );
};

export default OpportunitiesSection;
