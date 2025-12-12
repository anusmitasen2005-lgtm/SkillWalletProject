import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
const generateResumeHtml = (profile, microProofs, stats) => {
    // Collect skills from both profile and proofs
    const proofSkills = microProofs.map(p => p.skill);
    const allSkills = [...new Set([profile.skill_tag, profile.power_skill_tag, ...proofSkills])];

    const proofsSection = microProofs.map(item => `
        <div style="margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 4px;">
            <h4 style="color: #28a745; margin: 0;">${item.title} (${item.skill})</h4>
            <p style="margin: 0;">
                <strong>Skill Grade:</strong> ${item.grade_score}/100 🧠 <br/>
                <strong>Proof Link (Visual):</strong> <a href="http://localhost:8000/${item.visualProofUrl}" target="_blank">${item.visualProofUrl}</a><br/>
                <strong>Audio Story Transcript:</strong> ${item.transcription.substring(0, 150)}...
            </p>
        </div>
    `).join('');
    
    // Determine the verification status for resume display
    const isAadhaarSubmitted = isDocSubmitted(profile.aadhaar_file_path);
    const isPanSubmitted = isDocSubmitted(profile.pan_card_file_path);

    const statsSummary = `
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #007bff; margin-top: 0;">Skill Wallet Analytics Summary</h3>
            <p><strong>Average Skill Score:</strong> ${stats.averageRating}/100</p>
            <p><strong>Total Micro-Proofs:</strong> ${stats.proofsUploaded}</p>
        </div>
    `;

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
                
                ${statsSummary}

                <h3>Verifiable Skills</h3>
                <p>${allSkills.join(', ')}</p>

                <h3>Identity Verification Status (Tier 2)</h3>
                <p>Aadhaar Submitted: ${isAadhaarSubmitted ? 'Yes' : 'No'}</p>
                <p>PAN Card Submitted: ${isPanSubmitted ? 'Yes' : 'No'}</p>

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
const PortfolioItem = ({ item }) => {
    // Function to open the proof URL in a new window/tab
    const handleViewVisualProof = () => {
        if (item.visualProofUrl && item.visualProofUrl !== 'N/A') {
            // Use the full URL now that the backend serves static files
            const fullUrl = `${API_BASE_URL.replace('/api/v1', '')}/proofs/${item.visualProofUrl}`; 
            window.open(fullUrl, '_blank');
        } else {
            alert("Visual proof URL not submitted for this item.");
        }
    };
    
    // Function to open the Audio Story in a new tab
    const handleViewAudioProof = () => {
        if (item.audioStoryUrl && item.audioStoryUrl !== 'N/A') {
            const fullUrl = `${API_BASE_URL.replace('/api/v1', '')}/proofs/${item.audioStoryUrl}`; 
            window.open(fullUrl, '_blank');
        } else {
            alert("Audio story URL not submitted for this item.");
        }
    };

    return (
        <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '10px', backgroundColor: '#fff' }}>
            <h5 style={{ color: '#28a745' }}>{item.title}</h5>
            <p style={{ fontSize: '0.9em' }}>Skill: <strong>{item.skill}</strong></p>
            
            {/* Display Grade Score */}
            <h4 style={{ margin: '5px 0', color: item.grade_score >= 80 ? '#28a745' : '#ffc107' }}>
                Skill Grade: {item.grade_score}/100 🧠
            </h4>

            <p style={{ margin: '5px 0' }}>Likes: {item.likes} | Endorsements: {item.comments}</p>
            
            {/* Transcription Block */}
            <div style={{ padding: '10px', backgroundColor: '#f0f8ff', borderLeft: '3px solid #007bff', margin: '10px 0' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>Transcription ({item.language_code}):</p>
                <p style={{ fontSize: '0.8em', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {item.transcription || "Transcription pending/not available."}
                </p>
            </div>
            
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
            
            <div style={{ marginTop: '10px', borderTop: '1px dotted #eee', paddingTop: '5px' }}>
                 <span style={{color: '#ffc107', fontWeight: 'bold'}}>⭐ Rate This Work (4.5/5)</span>
            </div>
        </div>
    );
};


function StepCompleted({ nextStep, jumpToStep, userId }) {
    const [profile, setProfile] = useState({}); // New state for profile data
    const [microProofs, setMicroProofs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ proofsUploaded: 0, averageRating: 'N/A' });

    // Helper function for delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- Data Fetching Logic (Multi-Attempt Resilience) ---
    useEffect(() => {
        if (userId) {
            fetchDashboardData(userId);
        }
    }, [userId]);

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
                calculateStats(proofs);
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

    // --- Calculate Stats (Average Score) ---
    const calculateStats = (proofs) => {
        const scores = proofs.map(p => p.grade_score || 0);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        setStats({
            proofsUploaded: proofs.length,
            averageRating: proofs.length > 0 ? (totalScore / proofs.length).toFixed(1) : 'N/A'
        });
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


    // --- Button Handlers ---
    const handleAddNewWork = () => {
        jumpToStep(4); // Jumps directly back to Step 4 (Build Your Portfolio)
    };
    
    const handleDownloadSummary = () => {
        if (!profile.name || microProofs.length === 0) {
             alert("Cannot generate resume: Please complete your profile (Step 1) and submit at least one proof of work (Step 4).");
             return;
        }
        const htmlContent = generateResumeHtml(profile, microProofs, stats);
        
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
                    <img 
                        src={"/image_605986.jpg"} // Use mock photo placeholder
                        alt="Profile Visual" 
                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ffc107' }}
                    />
                    <div style={{ marginLeft: '20px' }}>
                        <h2 style={{ color: '#007bff', margin: 0 }}>{userName} <span style={{fontSize: '0.8em', color: '#6c757d'}}>({userProfession})</span></h2>
                        <p style={{ margin: '5px 0' }}>**Skill Tag ID:** <span style={{color: '#dc3545'}}>{profile.skillId || 'SW-98234'}</span></p>
                    </div>
                </div>
                
                {/* Analytics Snapshot - NOW USING REAL STATS */}
                <div style={{ display: 'flex', gap: '20px', textAlign: 'center' }}>
                    <div>
                        <h3 style={{ color: '#28a745', margin: 0 }}>{stats.averageRating}</h3>
                        <p style={{ margin: 0, fontSize: '0.9em' }}>Avg. Score</p>
                    </div>
                    <div>
                        <h3 style={{ color: '#007bff', margin: 0 }}>{stats.proofsUploaded}</h3>
                        <p style={{ margin: 0, fontSize: '0.9em' }}>Proofs</p>
                    </div>
                    {/* BUTTON NOW CALLS jumpToStep(4) */}
                    <button onClick={handleAddNewWork} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        Add New Work
                    </button>
                </div>
            </div>

            {/* --- 2. MAIN PROFILE CONTENT (Split into two columns) --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px' }}>
                
                {/* --- LEFT COLUMN: IDENTITY & PROOFS --- */}
                <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>Identity & Verification</h3>
                    
                    {/* Tier 2 & 3 Proofs - REAL STATUS CHECK */}
                    <h4 style={{ color: '#333', marginTop: '20px' }}>Verification Status:</h4>
                    {allProofStatuses.map(proof => (
                        <div key={proof.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dotted #ccc' }}>
                            <span>{proof.name} ({proof.type})</span>
                            <span style={statusStyle(isDocSubmitted(proof.path))}>
                                {isDocSubmitted(proof.path) ? 'Submitted ✅' : 'Missing ❌'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* --- RIGHT COLUMN: PORTFOLIO & RATINGS --- */}
                <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#28a745', borderBottom: '2px solid #28a745', paddingBottom: '10px' }}>Portfolio & Micro-Proofs</h3>
                    
                    {/* AI Insight Summary (using current calculated data) */}
                    <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ffc107', backgroundColor: '#fff9e6', borderRadius: '8px' }}>
                        <h4 style={{ color: '#ffc107', marginTop: 0 }}>🧠 AI Insight Summary:</h4>
                        {microProofs.length > 0 ? (
                            <>
                                <p style={{ margin: '5px 0' }}>
                                    "Your current average skill score is: **{stats.averageRating}/100**"
                                </p>
                                <p style={{ margin: '5px 0' }}>
                                    "Your highest graded work is: **{microProofs.reduce((max, p) => p.grade_score > max.grade_score ? p : max, microProofs[0]).title}**"
                                </p>
                            </>
                        ) : (
                            <p>Submit your first work to generate AI insights!</p>
                        )}
                    </div>

                    {/* Portfolio Items List - NOW RENDERING REAL DATA */}
                    {microProofs.length > 0 ? (
                        microProofs.map((item, index) => (
                            <PortfolioItem key={index} item={item} />
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '30px', border: '1px dashed #ccc' }}>
                            <p>No proofs submitted yet. Click 'Add New Work' to get started!</p>
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