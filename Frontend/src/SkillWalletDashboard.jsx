import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, BookOpen, Clock, TrendingUp, CheckCircle, Search, Filter, Mic, Play, Volume2, Video, FileText, Users } from 'lucide-react';
import { InstructionSpeaker } from './components/VoiceHelpers';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const SkillWalletDashboard = ({ userId, language = 'en', onCourseSelect }) => {
    const [stats, setStats] = useState({ enrolled: 0, not_started: 0, in_progress: 0, completed: 0 });
    const [learningTime, setLearningTime] = useState({ total_minutes: 0, display: "0m" });
    const [growth, setGrowth] = useState({ current_score: 300, previous_score: 300, growth_message: "Start learning to grow your skill score." });
    const [enrollments, setEnrollments] = useState([]); // List of courses
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All'); // Type filter
    const [statusFilter, setStatusFilter] = useState('ALL'); // Card filter (Status)
    const [languageFilter, setLanguageFilter] = useState('All'); // Language
    const [difficultyFilter, setDifficultyFilter] = useState('All'); // Difficulty
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const t = {
        en: {
            title: "Skill Wallet",
            subtitle: "Access all your purchased modules, track your learning, and grow your skills step by step.",
            enrolled: "Enrolled Modules",
            notStarted: "Not Started",
            inProgress: "In Progress",
            completed: "Completed",
            skillGrowth: "Your Skill Growth",
            lastMonth: "Last Month",
            today: "Today",
            learningTime: "Learning Time",
            totalLearningTime: "Total Learning Time",
            thisWeek: "This Week",
            thisMonth: "This Month",
            searchPlaceholder: "Search your courses or skills...",
            skillType: "Skill Type",
            language: "Language",
            difficulty: "Difficulty",
            status: "Status",
            all: "All",
            video: "Video",
            document: "Document",
            live: "Live",
            beginner: "Beginner",
            intermediate: "Intermediate",
            advanced: "Advanced",
            ongoing: "Ongoing",
            filters: "Filters",
            completedStatus: "Completed",
            completedPercent: "Completed"
        },
        hi: {
            title: "स्किल वॉलेट",
            subtitle: "अपने सभी खरीदे गए मॉड्यूल तक पहुंचें, अपनी सीख को ट्रैक करें, और कदम दर कदम अपने कौशल को बढ़ाएं।",
            enrolled: "नामांकित मॉड्यूल",
            notStarted: "शुरू नहीं किया",
            inProgress: "जारी है",
            completed: "पूरा हुआ",
            skillGrowth: "आपका कौशल विकास",
            lastMonth: "पिछले महीने",
            today: "आज",
            learningTime: "सीखने का समय",
            totalLearningTime: "कुल सीखने का समय",
            thisWeek: "इस सप्ताह",
            thisMonth: "इस महीने",
            searchPlaceholder: "अपने पाठ्यक्रम या कौशल खोजें...",
            skillType: "कौशल प्रकार",
            language: "भाषा",
            difficulty: "कठिनाई",
            status: "स्थिति",
            all: "सभी",
            video: "वीडियो",
            document: "दस्तावेज़",
            live: "लाइव",
            beginner: "शुरुआती",
            intermediate: "मध्यम",
            advanced: "उन्नत",
            ongoing: "जारी है",
            filters: "फिल्टर",
            completedStatus: "पूरा हुआ",
            completedPercent: "पूरा हुआ"
        }
    };

    const text = t[language] || t.en;

    useEffect(() => {
        if (userId) {
            fetchDashboardData();
            speak(language === 'hi' ? "स्किल वॉलेट डैशबोर्ड में आपका स्वागत है।" : "Welcome to your Skill Wallet Dashboard.");
        }
    }, [userId, language]);

    const fetchDashboardData = async () => {
        try {
            // Updated endpoint to match backend implementation
            const res = await axios.get(`${API_BASE_URL}/dashboard/stats/${userId}`);
            setStats(res.data.enrollment);
            setLearningTime(res.data.learning_time);
            setGrowth(res.data.skill_growth);
            
            // Fetch enrollments list
             const enrollRes = await axios.get(`${API_BASE_URL}/skillbank/enrollments/${userId}`);
             setEnrollments(enrollRes.data);
        } catch (err) {
            console.error("Failed to fetch dashboard", err);
        } finally {
            setLoading(false);
        }
    };

    const speak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            // Try to set Hindi voice if language is Hindi
            if (language === 'hi') {
                utterance.lang = 'hi-IN';
            }
            window.speechSynthesis.speak(utterance);
        }
    };

    // Filter Logic
    const filteredEnrollments = (enrollments || []).filter(e => {
        // Status Filter
        if (statusFilter === 'NOT_STARTED' && (e.progress_percent > 0 || e.status === 'COMPLETED')) return false;
        if (statusFilter === 'IN_PROGRESS' && (e.progress_percent === 0 || e.status === 'COMPLETED')) return false;
        if (statusFilter === 'COMPLETED' && e.status !== 'COMPLETED') return false;
        if (statusFilter === 'ONGOING' && e.status === 'COMPLETED') return false; // New 'Ongoing' status logic
        
        // Active Filter (Type)
        if (activeFilter !== 'All' && e.lesson?.type?.toLowerCase() !== activeFilter.toLowerCase()) return false;

        // Language Filter
        if (languageFilter !== 'All' && e.lesson?.language?.toLowerCase() !== languageFilter.toLowerCase()) return false; // Assuming lesson has language field

        // Difficulty Filter
        if (difficultyFilter !== 'All' && e.lesson?.difficulty?.toLowerCase() !== difficultyFilter.toLowerCase()) return false; // Assuming lesson has difficulty field
        
        // Search Filter
        if (searchTerm && !e.lesson?.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        
        return true;
    });

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Skill Wallet...</div>;

    return (
        <div className="space-y-8 pb-20">
            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-black text-blue-900 tracking-tight">{text.title}</h1>
                    <button onClick={() => speak(text.subtitle)} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                        <Volume2 size={20} />
                    </button>
                </div>
                <p className="text-gray-500 font-medium">{text.subtitle}</p>
            </div>
            
            {/* 1. Progress Summary Cards (REAL DATA) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`bg-white p-5 rounded-2xl shadow-sm border transition-all cursor-pointer hover:scale-[1.02] ${statusFilter === 'ALL' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100'}`}
                        onClick={() => { setStatusFilter('ALL'); speak(`${text.enrolled}: ${stats.total}`); }}>
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3">
                        <BookOpen size={24} />
                    </div>
                    <span className="text-3xl font-black text-gray-900 block">{stats.total}</span>
                    <span className="text-xs uppercase font-bold text-gray-400">{text.enrolled}</span>
                </div>

                <div className={`bg-white p-5 rounded-2xl shadow-sm border transition-all cursor-pointer hover:scale-[1.02] ${statusFilter === 'NOT_STARTED' ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-100'}`}
                        onClick={() => { setStatusFilter('NOT_STARTED'); speak(`${text.notStarted}: ${stats.not_started}`); }}>
                    <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 mb-3">
                        <Clock size={24} />
                    </div>
                    <span className="text-3xl font-black text-gray-900 block">{stats.not_started}</span>
                    <span className="text-xs uppercase font-bold text-gray-400">{text.notStarted}</span>
                </div>

                <div className={`bg-white p-5 rounded-2xl shadow-sm border transition-all cursor-pointer hover:scale-[1.02] ${statusFilter === 'IN_PROGRESS' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-100'}`}
                        onClick={() => { setStatusFilter('IN_PROGRESS'); speak(`${text.inProgress}: ${stats.in_progress}`); }}>
                    <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-3">
                        <TrendingUp size={24} />
                    </div>
                    <span className="text-3xl font-black text-gray-900 block">{stats.in_progress}</span>
                    <span className="text-xs uppercase font-bold text-gray-400">{text.inProgress}</span>
                </div>

                <div className={`bg-white p-5 rounded-2xl shadow-sm border transition-all cursor-pointer hover:scale-[1.02] ${statusFilter === 'COMPLETED' ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-100'}`}
                        onClick={() => { setStatusFilter('COMPLETED'); speak(`${text.completed}: ${stats.completed}`); }}>
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-3">
                        <CheckCircle size={24} />
                    </div>
                    <span className="text-3xl font-black text-gray-900 block">{stats.completed}</span>
                    <span className="text-xs uppercase font-bold text-gray-400">{text.completed}</span>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* 2. Skill Growth Tracker (MAJOR ADDITION) */}
                <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-gray-900">{text.skillGrowth}</h3>
                        <button onClick={() => speak(growth.growth_message)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full">
                            <Volume2 size={20} />
                        </button>
                    </div>
                    
                    <div className="relative pt-6 pb-2 px-2">
                        {/* Progress Bar Container */}
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
                            {/* Previous Score Marker (Background bar) */}
                            <div className="absolute top-0 left-0 h-full bg-blue-200 transition-all duration-1000" style={{ width: `${(growth.previous_score / 1000) * 100}%` }}></div>
                            {/* Current Score Marker (Foreground bar) */}
                            <div className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(growth.current_score / 1000) * 100}%` }}></div>
                        </div>

                        {/* Labels */}
                        <div className="flex justify-between text-xs font-bold text-gray-400 mt-2 uppercase tracking-wider">
                            <span>0</span>
                            <span>500</span>
                            <span>1000</span>
                        </div>

                        {/* Floating Markers */}
                        <div className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center transition-all duration-1000" style={{ left: `${(growth.previous_score / 1000) * 100}%` }}>
                            <span className="text-xs font-bold text-gray-400 mb-1">{text.lastMonth}</span>
                            <div className="w-0.5 h-6 bg-gray-400 mb-1"></div>
                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{growth.previous_score}</span>
                        </div>

                        <div className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center transition-all duration-1000 z-10" style={{ left: `${(growth.current_score / 1000) * 100}%` }}>
                            <span className="text-xs font-bold text-blue-600 mb-1">{text.today}</span>
                            <div className="w-0.5 h-6 bg-blue-600 mb-1"></div>
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-md">{growth.current_score}</span>
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-blue-50 rounded-xl flex gap-4 items-start">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                        <p className="text-sm text-blue-900 leading-relaxed font-medium">
                            {growth.growth_message}
                        </p>
                    </div>
                </div>

                {/* 3. Learning Time Tracker Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-900">{text.learningTime}</h3>
                            <Clock size={20} className="text-orange-500" />
                        </div>
                        <div className="text-center py-6">
                            <span className="text-4xl font-black text-gray-900 block mb-1">{learningTime.display}</span>
                            <span className="text-xs uppercase font-bold text-gray-400">{text.totalLearningTime}</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">{text.thisWeek}</span>
                                <span className="font-bold text-gray-900">{learningTime.weekly_display || "0m"}</span> 
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">{text.thisMonth}</span>
                                <span className="font-bold text-gray-900">{learningTime.monthly_display || "0m"}</span> 
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 p-3 bg-orange-50 rounded-xl text-xs text-orange-800 font-medium">
                        "More learning time increases your skill score and job opportunities."
                    </div>
                </div>
            </div>

            {/* 4. Search & Filters */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder={text.searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold border transition-all ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Filter size={20} />
                        {text.filters}
                    </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-in slide-in-from-top-2">
                        {/* Type */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{text.skillType}</label>
                            <div className="flex flex-wrap gap-2">
                                {['All', 'Video', 'Document', 'Live'].map(filter => (
                                    <button 
                                        key={filter}
                                        onClick={() => setActiveFilter(filter)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                            activeFilter === filter 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {text[filter.toLowerCase()] || filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Language */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{text.language}</label>
                            <div className="flex flex-wrap gap-2">
                                {['All', 'Hindi', 'English'].map(filter => (
                                    <button 
                                        key={filter}
                                        onClick={() => setLanguageFilter(filter)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                            languageFilter === filter 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {text[filter.toLowerCase()] || filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Difficulty */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{text.difficulty}</label>
                            <div className="flex flex-wrap gap-2">
                                {['All', 'Beginner', 'Intermediate', 'Advanced'].map(filter => (
                                    <button 
                                        key={filter}
                                        onClick={() => setDifficultyFilter(filter)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                            difficultyFilter === filter 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {text[filter.toLowerCase()] || filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{text.status}</label>
                            <div className="flex flex-wrap gap-2">
                                {['ALL', 'ONGOING', 'COMPLETED'].map(filter => (
                                    <button 
                                        key={filter}
                                        onClick={() => setStatusFilter(filter)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                            statusFilter === filter 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        {filter === 'ALL' ? text.all : filter === 'ONGOING' ? text.ongoing : text.completedStatus}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Enrolled Courses List */}
            <div className="grid md:grid-cols-2 gap-4">
                 {filteredEnrollments.map((enrollment) => (
                     <div 
                        key={enrollment.id} 
                        onClick={() => onCourseSelect && onCourseSelect(enrollment.lesson)}
                        className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 cursor-pointer hover:shadow-md transition-shadow group"
                     >
                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden relative">
                             {/* Placeholder for lesson image */}
                             <img src={`https://placehold.co/100x100?text=${enrollment.lesson?.type || 'Lesson'}`} alt="Thumbnail" className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                {enrollment.lesson?.type === 'video' ? <Play className="text-white opacity-80" /> : 
                                 enrollment.lesson?.type === 'live' ? <Users className="text-white opacity-80" /> :
                                 <FileText className="text-white opacity-80" />}
                             </div>
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h4 className="font-bold text-gray-900 line-clamp-2">{enrollment.lesson?.title || "Untitled Lesson"}</h4>
                                <p className="text-xs text-gray-500 mt-1">{enrollment.lesson?.teacher?.name || "Unknown Trainer"}</p>
                            </div>
                            <div className="mt-3">
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span className={enrollment.status === 'COMPLETED' ? 'text-green-600' : 'text-blue-600'}>
                                        {enrollment.status === 'COMPLETED' ? text.completedStatus : `${enrollment.progress_percent || 0}% ${text.completedPercent}`}
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${enrollment.status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-500'}`} 
                                        style={{ width: `${enrollment.progress_percent || 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                     </div>
                 ))}
                 
                 {filteredEnrollments.length === 0 && (
                     <div className="col-span-2 text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                         <p className="text-gray-400 font-medium">No courses found.</p>
                     </div>
                 )}
            </div>
        </div>
    );
};

export default SkillWalletDashboard;
