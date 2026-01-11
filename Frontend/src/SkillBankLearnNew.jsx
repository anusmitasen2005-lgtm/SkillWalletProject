import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Play, FileText, Video, Users, Clock, Calendar, Volume2, VolumeX, Info, Star, Headphones } from 'lucide-react';
import LiveClassReminderModal from './LiveClassReminderModal';
import OpportunitiesSection from './components/OpportunitiesSection';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const SkillBankLearnNew = ({ userId, onClose, language = 'en' }) => {
    const [activeTab, setActiveTab] = useState('video'); // video, document, live
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [playingAudio, setPlayingAudio] = useState(null); // ID of item playing audio
    const [reminderSession, setReminderSession] = useState(null); // Session to set reminder for

    // Translation Object
    const t = {
        en: {
            title: "SkillBank",
            subtitle: "Learn from the best",
            intro: "Here you can learn from skilled workers like you.",
            videoLessons: "Video Lessons",
            documents: "Documents",
            liveClasses: "Live Classes",
            loading: "Loading learning materials...",
            noContent: "No content available yet.",
            realDataOnly: "Real data only.",
            watchNow: "Watch Now",
            pages: "Pages",
            listenSummary: "Listen Summary",
            openDocument: "Open Document",
            liveClass: "LIVE CLASS",
            seatsLeft: "Seats Left",
            joinClass: "Join Class",
            reminderSet: "Reminder Set",
            setReminder: "Set a reminder so you don’t miss the class",
            viewDetails: "View class details",
            registered: "Registered for live session!",
            enrolled: "Enrolled and started lesson! Check your Skill Wallet.",
            teacher: "Trainer",
            duration: "Duration",
            date: "Date",
            language: "Language"
        },
        hi: {
            title: "स्किल बैंक",
            subtitle: "सर्वश्रेष्ठ से सीखें",
            intro: "यहाँ आप अपने जैसे कुशल श्रमिकों से सीख सकते हैं।",
            videoLessons: "वीडियो पाठ",
            documents: "दस्तावेज़",
            liveClasses: "लाइव कक्षाएं",
            loading: "सीखने की सामग्री लोड हो रही है...",
            noContent: "अभी कोई सामग्री उपलब्ध नहीं है।",
            realDataOnly: "केवल वास्तविक डेटा।",
            watchNow: "अभी देखें",
            pages: "पृष्ठ",
            listenSummary: "सारांश सुनें",
            openDocument: "दस्तावेज़ खोलें",
            liveClass: "लाइव क्लास",
            seatsLeft: "सीटें बची हैं",
            joinClass: "कक्षा में शामिल हों",
            reminderSet: "रिमाइंडर सेट है",
            setReminder: "रिमाइंडर सेट करें ताकि आप क्लास न चूकें",
            viewDetails: "कक्षा विवरण देखें",
            registered: "लाइव सत्र के लिए पंजीकृत!",
            enrolled: "नामांकित और पाठ शुरू किया! अपना स्किल वॉलेट देखें।",
            teacher: "प्रशिक्षक",
            duration: "अवधि",
            date: "दिनांक",
            language: "भाषा"
        }
    };

    const txt = t[language] || t.en;

    useEffect(() => {
        fetchItems();
        speak(txt.intro);
    }, [activeTab, language]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            if (activeTab === 'live') {
                const res = await axios.get(`${API_BASE_URL}/skillbank/sessions?user_id=${userId}`);
                setItems(res.data);
            } else {
                const res = await axios.get(`${API_BASE_URL}/skillbank/lessons?type=${activeTab}`);
                setItems(res.data);
            }
        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    const speak = (text, id = 'intro') => {
        if ('speechSynthesis' in window) {
            // If same ID is playing, stop it
            if (playingAudio === id) {
                window.speechSynthesis.cancel();
                setPlayingAudio(null);
                return;
            }

            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => setPlayingAudio(null);
            window.speechSynthesis.speak(utterance);
            setPlayingAudio(id);
        }
    };

    const handleEnroll = async (item) => {
        try {
            if (activeTab === 'live') {
                await axios.post(`${API_BASE_URL}/skillbank/enroll/session/${userId}/${item.id}`);
                alert("Registered for live session!");
            } else {
                const res = await axios.post(`${API_BASE_URL}/skillbank/enroll/lesson/${userId}/${item.id}`);
                const enrollmentId = res.data.enrollment_id;
                
                // Simulate starting the lesson immediately so it shows in "In Progress"
                await axios.post(`${API_BASE_URL}/skillbank/progress/${enrollmentId}`, {
                    progress: 10,
                    status: "IN_PROGRESS"
                });
                
                alert("Enrolled and started lesson! Check your Skill Wallet.");
            }
        } catch (err) {
            // alert("Already enrolled or error occurred.");
            console.log(err);
        }
    };

    const renderTab = (id, label, icon) => (
        <button 
            onClick={() => { setActiveTab(id); speak(label, `tab-${id}`); }}
            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                activeTab === id 
                ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                : 'bg-white text-gray-400 border border-gray-100'
            }`}
        >
            <div className="mb-1">{icon}</div>
            <span className="text-xs font-bold uppercase">{label}</span>
            {playingAudio === `tab-${id}` && <Volume2 size={12} className="animate-pulse mt-1" />}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-gray-50 z-[60] overflow-y-auto font-sans">
             {/* Header */}
             <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} className="text-gray-700" />
                </button>
                <div>
                    <h1 className="text-xl font-black text-blue-900 tracking-tight">SkillBank</h1>
                    <p className="text-xs text-gray-500 font-medium">Learn from the best</p>
                </div>
                <button onClick={() => speak("Here you can learn from skilled workers like you.")} className="ml-auto p-2 bg-gray-100 rounded-full">
                    <Volume2 size={20} className="text-blue-600" />
                </button>
            </div>

            <div className="p-4 max-w-md mx-auto">
                {/* Tabs */}
                <div className="flex gap-3 mb-6">
                    {renderTab('video', 'Video Lessons', <Video size={24} />)}
                    {renderTab('document', 'Documents', <FileText size={24} />)}
                    {renderTab('live', 'Live Classes', <Users size={24} />)}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-10 text-gray-400">Loading learning materials...</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-400 font-medium">No content available yet.</p>
                        <p className="text-xs text-gray-300 mt-2">Real data only.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map(item => (
                            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                {/* Conditional Rendering based on Type */}
                                
                                {activeTab === 'video' && (
                                    <>
                                        <div className="h-32 bg-gray-200 relative">
                                            {/* Thumbnail placeholder or real image if available */}
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                                <Play size={40} className="opacity-50" />
                                            </div>
                                            <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded">
                                                {item.duration_minutes || 10}:00
                                            </span>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-gray-900 leading-tight">{item.title}</h3>
                                                <button onClick={() => speak(`This video teaches ${item.title}`, item.id)} className="text-gray-400 hover:text-blue-600">
                                                    {playingAudio === item.id ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                                                <div className="text-xs">
                                                    <p className="font-bold text-gray-700">{item.teacher_name}</p>
                                                    <p className="text-gray-400">{item.teacher_profession}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">Beginner</span>
                                                <div className="flex gap-2">
                                                    <button className="p-2 text-gray-400 hover:text-yellow-500 bg-gray-50 rounded-lg">
                                                        <Star size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEnroll(item)}
                                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700"
                                                    >
                                                        <Play size={14} fill="currentColor" /> Watch Now
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'document' && (
                                    <div className="p-4">
                                        <div className="flex gap-4">
                                            <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                                                <FileText size={32} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900 text-sm mb-1 leading-tight">{item.title}</h3>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                                    <span>{item.pages || 12} Pages</span>
                                                    <span>•</span>
                                                    <span>{item.language || 'English'}</span>
                                                </div>
                                                <p className="text-xs text-gray-500">By {item.teacher_name}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <button 
                                                onClick={() => speak(`Document summary: ${item.description || item.title}`, `doc-${item.id}`)}
                                                className="flex-1 flex items-center justify-center gap-2 text-gray-600 font-bold text-xs bg-gray-50 px-3 py-2 rounded-lg hover:bg-gray-100"
                                            >
                                                <Headphones size={14} /> Listen Summary
                                            </button>
                                            <button 
                                                onClick={() => handleEnroll(item)}
                                                className="flex-1 text-blue-600 font-bold text-xs bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100"
                                            >
                                                Open Document
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'live' && (
                                    <div className="p-4 relative">
                                        {/* Header / Badges */}
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                                                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span> LIVE CLASS
                                            </span>
                                            
                                            {/* Action Icons */}
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        speak("Set a reminder so you don’t miss the class");
                                                        setReminderSession(item);
                                                    }}
                                                    className="p-2 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100"
                                                >
                                                    <Calendar size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => speak("View class details")}
                                                    className="p-2 text-gray-400 bg-gray-50 rounded-full hover:bg-gray-100"
                                                >
                                                    <Info size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-gray-900 text-lg mb-2 leading-tight">{item.topic || item.title}</h3>
                                        
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock size={16} className="text-gray-400" />
                                                <span>{new Date(item.scheduled_at).toLocaleDateString()} • {new Date(item.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Users size={16} className="text-gray-400" />
                                                <span>Trainer: {item.teacher_name || "Instructor"}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-xs font-bold text-orange-500">{item.seats_left || 6} Seats Left</span>
                                            <button 
                                                onClick={() => handleEnroll(item)}
                                                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700"
                                            >
                                                Join Class
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- OPPORTUNITIES NEAR YOU SECTION --- */}
            <div className="border-t border-gray-100 pt-2">
                <OpportunitiesSection userId={userId} language={language} />
            </div>

            {/* Reminder Modal */}
            {reminderSession && (
                <LiveClassReminderModal 
                    userId={userId} 
                    session={reminderSession} 
                    onClose={() => setReminderSession(null)} 
                    language={language}
                    onSuccess={() => {
                        alert(txt.reminderSet);
                        // Could update state to show reminder set icon
                    }}
                />
            )}
        </div>
    );
};

export default SkillBankLearnNew;