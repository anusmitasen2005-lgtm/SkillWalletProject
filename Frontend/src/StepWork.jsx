import React, { useState, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function StepWork({ userId, accessToken, nextStep }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    // State for TIER 3 Proofs
    const [proofs, setProofs] = useState({
        recommendation_file_path: '',
        community_verifier_id: '',
        previous_certificates_file_path: '',
        past_jobs_proof_file_path: '',
    });
    
    // --- Document Submission Handlers (Handles File Selection for Tier 3) ---
    const handleFileSelect = (e, fieldName) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const simulatedFileName = `${file.name} (${(file.size / 1024).toFixed(1)} KB, ${file.type.split('/')[1] || 'file'})`;
            
            setProofs(prev => ({ ...prev, [fieldName]: simulatedFileName }));
            setMessage(`File selected for ${fieldName.replace(/_/g, ' ')}. Click 'Save & Update Tier 3 Proofs' to confirm.`);
        }
    };
    
    // --- Component for a single Proof Input (TIER 3) ---
    const ProofInput = ({ title, fileKey }) => {
        const fileInputRef = useRef(null); 

        const triggerFileInput = () => {
            fileInputRef.current.click();
        };

        return (
            <div style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <h5 style={{ color: '#ffc107', margin: '0 0 10px 0' }}>{title}</h5>
                
                {/* 1. Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileSelect(e, fileKey)}
                    style={{ display: 'none' }} // Hide the native browser button
                />

                {/* 2. Custom Upload Button */}
                <button
                    onClick={triggerFileInput}
                    style={{
                        padding: '10px 15px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        width: '100%',
                        marginBottom: '10px'
                    }}
                >
                    {proofs[fileKey] ? `Change File (${proofs[fileKey].split('(')[0].trim()})` : 'Upload File'}
                </button>
                
                {/* 3. Manual Input (for verifier ID, link, etc.) */}
                <input
                    type="text"
                    placeholder={`Or enter ${title} link/ID (Optional)`}
                    value={proofs[fileKey]}
                    onChange={(e) => setProofs(prev => ({ ...prev, [fileKey]: e.target.value }))}
                    style={{ padding: '8px', width: '100%', marginTop: '5px', border: '1px solid #ddd' }}
                />
            </div>
        );
    };

    const submitTier3 = async () => {
        setLoading(true);
        setMessage('');
        try {
            await axios.post(`${API_BASE_URL}/identity/tier3/${userId}`, proofs);
            setMessage(`🟢 Tier 3 Professional proofs updated. Proceeding to Portfolio Builder.`);
            
            // CRITICAL CHANGE: Move to the next step (Step 4: Portfolio Builder)
            setTimeout(() => {
                nextStep(); 
            }, 1000);
            
        } catch (error) {
            setMessage(`Tier 3 Submission Failed: ${error.response?.data?.detail || 'Server error'}`);
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#fff', minHeight: '400px' }}>
            <h2 style={{ color: '#28a745', textAlign: 'center' }}>🌟 Step 3: Professional Proofs</h2>
            <p style={{ textAlign: 'center', color: '#555' }}>
                Increase your **Skill Score** by providing professional proofs.
            </p>
            {message && <p style={{ color: '#007bff', fontWeight: 'bold', textAlign: 'center' }}>{message}</p>}

            {/* ------------------------------------------------------------- */}
            {/* TIER 3 PROFESSIONAL PROOFS (OPTIONAL) */}
            {/* ------------------------------------------------------------- */}
            <div style={{ 
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)', 
                padding: '25px', 
                margin: '20px auto', 
                maxWidth: '700px', // Center the content
                borderRadius: '10px', 
                borderLeft: `5px solid #ffc107` 
            }}>
                <h4 style={{ color: '#ffc107', paddingBottom: '10px' }}>
                    Optional Professional Identity Proofs
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                    <ProofInput title="Employer Recommendation" fileKey="recommendation_file_path" />
                    <ProofInput title="Community Verifier ID/Proof" fileKey="community_verifier_id" />
                    <ProofInput title="Previous Certificates" fileKey="previous_certificates_file_path" />
                    <ProofInput title="Proof of Past Jobs" fileKey="past_jobs_proof_file_path" />
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                    <button onClick={submitTier3} disabled={loading} 
                            style={{ padding: '15px 35px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', fontSize: '16px', marginRight: '10px' }}>
                        {loading ? 'Submitting Data...' : 'Save & Update Tier 3 Proofs'}
                    </button>
                    
                    {/* NEW: Skip button to proceed to Step 4 (Portfolio) */}
                    <button onClick={nextStep} 
                            style={{ padding: '15px 35px', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', fontSize: '16px' }}>
                        Skip Tier 3 & Proceed
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StepWork;