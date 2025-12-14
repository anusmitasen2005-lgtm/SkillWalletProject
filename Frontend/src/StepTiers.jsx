import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

// --- NEW: Reusable Component for Select OR Text Input ---
// FIX: MOVED COMPONENT DEFINITION TO TOP LEVEL (OUTSIDE OF StepTiers FUNCTION)
const FlexibleDomainInput = ({ label, options, currentValue, onChange, onCustomChange }) => {
    // Check if the current value is NOT one of the predefined options
    const isCustom = !options.includes(currentValue);
    
    // Internal state to track if the user has explicitly selected the "Type in your own" option
    const [selectValue, setSelectValue] = useState(isCustom ? 'custom' : currentValue);

    const handleSelectChange = (e) => {
        const newValue = e.target.value;
        setSelectValue(newValue);

        if (newValue === 'custom') {
            onCustomChange(''); // Clear current value to signal custom mode
        } else {
            onChange(newValue); // Set predefined value
        }
    };

    return (
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>{label}:</label>
            
            {/* 1. Dropdown Selection */}
            <select 
                value={selectValue}
                onChange={handleSelectChange}
                style={{ padding: '8px', width: '100%', marginBottom: '5px', border: '1px solid #ddd' }}
            >
                {options.map(option => (
                    <option key={option} value={option}>{option}</option>
                ))}
                <option value="custom">-- Type in your own --</option>
            </select>

            {/* 2. Custom Text Input (Shown if 'custom' is selected) */}
            {selectValue === 'custom' && (
                <input
                    type="text"
                    placeholder="e.g., Painter, Welder, Chef"
                    value={currentValue} // Use the actual current value from the parent state
                    onChange={(e) => onCustomChange(e.target.value)}
                    style={{ padding: '8px', width: '100%', border: '1px solid #ddd' }}
                />
            )}
        </div>
    );
};
// END of FlexibleDomainInput component

// --- NEW: DocumentInput component moved to top level to avoid render-time creation ---
const DocumentInput = ({ title, docType, isVerified, docs, setDocs, setFilesToUpload, loading, handleFileUploadAndSave }) => {
    return (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <h5 style={{ color: isVerified ? '#28a745' : '#007bff', margin: '0 0 10px 0' }}>
                {title} {isVerified ? '✅' : ''}
            </h5>
            <input
                type="text"
                placeholder={`${title} Number (Optional)`}
                value={docs[`${docType}_number`]}
                onChange={(e) => setDocs(prev => ({ ...prev, [`${docType}_number`]: e.target.value }))}
                style={{ padding: '8px', width: '100%', marginBottom: '10px', border: '1px solid #ddd' }}
            />
            <input
                type="file"
                onChange={(e) => setFilesToUpload(prev => ({ ...prev, [docType]: e.target.files[0] }))}
                style={{ padding: '10px', width: '100%', marginBottom: '10px', border: '1px solid #ddd' }}
            />
             <button onClick={() => handleFileUploadAndSave(docType)} disabled={loading} 
                    style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', fontSize: '14px', width: '100%', marginTop: '5px' }}>
                {loading ? 'Submitting...' : `Submit ${title} Proof`}
            </button>
        </div>
    );
};

function StepTiers({ userId, nextStep }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [hasInitializedDocs, setHasInitializedDocs] = useState(false);
    
    // State for documents (number input and the actual File object)
    const [docs, setDocs] = useState({
        aadhaar_number: '', pan_card_number: '',
        voter_id_number: '', driving_license_number: '',
        ration_card_number: '',
        // Initialize domain/skill state (RESTORED)
        primary_domain_identity: 'Construction',
        differentiating_power_skill: 'Teaching/Mentoring',
    });

    // State for actual file objects to be uploaded
    const [filesToUpload, setFilesToUpload] = useState({
        aadhaar: null, pan: null, voter: null, driving_license: null, ration_card: null
    });
    
    const reloadProfile = useCallback(async () => {
        const response = await axios.get(`${API_BASE_URL}/user/profile/${userId}`);
        setProfile(response.data);
        setLoading(false);
        if (!hasInitializedDocs) {
            setDocs(prev => ({ 
                ...prev,
                primary_domain_identity: response.data.skill_tag || prev.primary_domain_identity, 
                differentiating_power_skill: response.data.power_skill_tag || prev.differentiating_power_skill,
            }));
            setHasInitializedDocs(true);
        }
    }, [userId, hasInitializedDocs]);
    
    useEffect(() => {
        const id = setTimeout(() => {
            reloadProfile().catch(() => {
                setMessage('Error fetching identity status. (Ensure Backend is running)');
                setLoading(false);
            });
        }, 0);
        return () => clearTimeout(id);
    }, [userId, reloadProfile]);
    
    // --- Document Submission Handlers (File Upload & Text Update) ---
    const handleFileUploadAndSave = async (docType) => {
        const file = filesToUpload[docType];
        const numberFieldMap = {
            aadhaar: 'aadhaar_number',
            pan: 'pan_card_number',
            voter: 'voter_id_number',
            driving_license: 'driving_license_number',
            ration_card: 'ration_card_number',
        };
        const filePathFieldMap = {
            aadhaar: 'aadhaar_file_path',
            pan: 'pan_card_file_path',
            voter: 'voter_id_file_path',
            driving_license: 'driving_license_file_path',
            ration_card: 'ration_card_file_path',
        };
        const numberField = numberFieldMap[docType];
        const filePathField = filePathFieldMap[docType];
        
        if (docs[numberField] || file) {
            setLoading(true);
            setMessage('');

            try {
                // 1. Send the file first, if present
                if (file) {
                    const formData = new FormData();
                    formData.append("file", file);
                    
                    const uploadResponse = await axios.post(
                        `${API_BASE_URL}/identity/tier2/upload/${userId}?file_type=${docType}`, 
                        formData, 
                        { headers: { 'Content-Type': 'multipart/form-data' } }
                    );
                    setMessage(`File upload for ${docType} successful!`);
                    
                    // 2. Update the number and file path text fields
                    await axios.post(`${API_BASE_URL}/identity/tier2/${userId}`, {
                        [numberField]: docs[numberField],
                        [filePathField]: uploadResponse.data.file_location
                    });
                }
                
                // If only the number was entered, just update the text fields
                else if (docs[numberField]) {
                     await axios.post(`${API_BASE_URL}/identity/tier2/${userId}`, {
                        [numberField]: docs[numberField],
                     });
                }
                
                setMessage(`🟢 ${docType.toUpperCase()} proofs updated. Upload more documents to increase your score!`);
                await reloadProfile();
                
            } catch (error) {
                setMessage(`Upload Failed for ${docType}: ${error.response?.data?.detail || 'Server error'}`);
            }
            setLoading(false);
        } else {
            setMessage(`Please enter a number or select a file for ${docType}.`);
        }
    };

    // --- Handle saving Domain Identity and Power Skill (RESTORED LOGIC) ---
    const updateDomainAndSkill = async () => {
        setLoading(true);
        setMessage('');
        try {
            // Save the current domain and power skill selections
            await axios.post(`${API_BASE_URL}/user/update_skill_tag/${userId}`, {
                skill_tag: docs.primary_domain_identity,
                power_skill_tag: docs.differentiating_power_skill
            });
            
            setMessage(`✅ Identity and Proofs saved!`);
            await reloadProfile();

        } catch (error) {
            setMessage(`Submission Failed: ${error.response?.data?.detail || 'Server error'}`);
        }
        setLoading(false);
    };


    

    if (loading) return <div style={{ textAlign: 'center' }}>Loading Verification Core...</div>;
    if (!profile) return <div style={{ textAlign: 'center', color: 'red' }}>Could not load user profile.</div>;
    
    // Check if at least one document file path was submitted
    const isTier2Verified = profile.aadhaar_file_path || profile.pan_card_file_path || profile.voter_id_file_path || profile.driving_license_file_path || profile.ration_card_file_path;

    return (
        <div style={{ padding: '20px', backgroundColor: '#fff', minHeight: '400px' }}>
            <h2 style={{ color: '#007bff', textAlign: 'center' }}>🔒 Step 2: Core Identity & Domain Definition</h2>
            <p style={{ textAlign: 'center', color: '#555' }}>
                Define your primary identity and differentiating skill. **(Your current skill tag is: {profile.skill_tag || 'N/A'})**
            </p>
            {message && <p style={{ color: 'green', fontWeight: 'bold', textAlign: 'center' }}>{message}</p>}

            {/* ------------------------------------------------------------- */}
            {/* DOMAIN AND POWER SKILL SELECTION (RESTORED) */}
            {/* ------------------------------------------------------------- */}
            <div style={{ 
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)', 
                padding: '25px', 
                margin: '20px 0', 
                borderRadius: '10px', 
                borderLeft: `5px solid #28a745` 
            }}>
                <h4 style={{ color: '#28a745', paddingBottom: '10px' }}>
                    Skill Identity Definition (Editable)
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                    <FlexibleDomainInput
                        label="Primary Domain Identity (Trade/Profession)"
                        options={['Construction', 'Apparel', 'Automotive Repair', 'Food Service', 'Textile Arts', 'Carpenter', 'Painter', 'Welder']}
                        currentValue={docs.primary_domain_identity}
                        onChange={(val) => setDocs(prev => ({ ...prev, primary_domain_identity: val }))}
                        onCustomChange={(val) => setDocs(prev => ({ ...prev, primary_domain_identity: val }))}
                    />

                    <FlexibleDomainInput
                        label="Differentiating Power Skill (Soft Skill)"
                        options={['Teaching/Mentoring', 'Finance/Accounting', 'Quality Control', 'Customer Service', 'Problem Solving', 'Leadership', 'Negotiation', 'Digital Literacy']}
                        currentValue={docs.differentiating_power_skill}
                        onChange={(val) => setDocs(prev => ({ ...prev, differentiating_power_skill: val }))}
                        onCustomChange={(val) => setDocs(prev => ({ ...prev, differentiating_power_skill: val }))}
                    />
                </div>
                
                {/* NOTE: We removed the separate Save button here and rely on the combined button below. */}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* GOVERNMENT DOCUMENT PROOFS (File upload section) */}
            {/* ------------------------------------------------------------- */}
            <div style={{ 
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)', 
                padding: '25px', 
                margin: '30px 0', 
                borderRadius: '10px', 
                borderLeft: `5px solid ${isTier2Verified ? '#007bff' : '#ccc'}` 
            }}>
                <h4 style={{ color: '#007bff', paddingBottom: '10px' }}>
                    Government-Linked Proofs (Optional)
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                    <DocumentInput title="Aadhaar Card" docType="aadhaar" isVerified={!!profile.aadhaar_file_path} docs={docs} setDocs={setDocs} setFilesToUpload={setFilesToUpload} loading={loading} handleFileUploadAndSave={handleFileUploadAndSave} />
                    <DocumentInput title="PAN Card" docType="pan" isVerified={!!profile.pan_card_file_path} docs={docs} setDocs={setDocs} setFilesToUpload={setFilesToUpload} loading={loading} handleFileUploadAndSave={handleFileUploadAndSave} />
                    <DocumentInput title="Voter ID" docType="voter" isVerified={!!profile.voter_id_file_path} docs={docs} setDocs={setDocs} setFilesToUpload={setFilesToUpload} loading={loading} handleFileUploadAndSave={handleFileUploadAndSave} />
                    <DocumentInput title="Driving License" docType="driving_license" isVerified={!!profile.driving_license_file_path} docs={docs} setDocs={setDocs} setFilesToUpload={setFilesToUpload} loading={loading} handleFileUploadAndSave={handleFileUploadAndSave} />
                    <DocumentInput title="Ration Card" docType="ration_card" isVerified={!!profile.ration_card_file_path} docs={docs} setDocs={setDocs} setFilesToUpload={setFilesToUpload} loading={loading} handleFileUploadAndSave={handleFileUploadAndSave} />
                </div>
                
                {/* COMBINED SUBMISSION/NAVIGATION BUTTONS - CORRECT PLACEMENT */}
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                    {/* 1. The Main Save/Update Button */}
                    <button onClick={updateDomainAndSkill} disabled={loading} 
                            style={{ padding: '15px 35px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', fontSize: '16px', marginRight: '10px' }}>
                        {loading ? 'Submitting Data...' : 'Save & Update Tier 2 Proofs'}
                    </button>

                    {/* 2. The Skip Button */}
                    <button onClick={nextStep} 
                            style={{ padding: '15px 35px', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', fontSize: '16px' }}>
                        Skip Tier 2 & Proceed
                    </button>
                </div>
            </div>

            {/* TIER 3 SECTION - Remains a placeholder for now */}
            <div style={{ 
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)', 
                padding: '25px', 
                margin: '30px 0 20px 0', 
                borderRadius: '10px', 
                borderLeft: '5px solid #ffc107', 
                textAlign: 'center' 
            }}>
                <h4 style={{ color: '#ffc107' }}>Current Skill Score: {profile.tier3_cibil_score} / 100</h4>
            </div>
        </div>
    );
}

export default StepTiers;
