import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const API_HOST = API_BASE_URL.replace('/api/v1', '');
const toProofUrl = (p) => {
    if (!p || p === 'N/A') return null;
    const s = String(p).replace(/\\\\/g, '/').replace(/\\/g, '/');
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:')) return s;
    if (s.startsWith('/proofs/')) return `${API_HOST}${s}`;
    if (s.startsWith('uploaded_files/')) {
        const tail = s.replace(/^uploaded_files\//, '');
        return `${API_HOST}/proofs/${tail}`;
    }
    return `${API_HOST}/proofs/${s}`;
};

// Helper function to check if a document was uploaded
const isDocSubmitted = (path) => {
    return path && path !== 'N/A' && path !== '';
};

// Styling for status indicators
const statusStyle = (isSubmitted) => ({
    color: isSubmitted ? '#28a745' : '#dc3545', // Green for Submitted, Red for Missing
    fontWeight: 'bold',
    marginLeft: '10px',
});

// --- RESUME GENERATION LOGIC (Task 686) ---
const generateResumeHtml = (profile, microProofs) => {
    // Collect skills from both profile and proofs
    const proofSkills = microProofs.map(p => p.skill);
    const allSkills = [...new Set([profile.skill_tag, profile.power_skill_tag, ...proofSkills])];

    const proofsSection = microProofs.map(item => {
        const link = toProofUrl(item.visualProofUrl);
        return `
        <div style="margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="color: #28a745; margin: 0;">${item.title} (${item.skill})</h4>
                <span style="font-size: 0.8em; color: #666;">${item.issued_date || 'Date: N/A'}</span>
            </div>
            <p style="margin: 5px 0 0 0;">
                <strong>Proof (Visual):</strong> ${link ? `<a href="${link}" target="_blank">${item.visualProofUrl}</a>` : 'N/A'}<br/>
                <strong>Audio Transcript:</strong> ${item.transcription ? item.transcription.substring(0, 150) + '...' : 'N/A'}
            </p>
        </div>
    `;
    }).join('');
    
    return `
        <html>
            <head>
                <title>Skill Wallet Portfolio Summary - ${profile.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: auto; }
                    h1 { color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 5px; }
                    h3 { color: #007bff; border-bottom: 1px solid #007bff; padding-bottom: 5px; }
                    .header { text-align: center; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${profile.name || 'N/A'}'s Skill Wallet Portfolio Summary</h1>
                    <p><strong>Profession:</strong> ${profile.profession || 'Unassigned'}</p>
                </div>
                
                <h3>Verifiable Skills</h3>
                <p>${allSkills.join(', ')}</p>

                <h3>Identity Verification Status (Tier 2)</h3>
                <p>Aadhaar Submitted: ${isDocSubmitted(profile.aadhaar_file_path) ? 'Yes' : 'No'}</p>
                <p>PAN Card Submitted: ${isDocSubmitted(profile.pan_card_file_path) ? 'Yes' : 'No'}</p>

                <h3>Micro-Proofs & Graded Work History</h3>
                ${proofsSection}
                
                <hr/>
                <p style="text-align: center; font-size: 0.8em;">Generated via Skill Wallet - Verifiable Digital Identity</p>
            </body>
        </html>
    `;
};
// --- END RESUME GENERATION LOGIC ---


// Component for a single Portfolio Item - DISPLAYS REAL DATA
const PortfolioItem = ({ item, profession }) => {
    // Function to open the proof URL in a new window/tab
    const handleViewVisualProof = () => {
        if (item.visualProofUrl && item.visualProofUrl !== 'N/A') {
            const fullUrl = toProofUrl(item.visualProofUrl);
            window.open(fullUrl, '_blank');
        } else {
            alert("Visual proof URL not submitted for this item.");
        }
    };
    
    // Function to open the Audio Story in a new tab
    const handleViewAudioProof = () => {
        if (item.audioStoryUrl && item.audioStoryUrl !== 'N/A') {
            const fullUrl = toProofUrl(item.audioStoryUrl);
            window.open(fullUrl, '_blank');
        } else {
            alert("Audio story URL not submitted for this item.");
        }
    };

    return (
        <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '10px', backgroundColor: '#fff' }}>
            <h5 style={{ color: '#28a745' }}>{item.title}</h5>
            <p style={{ fontSize: '0.9em' }}>Skill: <strong>{item.skill}</strong></p>
            {item.issued_date && (
                <p style={{ margin: '5px 0', color: '#6c757d', fontSize: '0.85em' }}>Submitted: {item.issued_date}</p>
            )}
            <p style={{ margin: '5px 0' }}><strong>Status:</strong> {item.verification_status}</p>
            <p style={{ margin: '5px 0' }}>
                <strong>Score (300–900):</strong>{' '}
                {typeof item.grade_score === 'number' && item.grade_score >= 300 ? item.grade_score : 'Pending'}
                {' '}
                <span style={{ color: '#6c757d' }}>
                    {typeof item.grade_score === 'number' && item.grade_score >= 750
                        ? 'Ideal'
                        : typeof item.grade_score === 'number' && item.grade_score >= 700
                        ? 'Good–Excellent'
                        : typeof item.grade_score === 'number' && item.grade_score >= 600
                        ? 'Developing'
                        : 'Needs improvement'}
                </span>
            </p>
            
            {/* Transcription Block */}
            <div style={{ padding: '10px', backgroundColor: '#f0f8ff', borderLeft: '3px solid #007bff', margin: '10px 0' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>Transcription ({item.language_code}):</p>
                <p style={{ fontSize: '0.8em', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {item.transcription || "Transcription pending/not available."}
                </p>
            </div>
            
            {/* Inline Audio Player (if audio story exists) */}
            {item.audioStoryUrl && item.audioStoryUrl !== 'N/A' && (
                <div style={{ marginTop: '8px' }}>
                    <audio 
                        controls 
                        src={toProofUrl(item.audioStoryUrl)} 
                        style={{ width: '100%' }} 
                    />
                </div>
            )}
            
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                {/* Visual Button */}
                <button 
                    onClick={handleViewVisualProof}
                    disabled={item.visualProofUrl === 'N/A' || !item.visualProofUrl}
                    style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}
                >
                    View Proof (Visual)
                </button>
                
                {/* Audio Button */}
                <button 
                    onClick={handleViewAudioProof}
                    disabled={item.audioStoryUrl === 'N/A' || !item.audioStoryUrl}
                    style={{ padding: '5px 10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}
                >
                    View Proof (Audio Story)
                </button>
            </div>
            
            {/* Recommendations Section */}
            {item.feedback?.recommendations?.length > 0 && (
                <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <h6 style={{ color: '#0056b3', margin: '0 0 10px 0' }}>🚀 Opportunities For You</h6>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {item.feedback.recommendations.map((rec, idx) => (
                            <button 
                                key={idx}
                                onClick={() => {
                                    // Use profession in the query if available, otherwise fallback to generic
                                    const searchContext = profession ? `${profession} ${rec.title}` : rec.title;
                                    const query = encodeURIComponent(`${searchContext} ${rec.type} India apply online`);
                                    window.open(`https://www.google.com/search?q=${query}`, '_blank');
                                }}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#fff',
                                    border: '1px solid #007bff',
                                    borderRadius: '4px',
                                    color: '#007bff',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '0.9em',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span>{rec.title} <span style={{fontSize: '0.8em', color: '#666'}}>({rec.type})</span></span>
                                <span>↗️</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {item.grade_score > 0 && (
                <div style={{ marginTop: '10px', borderTop: '1px dotted #eee', paddingTop: '5px' }}>
                    <span style={{color: '#6c757d'}}>Verified</span>
                </div>
            )}
        </div>
    );
};

function StepCompleted({ jumpToStep, userId }) {
    const [profile, setProfile] = useState({}); // New state for profile data
    const [microProofs, setMicroProofs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserDetails, setSelectedUserDetails] = useState(null);
    const [adminError, setAdminError] = useState('');
    const [customToken, setCustomToken] = useState('');
    // Token is read when needed directly from localStorage

    // Helper function for delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- Data Fetching Logic (Multi-Attempt Resilience) ---

    const fetchDashboardData = async (id) => {
        setLoading(true);
        let maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // Fetch the full user profile including all document paths
                const profileResponse = await axios.get(`${API_BASE_URL}/user/profile/${id}`);
                setProfile(profileResponse.data);

                // Fetch the micro-proofs (Work Submissions)
                const proofsResponse = await axios.get(`${API_BASE_URL}/user/proofs/${id}`);
                const proofs = proofsResponse.data;
                setMicroProofs(proofs);
                setLoading(false);
                return; // Exit function on success
            } catch (error) {
                console.error(`Error fetching proofs on Attempt ${attempt}:`, error);
                
                if (attempt < maxAttempts) {
                    await delay(1000); 
                } else {
                    setMicroProofs([]);
                    setProfile({});
                }
            }
        }
        setLoading(false);
    };
    
    useEffect(() => {
        if (userId) {
            const id = setTimeout(() => { fetchDashboardData(userId); }, 0);
            return () => clearTimeout(id);
        }
    }, [userId]);

    const refreshAdminList = async () => {
        try {
            const token = typeof window !== 'undefined' ? window.localStorage.getItem('access_token') : null;
            const res = await axios.get(`${API_BASE_URL}/admin/users`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setAllUsers(res.data || []);
            setAdminError('');
        } catch {
            setAllUsers([]);
            setAdminError('Admin access required. Please log in as owner.');
        }
    };

    useEffect(() => {
        const id = setTimeout(() => { refreshAdminList(); }, 0);
        return () => clearTimeout(id);
    }, []);

    const handleViewUserDetails = async (uid) => {
        try {
            const token = typeof window !== 'undefined' ? window.localStorage.getItem('access_token') : null;
            const res = await axios.get(`${API_BASE_URL}/admin/users/${uid}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setSelectedUserDetails(res.data);
            setAdminError('');
        } catch {
            setSelectedUserDetails(null);
            setAdminError('Admin access required. Please log in as owner.');
        }
    };

    const setOwnerAccess = async () => {
        try {
            window.localStorage.setItem('access_token', 'DEBUG_ACCESS_TOKEN_for_2');
            await refreshAdminList();
        } catch {
            setAdminError('Failed to set owner token.');
        }
    };

    const setCustomAccessToken = async () => {
        try {
            if (!customToken || customToken.trim().length < 8) {
                setAdminError('Enter a valid token string.');
                return;
            }
            window.localStorage.setItem('access_token', customToken.trim());
            await refreshAdminList();
        } catch {
            setAdminError('Failed to set custom token.');
        }
    };
    

    // --- Dynamic Tier 2 Status Display ---
    const docStatuses = [
        { name: "Aadhaar Card", type: "Tier 2", path: profile.aadhaar_file_path },
        { name: "PAN Card", type: "Tier 2", path: profile.pan_card_file_path },
        { name: "Voter ID", type: "Tier 2", path: profile.voter_id_file_path },
        { name: "Driving License", type: "Tier 2", path: profile.driving_license_file_path },
    ];
    
    // --- Dynamic Tier 3 Status Display ---
    const profStatuses = [
        { name: "Employer Recommendation", type: "Tier 3", path: profile.recommendation_file_path },
        { name: "Previous Certificates", type: "Tier 3", path: profile.previous_certificates_file_path },
        { name: "Past Jobs Proof", type: "Tier 3", path: profile.past_jobs_proof_file_path },
    ];
    
    const allProofStatuses = [...docStatuses, ...profStatuses];
    const allDocsSubmitted = docStatuses.every(doc => isDocSubmitted(doc.path));
    const tier2StatusText = allDocsSubmitted ? "Complete ✅" : "Incomplete ❌";
    const proofsCount = microProofs.length;
    const submittedDocsCount = allProofStatuses.filter(d => isDocSubmitted(d.path)).length;


    // --- Button Handlers ---
    const handleAddNewWork = () => {
        jumpToStep(4); // Jumps directly back to Step 4 (Build Your Portfolio)
    };
    
    const handleDownloadSummary = () => {
        if (!profile.name || microProofs.length === 0) {
             alert("Cannot generate resume: Please complete your profile (Step 1) and submit at least one proof of work (Step 4).");
             return;
        }
        const htmlContent = generateResumeHtml(profile, microProofs);
        
        // Open a new window and write the HTML content to it
        const newWindow = window.open('', 'ResumeWindow', 'height=600,width=800');
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        
        // Optional: Trigger print dialog automatically
        newWindow.print();
    };


    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading real-time Skill Wallet data...</div>;
    }
    
    // Set fallback values if profile data is missing/incomplete
    const userName = profile.name || 'N/A (Complete Step 1)';
    const userProfession = profile.profession || 'Unassigned (Complete Step 1)';


    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto', backgroundColor: '#f4f4f4', borderRadius: '10px' }}>
            <h1 style={{ textAlign: 'center', color: '#dc3545', marginBottom: '30px' }}>
                🌟 Skill Wallet Profile Dashboard 
            </h1>

            {/* --- 1. HEADER AND ANALYTICS BAR --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {profile.profile_photo_file_path ? (
                        <img 
                            src={toProofUrl(String(profile.profile_photo_file_path).replace(/\\\\/g, '/').replace(/\\/g, '/'))}
                            alt="Profile Photo" 
                            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ffc107' }}
                        />
                    ) : (
                        <div style={{ 
                            display: 'flex',
                            width: '80px', 
                            height: '80px', 
                            borderRadius: '50%', 
                            backgroundColor: '#007bff', 
                            color: 'white',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            border: '3px solid #ffc107'
                        }}>
                            {userName && userName !== 'N/A (Complete Step 1)' ? userName.charAt(0).toUpperCase() : '?'}
                        </div>
                    )}
                    <div style={{ marginLeft: '20px' }}>
                        <h2 style={{ color: '#007bff', margin: 0 }}>{userName} <span style={{fontSize: '0.8em', color: '#6c757d'}}>({userProfession})</span></h2>
                        {profile.wallet_hash && (
                            <p style={{ margin: '5px 0' }}>**Wallet ID:** <span style={{color: '#dc3545'}}>{profile.wallet_hash}</span></p>
                        )}
                        {profile.aadhaar_number && (
                            <p style={{ margin: '5px 0', fontSize: '0.9em' }}>**Aadhaar:** <span style={{color: '#28a745'}}>{profile.aadhaar_number}</span></p>
                        )}
                    </div>
                </div>
                
                {/* Analytics Snapshot - NOW USING REAL STATS */}
                <div style={{ display: 'flex', gap: '20px', textAlign: 'center' }}>
                    <div>
                        <h3 style={{ color: '#28a745', margin: 0 }}>{submittedDocsCount}</h3>
                        <p style={{ margin: 0, fontSize: '0.9em' }}>Docs Submitted</p>
                    </div>
                    <div>
                        <h3 style={{ color: '#007bff', margin: 0 }}>{proofsCount}</h3>
                        <p style={{ margin: 0, fontSize: '0.9em' }}>Proofs</p>
                    </div>
                    {/* BUTTON NOW CALLS jumpToStep(4) */}
                    <button onClick={handleAddNewWork} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        Add New Work
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#007bff', borderBottom: '1px solid #007bff', paddingBottom: '10px' }}>Identity Documents</h3>
                {[...docStatuses, ...profStatuses].map((d, idx) => {
                    const url = toProofUrl(String(d.path || '').replace(/\\\\/g, '/').replace(/\\/g, '/'));
                    return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dotted #eee' }}>
                            <div>
                                <strong>{d.name}</strong> <span style={{ color: '#6c757d' }}>({d.type})</span>
                            </div>
                            <div>
                                <span style={statusStyle(isDocSubmitted(d.path))}>{isDocSubmitted(d.path) ? 'Submitted' : 'Missing'}</span>
                                {url && (
                                    <button onClick={() => window.open(url, '_blank')} style={{ marginLeft: '10px', padding: '4px 8px', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                        View
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#dc3545', borderBottom: '2px solid #dc3545', paddingBottom: '10px' }}>Admin: User Directory</h3>
                {adminError && (
                    <div style={{ padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '6px', color: '#856404', marginBottom: '10px' }}>
                        {adminError}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                    <button onClick={setOwnerAccess} style={{ padding: '6px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Set Owner Access (ID 2)
                    </button>
                    <input
                        type="text"
                        placeholder="Paste access token"
                        value={customToken}
                        onChange={(e) => setCustomToken(e.target.value)}
                        style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <button onClick={setCustomAccessToken} style={{ padding: '6px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Use Token
                    </button>
                </div>
                {allUsers.length > 0 ? (
                    <div>
                        {allUsers.map((u) => (
                            <div key={u.user_id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', padding: '8px 0', borderBottom: '1px dotted #eee', alignItems: 'center' }}>
                                <div>
                                    <strong>{u.name || 'Unnamed'}</strong> <span style={{ color: '#6c757d' }}>({u.profession || 'N/A'})</span>
                                    <div style={{ fontSize: '0.85em', color: '#6c757d' }}>{u.phone_number} {u.email ? `• ${u.email}` : ''}</div>
                                    {u.last_login_at && <div style={{ fontSize: '0.8em', color: '#6c757d' }}>Last login: {u.last_login_at}</div>}
                                </div>
                                <div style={{ textAlign: 'center' }}>Docs: {u.docs_submitted}</div>
                                <div style={{ textAlign: 'center' }}>Total Proofs: {u.total_credentials}</div>
                                <div style={{ textAlign: 'center' }}>Verified: {u.verified_credentials}</div>
                                <div style={{ textAlign: 'right' }}>
                                    <button onClick={() => handleViewUserDetails(u.user_id)} style={{ padding: '6px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px', border: '1px dashed #ccc' }}>
                        <p>No users found.</p>
                    </div>
                )}
                {selectedUserDetails && (
                    <div style={{ marginTop: '20px' }}>
                        <h4 style={{ color: '#007bff', borderBottom: '1px solid #007bff', paddingBottom: '6px' }}>User Details</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <p><strong>Name:</strong> {selectedUserDetails.profile?.name || 'N/A'}</p>
                                <p><strong>Profession:</strong> {selectedUserDetails.profile?.profession || 'N/A'}</p>
                                <p><strong>Phone:</strong> {selectedUserDetails.profile?.phone_number || 'N/A'}</p>
                                <p><strong>Email:</strong> {selectedUserDetails.profile?.email || 'N/A'}</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                        {selectedUserDetails.profile?.aadhaar_file_path && (
                                        <button onClick={() => window.open(toProofUrl(selectedUserDetails.profile.aadhaar_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>View Aadhaar</button>
                                    )}
                                    {selectedUserDetails.profile?.pan_card_file_path && (
                                        <button onClick={() => window.open(toProofUrl(selectedUserDetails.profile.pan_card_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>View PAN</button>
                                    )}
                                    {selectedUserDetails.profile?.voter_id_file_path && (
                                        <button onClick={() => window.open(toProofUrl(selectedUserDetails.profile.voter_id_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>View Voter ID</button>
                                    )}
                                    {selectedUserDetails.profile?.driving_license_file_path && (
                                        <button onClick={() => window.open(toProofUrl(selectedUserDetails.profile.driving_license_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>View Driving License</button>
                                    )}
                                    {selectedUserDetails.profile?.ration_card_file_path && (
                                        <button onClick={() => window.open(toProofUrl(selectedUserDetails.profile.ration_card_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>View Ration Card</button>
                                    )}
                                    {selectedUserDetails.profile?.recommendation_file_path && (
                                        <button onClick={() => window.open(toProofUrl(selectedUserDetails.profile.recommendation_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px' }}>View Recommendation</button>
                                    )}
                                    {selectedUserDetails.profile?.previous_certificates_file_path && (
                                        <button onClick={() => window.open(toProofUrl(selectedUserDetails.profile.previous_certificates_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px' }}>View Certificates</button>
                                    )}
                                    {selectedUserDetails.profile?.past_jobs_proof_file_path && (
                                        <button onClick={() => window.open(toProofUrl(selectedUserDetails.profile.past_jobs_proof_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px' }}>View Past Jobs Proof</button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h5 style={{ color: '#28a745' }}>Proofs</h5>
                                {selectedUserDetails.proofs?.length > 0 ? (
                                    selectedUserDetails.proofs.map((p, idx) => (
                                        <div key={`p-${idx}`} style={{ padding: '10px', border: '1px solid #eee', borderRadius: '6px', marginBottom: '8px' }}>
                                            <div><strong>{p.title}</strong> <span style={{ color: '#6c757d' }}>({p.issued_date || 'Unknown'})</span></div>
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                                {p.visualProofUrl && (
                                                    <button onClick={() => window.open(toProofUrl(p.visualProofUrl), '_blank')} style={{ padding: '6px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
                                                        View Visual
                                                    </button>
                                                )}
                                                {p.audioStoryUrl && (
                                                    <button onClick={() => window.open(toProofUrl(p.audioStoryUrl), '_blank')} style={{ padding: '6px 10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}>
                                                        View Audio
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ marginTop: '6px', color: '#6c757d' }}>Score: {typeof p.grade_score === 'number' ? p.grade_score : 0} • Status: {p.verification_status}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ color: '#6c757d' }}>No proofs available.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* --- 2. MAIN PROFILE CONTENT (Split into two columns) --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px' }}>
                
                {/* --- LEFT COLUMN: IDENTITY & PROOFS --- */}
                <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>Identity & Verification</h3>
                    
                    {/* Display User Information */}
                    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                        <h4 style={{ color: '#333', marginTop: 0, marginBottom: '10px' }}>Your Information:</h4>
                        <p style={{ margin: '5px 0' }}><strong>Name:</strong> {profile.name || 'Not provided'}</p>
                        <p style={{ margin: '5px 0' }}><strong>Profession:</strong> {profile.profession || 'Not provided'}</p>
                        {profile.email && (
                            <p style={{ margin: '5px 0' }}><strong>Email:</strong> {profile.email}</p>
                        )}
                        {profile.date_of_birth && (
                            <p style={{ margin: '5px 0' }}><strong>Date of Birth:</strong> {profile.date_of_birth}</p>
                        )}
                        {profile.gender && (
                            <p style={{ margin: '5px 0' }}><strong>Gender:</strong> {profile.gender}</p>
                        )}
                        {profile.aadhaar_number && (
                            <p style={{ margin: '5px 0' }}><strong>Aadhaar Number:</strong> {profile.aadhaar_number}</p>
                        )}
                        {profile.phone_number && (
                            <p style={{ margin: '5px 0' }}><strong>Phone:</strong> {profile.phone_number}</p>
                        )}
                    </div>
                    
                    {/* Tier 2 & 3 Proofs - REAL STATUS CHECK */}
                <h4 style={{ color: '#333', marginTop: '20px' }}>Verification Status:</h4>
                <p style={{ margin: '5px 0' }}><strong>Tier 2 Status:</strong> {tier2StatusText}</p>
                {allProofStatuses.map(proof => (
                        <div key={proof.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dotted #ccc' }}>
                            <span>{proof.name} ({proof.type})</span>
                            <span style={statusStyle(isDocSubmitted(proof.path))}>
                                {isDocSubmitted(proof.path) ? 'Submitted ✅' : 'Missing ❌'}
                            </span>
                        </div>
                    ))}
                        <div style={{ marginTop: '15px' }}>
                            <h4 style={{ color: '#333', marginTop: '20px' }}>View Submitted Documents:</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {profile.aadhaar_file_path && (
                                <button onClick={() => window.open(toProofUrl(profile.aadhaar_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>View Aadhaar</button>
                            )}
                            {profile.pan_card_file_path && (
                                <button onClick={() => window.open(toProofUrl(profile.pan_card_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>View PAN</button>
                            )}
                            {profile.voter_id_file_path && (
                                <button onClick={() => window.open(toProofUrl(profile.voter_id_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>View Voter ID</button>
                            )}
                            {profile.driving_license_file_path && (
                                <button onClick={() => window.open(toProofUrl(profile.driving_license_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>View Driving License</button>
                            )}
                            {profile.ration_card_file_path && (
                                <button onClick={() => window.open(toProofUrl(profile.ration_card_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>View Ration Card</button>
                            )}
                            </div>
                            <h4 style={{ color: '#333', marginTop: '20px' }}>Professional Proofs:</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {profile.recommendation_file_path && (
                                <button onClick={() => window.open(toProofUrl(profile.recommendation_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px' }}>View Recommendation</button>
                            )}
                            {profile.previous_certificates_file_path && (
                                <button onClick={() => window.open(toProofUrl(profile.previous_certificates_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px' }}>View Certificates</button>
                            )}
                            {profile.past_jobs_proof_file_path && (
                                <button onClick={() => window.open(toProofUrl(profile.past_jobs_proof_file_path), '_blank')} style={{ padding: '8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px' }}>View Past Jobs Proof</button>
                            )}
                            {profile.community_verifier_id && (
                                <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #eee' }}>
                                    <strong>Community Verifier ID:</strong> {profile.community_verifier_id}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: PORTFOLIO & RATINGS --- */}
                <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#28a745', borderBottom: '2px solid #28a745', paddingBottom: '10px' }}>Portfolio & Micro-Proofs</h3>
                    
                    {/* Portfolio Items List - NOW RENDERING REAL DATA */}
                    {microProofs.length > 0 ? (
                        microProofs.map((item, index) => (
                            <PortfolioItem 
                                key={index} 
                                item={item} 
                                profession={profile.profession} 
                            />
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '30px', border: '1px dashed #ccc' }}>
                            <p>No proofs submitted yet. Click 'Add New Work' to get started!</p>
                        </div>
                    )}

                    {/* Chronological Submission History */}
                    {microProofs.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                            <h4 style={{ color: '#007bff', borderBottom: '1px solid #007bff', paddingBottom: '6px' }}>Submission History</h4>
                            {microProofs.map((proof, i) => (
                                <div key={`hist-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dotted #eee' }}>
                                    <span style={{ color: '#333' }}>{proof.title}</span>
                                    <span style={{ color: '#6c757d' }}>{proof.issued_date || 'Unknown date'}</span>
                                    <span style={{ color: '#28a745' }}>Score: {typeof proof.grade_score === 'number' ? proof.grade_score : 0}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button onClick={handleDownloadSummary} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%', marginTop: '10px' }}>
                        Download Portfolio Summary
                    </button>
                </div>
            </div>

            {/* --- 3. RECRUITER/JUDGE VIEW SECTION --- */}
            <div style={{ padding: '20px', backgroundColor: '#e9e9e9', borderRadius: '10px', marginTop: '30px', textAlign: 'center' }}>
                <h4 style={{ color: '#6c757d' }}>Recruiter / Judge View Enabled</h4>
                <p style={{ fontSize: '0.9em', color: '#6c757d' }}>This is how evaluators see your verifiable skills and rating history.</p>
            </div>

        </div>
    );
}

export default StepCompleted;
