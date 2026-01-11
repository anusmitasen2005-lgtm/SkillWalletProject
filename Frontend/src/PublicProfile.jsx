import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';
const IMG_BASE_URL = 'http://localhost:8000';

const PublicProfile = ({ walletHash }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/public/profile/${walletHash}`);
                setData(res.data);
            } catch (err) {
                console.error("Public profile error:", err);
                setError("Profile not found or invalid.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [walletHash]);

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Verifying Skill Identity...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-3xl">❌</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-500">{error}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* Header / Trust Badge */}
            <div className="bg-blue-900 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <span className="text-9xl">🛡️</span>
                </div>
                
                <div className="flex justify-between items-start mb-6">
                    <h3 className="font-bold tracking-widest text-xs uppercase opacity-80">Skill Wallet Public Verification</h3>
                    <div className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <span>✓</span> VERIFIED PROFILE
                    </div>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="w-28 h-28 rounded-full border-4 border-white/20 p-1 mb-4">
                        <img 
                            src={data.profile_photo ? `${IMG_BASE_URL}/${data.profile_photo}` : "https://placehold.co/150x150?text=User"} 
                            className="w-full h-full rounded-full object-cover bg-white"
                            alt="Profile"
                        />
                    </div>
                    <h1 className="text-2xl font-black mb-1">{data.name}</h1>
                    <p className="text-blue-200 font-medium text-sm mb-4">{data.profession} • {data.location}</p>
                    
                    <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-center">
                            <p className="text-2xl font-bold">{data.total_verified}</p>
                            <p className="text-[10px] uppercase opacity-70">Skills</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-center">
                            <p className="text-2xl font-bold">{data.member_since}</p>
                            <p className="text-[10px] uppercase opacity-70">Member Since</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Verified Skills List */}
            <div className="px-6 -mt-6">
                <div className="space-y-6">
                    {data.verified_skills.length > 0 ? (
                        data.verified_skills.map((skill, idx) => (
                            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                {/* Proof Media */}
                                <div className="h-56 bg-gray-100 relative">
                                    <img 
                                        src={`${IMG_BASE_URL}/${skill.proof_url}`} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {e.target.style.display='none'}}
                                    />
                                    <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                        Verified Skill
                                    </div>
                                </div>

                                <div className="p-5">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{skill.skill_name}</h3>
                                    
                                    {/* Trust Score */}
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-green-500 rounded-full" 
                                                style={{ width: `${(skill.trust_score / 900) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-bold text-green-700">{skill.trust_score}/900 Trust Score</span>
                                    </div>

                                    {/* Voice Note */}
                                    {skill.audio_url && (
                                        <div className="bg-blue-50 p-3 rounded-xl flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs shrink-0">
                                                🔊
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-700 uppercase mb-0.5">Worker's Explanation</p>
                                                <audio controls src={`${IMG_BASE_URL}/${skill.audio_url}`} className="h-6 w-48" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Transcription */}
                                    {skill.transcription && (
                                        <p className="text-sm text-gray-600 italic">"{skill.transcription}"</p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-8 bg-white rounded-2xl shadow-sm">
                            <p className="text-gray-500">No public skills verified yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center px-6">
                <p className="text-xs text-gray-400 mb-2">Verified by Skill Wallet</p>
                <div className="inline-block px-4 py-2 bg-gray-100 rounded-lg text-xs font-bold text-gray-500">
                    ID: {walletHash}
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;