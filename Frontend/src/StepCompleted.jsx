import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AddWorkProofFlow from './AddWorkProofFlow';
import SkillWalletDashboard from './SkillWalletDashboard';
import SkillBankLearnNew from './SkillBankLearnNew';
import SkillBankTeach from './SkillBankTeach';
import MainLayout from './components/MainLayout';
import LiveClassRoom from './LiveClassRoom';
import CoursePlayer from './CoursePlayer';
import { Languages, Mic, Camera, Volume2 } from 'lucide-react';
import { InstructionSpeaker } from './components/VoiceHelpers';

const API_BASE_URL = 'http://localhost:8000/api/v1';
const IMG_BASE_URL = 'http://localhost:8000';

function StepCompleted({ jumpToStep, userId, language, setLanguage }) {
    const [profile, setProfile] = useState({});
    const [identityItems, setIdentityItems] = useState([]);
    const [visualWorkItems, setVisualWorkItems] = useState([]);
    const [storyItems, setStoryItems] = useState([]);
    const [enrollments, setEnrollments] = useState([]); // New: Enrolled Courses
    const [loading, setLoading] = useState(true);
    const [selectedProof, setSelectedProof] = useState(null);
    const [profileTab, setProfileTab] = useState('card'); // Sub-tabs for Home view
    const [showAddProof, setShowAddProof] = useState(false);
    const [skillScore, setSkillScore] = useState(300); // Default score
    
    // View Modes
    const [viewMode, setViewMode] = useState('dashboard'); // dashboard, live_class, course_player
    const [activeCourse, setActiveCourse] = useState(null);

    // Global Navigation State
    const [sidebarView, setSidebarView] = useState('home'); // home, wallet, learn, teach, teaching_dashboard
    
    // Language State is now passed as props

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (userId) fetchDashboardData(userId);
    }, [userId]);

    const handleProfilePhotoClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post(`${API_BASE_URL}/identity/tier2/upload/${userId}?file_type=profile_photo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Refresh profile
            fetchDashboardData(userId);
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload photo");
        }
    };

    const fetchDashboardData = async (id) => {
        try {
            const [profRes, proofRes, statsRes, enrollRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/user/profile/${id}`),
                axios.get(`${API_BASE_URL}/user/proofs/${id}`),
                axios.get(`${API_BASE_URL}/dashboard/stats/${id}`),
                axios.get(`${API_BASE_URL}/skillbank/enrollments/${id}`)
            ]);
            
            const p = profRes.data;
            const proofs = proofRes.data;
            setProfile(p);
            setEnrollments(enrollRes.data);
            
            // Set Skill Score
            if (statsRes.data?.skill_growth?.current_score) {
                setSkillScore(statsRes.data.skill_growth.current_score);
            }

            // 1. Identity Zone (Tier 1, 2, 3 Docs)
            const idItems = [];
            if (p.aadhaar_file_path) idItems.push({ 
                id: 'aadhaar', title: 'Aadhaar Card', category: 'Identity', 
                path: p.aadhaar_file_path, statusLabel: 'Verified', statusColor: 'bg-green-100 text-green-700' 
            });
            if (p.pan_card_file_path) idItems.push({ 
                id: 'pan', title: 'PAN Card', category: 'Identity', 
                path: p.pan_card_file_path, statusLabel: 'Verified', statusColor: 'bg-green-100 text-green-700' 
            });
            if (p.training_letter_file_path) idItems.push({
                id: 'training', title: 'Training Letter', category: 'Trust Record',
                path: p.training_letter_file_path, statusLabel: 'Submitted', statusColor: 'bg-blue-100 text-blue-700'
            });
             if (p.apprenticeship_proof_file_path) idItems.push({
                id: 'apprenticeship', title: 'Apprenticeship Proof', category: 'Trust Record',
                path: p.apprenticeship_proof_file_path, statusLabel: 'Submitted', statusColor: 'bg-blue-100 text-blue-700'
            });
            if (p.local_authority_proof_file_path) idItems.push({
                id: 'local_auth', title: 'Local Authority Proof', category: 'Trust Record',
                path: p.local_authority_proof_file_path, statusLabel: 'Submitted', statusColor: 'bg-blue-100 text-blue-700'
            });

            setIdentityItems(idItems);

            // 2. Process Proofs into Visual Work & Stories
            const vItems = [];
            const sItems = [];

            if (Array.isArray(proofs)) {
                proofs.forEach((proof, idx) => {
                    let feedback = {};
                    try {
                        feedback = proof.evaluation_feedback ? JSON.parse(proof.evaluation_feedback) : {};
                    } catch (e) {
                        console.error("Feedback parse error", e);
                    }

                    const item = {
                        id: `proof-${idx}`,
                        title: proof.title || "Untitled Work",
                        category: 'Work Journey',
                        path: proof.visualProofUrl,
                        audioUrl: proof.audioProofUrl,
                        transcription: proof.transcription,
                        grade_score: proof.grade_score,
                        statusLabel: proof.grade_score > 300 ? 'Graded' : 'Submitted',
                        statusColor: proof.grade_score > 300 ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700',
                        feedback: feedback
                    };

                    // Simple heuristic: If it has visual, it's work. If only audio/transcription, it's a story.
                    // Or if title contains "Story"
                    if (item.path && (item.path.endsWith('.jpg') || item.path.endsWith('.png') || item.path.endsWith('.mp4') || item.path.endsWith('.webm'))) {
                        vItems.push(item);
                    } else if (item.audioUrl || (item.path && item.path.endsWith('.txt')) || item.title.toLowerCase().includes('story')) {
                        item.category = 'Skill Story';
                        sItems.push(item);
                    } else {
                        // Fallback to visual if unsure
                        vItems.push(item);
                    }
                });
            }

            setVisualWorkItems(vItems);
            setStoryItems(sItems);

        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Loading your Living Dashboard...</p>
        </div>
    );

    // Render Home View (Profile/Identity)
    const renderHomeView = () => {
        const tier2Items = identityItems.filter(i => ['aadhaar', 'pan'].includes(i.id));
        const tier3Items = identityItems.filter(i => !['aadhaar', 'pan'].includes(i.id));

        const getTabInstructions = () => {
            if (language === 'hi') {
                switch(profileTab) {
                    case 'identity': return "ये आपके पहचान प्रमाण हैं जैसे आधार और पैन कार्ड।";
                    case 'trust': return "ये आपके विश्वास रिकॉर्ड हैं।";
                    case 'work': return "यह आपकी कार्य यात्रा है। आप यहाँ नया काम या कहानियाँ जोड़ सकते हैं।";
                    case 'learning': return "ये आपके नामांकित पाठ्यक्रम हैं। सीखने के लिए किसी एक पर क्लिक करें।";
                    case 'card': return "यह आपका स्किल वॉलेट कार्ड है जो आपकी समग्र प्रगति दिखाता है।";
                    default: return "आपकी प्रोफ़ाइल में आपका स्वागत है।";
                }
            } else {
                switch(profileTab) {
                    case 'identity': return "These are your identity proofs like Aadhaar and PAN card.";
                    case 'trust': return "These are your trust records.";
                    case 'work': return "This is your work journey. You can add new work or stories here.";
                    case 'learning': return "These are your enrolled courses. Click on one to continue learning.";
                    case 'card': return "This is your Skill Wallet Card showing your overall progress.";
                    default: return "Welcome to your profile.";
                }
            }
        };

        return (
            <div className="space-y-6">
                {/* Profile Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
                     <div className="absolute top-4 right-4">
                        <InstructionSpeaker text={getTabInstructions()} language={language} />
                     </div>
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileChange} 
                    />
                    <div className="text-center">
                        <div 
                            className="w-32 h-32 rounded-full p-1 border-2 border-blue-100 mx-auto mb-4 relative cursor-pointer hover:opacity-80 transition-opacity group"
                            onClick={handleProfilePhotoClick}
                        >
                            <img 
                                src={profile.profile_photo ? `${IMG_BASE_URL}/${profile.profile_photo}` : "https://placehold.co/150x150?text=User"} 
                                className="w-full h-full rounded-full object-cover" 
                            />
                            <div className="absolute bottom-1 right-1 bg-blue-500 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white shadow-md z-10">
                                <Camera size={14} />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-1">{profile.name}</h2>
                        <p className="text-blue-600 font-bold uppercase tracking-wide text-sm">{profile.profession}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-gray-50 p-3 rounded-xl">
                            <span className="text-xs text-gray-500 font-bold uppercase block mb-1">Age</span>
                            <span className="font-bold text-gray-900">{profile.age ? `${profile.age} Years` : 'Not Set'}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl text-right">
                            <span className="text-xs text-gray-500 font-bold uppercase block mb-1">Location</span>
                            <span className="font-bold text-gray-900 truncate block">
                                {[profile.local_area, profile.district, profile.state].filter(Boolean).join(', ') || "Not Set"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Profile Tabs */}
                <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                    {['identity', 'trust', 'work', 'learning', 'card'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setProfileTab(tab)}
                            className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                                profileTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {tab === 'identity' && 'Who I Am'}
                            {tab === 'trust' && 'Trust Records'}
                            {tab === 'work' && 'Work Journey'}
                            {tab === 'learning' && 'Learning'}
                            {tab === 'card' && 'My Card'}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in duration-300">
                    {profileTab === 'identity' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <span>🆔</span> Identity Proofs
                            </h3>
                            {tier2Items.length > 0 ? (
                                tier2Items.map((item, idx) => (
                                    <div key={idx} onClick={() => setSelectedProof(item)} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                        <span className="text-2xl">📄</span>
                                        <div className="flex-1">
                                            <h5 className="font-bold text-gray-800 text-sm">{item.title}</h5>
                                            <p className="text-[10px] text-blue-600 font-bold uppercase">{item.statusLabel}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-400 text-sm">No identity proofs uploaded.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {profileTab === 'trust' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <span>🛡️</span> Trust Records
                            </h3>
                             {tier3Items.length > 0 ? (
                                tier3Items.map((item, idx) => (
                                    <div key={idx} onClick={() => setSelectedProof(item)} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                        <span className="text-2xl">🤝</span>
                                        <div className="flex-1">
                                            <h5 className="font-bold text-gray-800 text-sm">{item.title}</h5>
                                            <p className="text-[10px] text-blue-600 font-bold uppercase">{item.statusLabel}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-400 text-sm">No trust records yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {profileTab === 'work' && (
                         <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <span>🛠️</span> Work & Stories
                                </h3>
                                <button onClick={() => setShowAddProof(true)} className="text-blue-600 text-xs font-bold hover:underline">+ Add New</button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                {visualWorkItems.map((item, idx) => (
                                    <div key={idx} onClick={() => setSelectedProof(item)} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 relative group cursor-pointer aspect-square">
                                        <img src={`${IMG_BASE_URL}/${item.path}`} className="w-full h-full object-cover" onError={(e) => e.target.src="https://placehold.co/200?text=Work"} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-2">
                                            <p className="text-white font-bold text-xs line-clamp-1">{item.title}</p>
                                            {item.grade_score && <span className="text-[10px] text-green-300 font-bold">{item.grade_score}/100</span>}
                                        </div>
                                    </div>
                                ))}
                                {storyItems.map((item, idx) => (
                                    <div key={idx} onClick={() => setSelectedProof(item)} className="bg-amber-50 rounded-xl p-3 shadow-sm border border-amber-100 flex flex-col justify-center items-center text-center cursor-pointer aspect-square">
                                        <span className="text-2xl mb-1">🎙️</span>
                                        <p className="text-amber-900 font-bold text-xs line-clamp-2">{item.title}</p>
                                    </div>
                                ))}
                            </div>
                             {visualWorkItems.length === 0 && storyItems.length === 0 && (
                                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 col-span-2">
                                    <p className="text-gray-400 text-sm">Start building your work journey.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {profileTab === 'learning' && (
                        <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <span>📚</span> My Learning
                                </h3>
                                <button onClick={() => setSidebarView('learn')} className="text-blue-600 text-xs font-bold hover:underline">+ Find New</button>
                            </div>

                            {enrollments.length > 0 ? (
                                enrollments.map((enrollment, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => {
                                            setActiveCourse(enrollment.lesson);
                                            // Determine view mode based on lesson type or enrollment status
                                            // For now, assume video types are recorded, others might be live if we add that field
                                            setViewMode(enrollment.lesson?.type === 'live' ? 'live_class' : 'course_player');
                                        }}
                                        className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                    >
                                        <span className="text-2xl">{enrollment.lesson?.type === 'video' ? '📺' : '📄'}</span>
                                        <div className="flex-1">
                                            <h5 className="font-bold text-gray-800 text-sm line-clamp-1">{enrollment.lesson?.title}</h5>
                                            <div className="flex items-center gap-2 mt-1">
                                                 <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${enrollment.progress_percent}%` }}></div>
                                                </div>
                                                <span className="text-[10px] text-gray-500 font-bold">{enrollment.progress_percent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-400 text-sm mb-2">No active courses.</p>
                                    <button onClick={() => setSidebarView('learn')} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full">
                                        Start Learning
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {profileTab === 'card' && (
                        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden min-h-[200px]">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                                        💳
                                    </div>
                                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase">Skill Wallet ID</span>
                                </div>
                                <h3 className="text-xl font-bold tracking-widest mb-1">{profile.name}</h3>
                                <p className="text-blue-200 text-sm uppercase tracking-wide mb-6">{profile.profession}</p>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-blue-300 uppercase">Trust Score</p>
                                        <p className="text-2xl font-bold">{skillScore}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-blue-300 uppercase">Member Since</p>
                                        <p className="text-sm font-bold">2024</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <MainLayout 
                activeTab={sidebarView} 
                onTabChange={setSidebarView} 
                userProfile={profile} 
                onLogout={() => jumpToStep(1)} // Reset flow
                language={language}
                setLanguage={setLanguage}
            >
                {/* Content Switcher */}
                {sidebarView === 'home' && renderHomeView()}
                {sidebarView === 'wallet' && <SkillWalletDashboard 
                    userId={userId} 
                    language={language} 
                    onCourseSelect={(course) => {
                        setActiveCourse(course);
                        setViewMode(course?.type === 'live' ? 'live_class' : 'course_player');
                    }}
                />}
                {sidebarView === 'learn' && <SkillBankLearnNew userId={userId} onClose={() => setSidebarView('home')} language={language} />}
                {sidebarView === 'teach' && <SkillBankTeach userId={userId} onBack={() => setSidebarView('home')} language={language} hasUploaded={profile.has_uploaded} onSuccess={() => fetchDashboardData(userId)} />}
                {sidebarView === 'teaching_dashboard' && <SkillBankTeach userId={userId} onBack={() => setSidebarView('home')} language={language} hasUploaded={profile.has_uploaded} onSuccess={() => fetchDashboardData(userId)} />} {/* Reuse Teach for now */}
            </MainLayout>

            {/* Full Screen Learning Modes */}
            {viewMode === 'live_class' && activeCourse && (
                <LiveClassRoom 
                    classTitle={activeCourse.title} 
                    teacherName={activeCourse.teacher_name} 
                    onLeave={() => setViewMode('dashboard')} 
                />
            )}

            {viewMode === 'course_player' && activeCourse && (
                <CoursePlayer 
                    lessonTitle={activeCourse.title} 
                    teacherName={activeCourse.teacher_name} 
                    onBack={() => setViewMode('dashboard')} 
                />
            )}

            {/* Modals */}
            {selectedProof && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProof(null)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedProof(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white z-10">
                            ✕
                        </button>
                        
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{selectedProof.title}</h3>
                                    <p className="text-blue-600 font-bold uppercase text-sm">{selectedProof.category}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedProof.statusColor}`}>
                                    {selectedProof.statusLabel}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="bg-gray-100 rounded-xl overflow-hidden mb-6 flex items-center justify-center min-h-[300px]">
                                {selectedProof.path && (selectedProof.path.endsWith('.mp4') || selectedProof.path.endsWith('.webm')) ? (
                                    <video src={`${IMG_BASE_URL}/${selectedProof.path}`} controls className="w-full max-h-[400px]" />
                                ) : selectedProof.audioUrl ? (
                                    <div className="text-center p-10 w-full">
                                        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-pulse">
                                            🎙️
                                        </div>
                                        <audio src={`${IMG_BASE_URL}/${selectedProof.audioUrl}`} controls className="w-full max-w-md mx-auto" />
                                    </div>
                                ) : selectedProof.path ? (
                                    <img src={`${IMG_BASE_URL}/${selectedProof.path}`} className="w-full h-full object-contain max-h-[400px]" />
                                ) : (
                                    <div className="text-center p-10">
                                        <span className="text-4xl mb-2 block">📄</span>
                                        <p className="text-gray-500 font-bold">Document / Text Submission</p>
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-2">Transcription / Description</h4>
                                    <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">
                                        {selectedProof.transcription || "No description provided."}
                                    </p>
                                </div>
                                
                                {selectedProof.feedback && Object.keys(selectedProof.feedback).length > 0 && (
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-2">AI Feedback</h4>
                                        <div className="space-y-2">
                                            {selectedProof.feedback.strengths && (
                                                <div className="bg-green-50 p-3 rounded-lg text-xs">
                                                    <span className="font-bold text-green-700 block mb-1">Strengths</span>
                                                    <p className="text-green-800">{selectedProof.feedback.strengths}</p>
                                                </div>
                                            )}
                                            {selectedProof.feedback.improvements && (
                                                <div className="bg-orange-50 p-3 rounded-lg text-xs">
                                                    <span className="font-bold text-orange-700 block mb-1">Improvements</span>
                                                    <p className="text-orange-800">{selectedProof.feedback.improvements}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddProof && (
                <AddWorkProofFlow 
                    userId={userId} 
                    onClose={() => setShowAddProof(false)} 
                    onSuccess={() => {
                        setShowAddProof(false);
                        fetchDashboardData(userId);
                    }}
                />
            )}
        </>
    );
}

export default StepCompleted;
