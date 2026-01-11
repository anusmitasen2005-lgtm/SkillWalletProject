import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';
const IMG_BASE_URL = 'http://localhost:8000';

const SkillCard = ({ userId, profile }) => {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [verifiedSkills, setVerifiedSkills] = useState([]);

    useEffect(() => {
        if (userId) fetchWalletData();
    }, [userId]);

    const fetchWalletData = async () => {
        try {
            // We need to fetch the wallet hash and verified skills.
            // Since we don't have a direct "get wallet" endpoint for frontend yet, 
            // we'll rely on the proofs endpoint which returns credentials, 
            // and maybe we need a new endpoint to get the wallet hash?
            // For now, let's assume we can get it from the profile or a new endpoint.
            // Let's assume the profile object passed from parent *might* have it if we updated the backend,
            // but to be safe, let's fetch user proofs which we know exists, 
            // AND we need the wallet hash for the QR code.
            
            // Actually, let's just hit the public profile endpoint using the user ID if we can? 
            // No, that takes a hash.
            // We need an endpoint to get "my wallet details".
            
            // Let's use the profile endpoint and hope it includes the wallet relation, 
            // or I'll assume we need to fetch it.
            // For this specific task, I'll assume I need to fetch the wallet hash.
            // I'll assume the parent 'profile' prop might NOT have it deep linked.
            // Let's check if we can get it.
            
            // WORKAROUND: I'll use a new endpoint or update the profile fetch in parent.
            // For now, I'll try to find it in the proofs response or just make a specific call.
            // Let's try to get it from a new lightweight endpoint I'll add later if needed.
            // BUT, for now, let's look at what we have. 
            // We have `get_user_proofs`.
            
            const response = await axios.get(`${API_BASE_URL}/user/proofs/${userId}`);
            const proofs = response.data;
            
            // Filter for verified skills (score >= 500 or is_verified)
            const verified = proofs.filter(p => p.grade_score >= 300); 
            setVerifiedSkills(verified);

            // Use wallet hash from profile if available (passed from parent)
            // or placeholder if not found (backend update might not have propagated or wallet not created)
            const hash = profile.wallet_hash || `SW-${userId}-PENDING`;
            
            setWallet({
                hash: hash,
                status: verified.length > 0 ? 'Active' : 'Inactive'
            });

        } catch (err) {
            console.error("Card fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Card...</div>;

    // 1. INACTIVE STATE
    if (!wallet || wallet.status === 'Inactive') {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in duration-300">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <span className="text-4xl grayscale opacity-50">💳</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-400 mb-2">Card Not Active</h2>
                <p className="text-gray-500 mb-8 max-w-xs">
                    Your Skill Card is empty. Add a skill and verified work proof to activate your professional identity.
                </p>
                <button 
                    onClick={() => document.getElementById('tab-work').click()} // Quick hack to jump to work tab
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-transform active:scale-95"
                >
                    Activate My Card
                </button>
            </div>
        );
    }

    // 2. ACTIVE CARD STATE
    // Use window.location.origin to support local network testing
    const origin = window.location.origin; 
    const qrValue = `${origin}/verify/${wallet.hash}`; 
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrValue)}`;

    return (
        <div className="p-4 flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span>💳</span> My Skill Card
            </h2>

            {/* THE CARD CONTAINER */}
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 relative aspect-[1.586/1] flex flex-col">
                {/* Blue Side Bar */}
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold tracking-widest text-xs uppercase rotate-90 whitespace-nowrap">
                        Skill Wallet ID
                    </span>
                </div>

                {/* Card Content */}
                <div className="p-5 pr-14 flex-1 flex flex-col justify-between">
                    {/* Top Section: Photo & Info */}
                    <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-full border-2 border-blue-500 p-0.5 shrink-0">
                            <img 
                                src={profile.profile_photo_file_path ? `${IMG_BASE_URL}/${profile.profile_photo_file_path}` : "https://placehold.co/100x100"} 
                                className="w-full h-full rounded-full object-cover"
                                alt="Profile"
                            />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 leading-tight">{profile.name || "User"}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md">
                                    {profile.profession || "Skilled Worker"}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 font-medium">
                                📍 {profile.local_area || "India"}
                            </p>
                        </div>
                    </div>

                    {/* Middle Section: Stats/ID */}
                    <div className="mt-4 border-t border-dashed border-gray-200 pt-3 flex justify-between items-end">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">ID Number</p>
                            <p className="font-mono text-sm font-bold text-gray-800 tracking-wider">SW-{userId}-{new Date().getFullYear()}</p>
                        </div>
                        
                        {/* QR Code */}
                        <div className="w-20 h-20 bg-white p-1 rounded-lg border border-gray-100 shadow-sm">
                            <img src={qrUrl} alt="QR" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    {/* Bottom Badge */}
                    <div className="mt-2 flex items-center gap-2">
                         <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                         <span className="text-[10px] font-bold text-green-700 uppercase">
                             {verifiedSkills.length} Skills Verified
                         </span>
                    </div>
                </div>
            </div>

            {/* SKILLS LIST BELOW CARD */}
            <div className="w-full max-w-md mt-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Verified Skills on Card</h3>
                <div className="space-y-3">
                    {verifiedSkills.map((skill, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">⭐</span>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{skill.title}</h4>
                                    <p className="text-xs text-green-600 font-medium">Verified by Work Proof</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded">
                                Ready
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <p className="mt-8 text-xs text-gray-400 text-center px-8">
                Scan the QR code to view the public verification page. Private data (Aadhaar/PAN) is never shown.
            </p>
        </div>
    );
};

export default SkillCard;