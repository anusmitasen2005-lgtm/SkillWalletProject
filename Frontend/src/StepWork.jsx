import React, { useState, useRef } from 'react';
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

function StepWork({ userId, nextStep }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    // State for TIER 3 Proofs
    const [proofs, setProofs] = useState({
        recommendation_file_path: '',
        community_verifier_id: '',
        previous_certificates_file_path: '',
        past_jobs_proof_file_path: '',
    });
    const [tier3Files, setTier3Files] = useState({
        recommendation_file_path: null,
        previous_certificates_file_path: null,
        past_jobs_proof_file_path: null,
    });
    
    const uploadAliases = {
        recommendation_file_path: 'recommendation',
        previous_certificates_file_path: 'previous_certificates',
        past_jobs_proof_file_path: 'past_jobs',
    };
    
    const Tier3DocumentInput = ({ title, docKey, noteLabel }) => {
        const fileInputRef = useRef(null);
        
        const handleSelectFile = (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                const simulatedFileName = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                setProofs(prev => ({ ...prev, [docKey]: simulatedFileName }));
                setTier3Files(prev => ({ ...prev, [docKey]: file }));
                setMessage(`File selected for ${title}. Click 'Submit ${title} Proof' to save.`);
            }
        };
        
        const handleSubmit = async () => {
            setLoading(true);
            setMessage('');
            try {
                let payload = {};
                const fileObj = tier3Files[docKey];
                if (fileObj) {
                    const form = new FormData();
                    form.append('file', fileObj);
                    const resp = await axios.post(`${API_BASE_URL}/identity/tier3/upload/${userId}?file_type=${uploadAliases[docKey]}`, form, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    payload[docKey] = resp.data.file_location;
                }
                if (docKey === 'community_verifier_id') {
                    payload['community_verifier_id'] = proofs['community_verifier_id'];
                }
                await axios.post(`${API_BASE_URL}/identity/tier3/${userId}`, payload);
                setMessage(`🟢 ${title} updated successfully.`);
            } catch (error) {
                setMessage(`Upload Failed for ${title}: ${error.response?.data?.detail || 'Server error'}`);
            }
            setLoading(false);
        };
        
        return (
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <h5 style={{ color: '#ffc107', margin: '0 0 10px 0' }}>{title}</h5>
                {docKey !== 'community_verifier_id' && (
                    <>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleSelectFile}
                            style={{ padding: '10px', width: '100%', marginBottom: '10px', border: '1px solid #ddd' }}
                        />
                        {proofs[docKey] && <div style={{ fontSize: '0.85em', color: '#6c757d', marginBottom: '10px' }}>{proofs[docKey].split('(')[0].trim()}</div>}
                    </>
                )}
                <input
                    type="text"
                    placeholder={noteLabel}
                    value={docKey === 'community_verifier_id' ? proofs['community_verifier_id'] : ''}
                    onChange={(e) => {
                        if (docKey === 'community_verifier_id') {
                            setProofs(prev => ({ ...prev, community_verifier_id: e.target.value }));
                        }
                    }}
                    style={{ padding: '8px', width: '100%', marginBottom: '10px', border: '1px solid #ddd' }}
                />
                <button 
                    onClick={handleSubmit} 
                    disabled={loading} 
                    style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', fontSize: '14px', width: '100%', marginTop: '5px' }}
                >
                    {loading ? 'Submitting...' : `Submit ${title} Proof`}
                </button>
            </div>
        );
    };
    
    const jumpToPortfolio = () => nextStep();

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
                    <Tier3DocumentInput title="Employer Recommendation" docKey="recommendation_file_path" noteLabel="Enter recommendation link/ID (Optional)" />
                    <Tier3DocumentInput title="Community Verifier ID/Proof" docKey="community_verifier_id" noteLabel="Enter community verifier ID/link" />
                    <Tier3DocumentInput title="Previous Certificates" docKey="previous_certificates_file_path" noteLabel="Enter certificates link (Optional)" />
                    <Tier3DocumentInput title="Proof of Past Jobs" docKey="past_jobs_proof_file_path" noteLabel="Enter past jobs link (Optional)" />
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                    <button onClick={jumpToPortfolio} 
                            style={{ padding: '15px 35px', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', fontSize: '16px' }}>
                        Proceed to Portfolio
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StepWork;
