import React, { useState, useRef } from 'react'; 
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

// ----------------------------------------------------------------------
// Flexible Domain Input Component (for custom skills)
// ----------------------------------------------------------------------
const FlexibleDomainInput = ({ label, options, currentValue, onChange, onCustomChange }) => {
    const isCustom = !options.includes(currentValue);
    const [selectValue, setSelectValue] = useState(isCustom ? 'custom' : currentValue);

    const handleSelectChange = (e) => {
        const newValue = e.target.value;
        setSelectValue(newValue);

        if (newValue === 'custom') {
            onCustomChange(''); 
        } else {
            onChange(newValue); 
        }
    };

    return (
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>{label}:</label>
            
            {/* 1. Dropdown Selection */}
            <select 
                value={selectValue}
                onChange={handleSelectChange}
                style={{ padding: '8px', width: '100%', marginBottom: '5px', border: '1px solid #ccc' }}
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
                    value={currentValue} 
                    onChange={(e) => onCustomChange(e.target.value)}
                    style={{ padding: '8px', width: '100%', border: '1px solid #ccc' }}
                />
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// Voice Recorder Component (Handles Start/Stop/Playback)
// ----------------------------------------------------------------------
const VoiceRecorder = ({ audioUrl, setAudioUrl }) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const tempUrl = URL.createObjectURL(blob);
                setAudioUrl(tempUrl);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);

        } catch (err) {
            alert('Microphone access denied or not available. Cannot record voice.');
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };
    
    return (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                    padding: '10px 15px',
                    backgroundColor: isRecording ? '#dc3545' : '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    minWidth: '120px'
                }}
            >
                {isRecording ? '🔴 Stop Recording' : '🎤 Record Voice'}
            </button>
            
            {/* Playback Button / Status */}
            {audioUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{color: '#28a745', fontWeight: 'bold'}}>Audio Ready:</span>
                    <audio controls src={audioUrl} style={{ height: '35px' }} />
                </div>
            )}
        </div>
    );
};


function StepFinalSummary({ userId, nextStep }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    // State for Work Submission Form
    const [skill, setSkill] = useState('Pottery'); 
    
    // NEW: Upload Type Selection
    const [uploadType, setUploadType] = useState('image'); // 'image' or 'video'

    // Video State
    const [imageUrl, setImageUrl] = useState(''); 
    const [imageFile, setImageFile] = useState(null); 
    
    // NEW: Multi-View Image State
    const [imageViews, setImageViews] = useState({
        top: null,
        front: null,
        left: null,
        right: null,
        other: null
    });
    const [imageViewUrls, setImageViewUrls] = useState({
        top: '',
        front: '',
        left: '',
        right: '',
        other: ''
    });

    const [audioUrl, setAudioUrl] = useState(''); 
    const [languageCode, setLanguageCode] = useState('hi');
    
    // Reference for the hidden file input (Video)
    const fileInputRef = useRef(null); 
    
    // --- Video/Single File Upload Logic ---
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setImageFile(file);
            setImageUrl(file.name); 
            setMessage(`Video file selected: ${file.name}.`);
        }
    };
    
    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    // --- Multi-Image Upload Logic ---
    const handleViewUpload = async (viewName, file) => {
        if (!file) return;
        
        // Optimistic UI update
        setImageViews(prev => ({ ...prev, [viewName]: file }));
        setMessage(`Uploading ${viewName} view...`);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            const kind = 'image'; // Always image for views
            
            const uploadResp = await axios.post(
                `${API_BASE_URL}/work/upload_proof/${userId}?kind=${kind}`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            
            const uploadedUrl = uploadResp.data.proof_url;
            setImageViewUrls(prev => ({ ...prev, [viewName]: uploadedUrl }));
            setMessage(`✅ ${viewName} view uploaded!`);
            
        } catch (error) {
            console.error(`Upload failed for ${viewName}`, error);
            setMessage(`❌ Failed to upload ${viewName} view.`);
        }
    };

    const SingleViewInput = ({ label, viewKey }) => {
        const inputRef = useRef(null);
        const hasFile = !!imageViewUrls[viewKey];
        
        return (
            <div style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{label}:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                        type="file" 
                        accept="image/*"
                        ref={inputRef}
                        style={{ display: 'none' }}
                        onChange={(e) => handleViewUpload(viewKey, e.target.files[0])}
                    />
                    <button 
                        onClick={() => inputRef.current.click()}
                        style={{
                            padding: '5px 10px',
                            backgroundColor: hasFile ? '#28a745' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {hasFile ? 'Change Image' : 'Select Image'}
                    </button>
                    {imageViewUrls[viewKey] && <span style={{ color: '#28a745', fontSize: '0.9em' }}>✅ Uploaded</span>}
                    {!imageViewUrls[viewKey] && imageViews[viewKey] && <span style={{ color: '#ffc107', fontSize: '0.9em' }}>⏳ Uploading...</span>}
                </div>
            </div>
        );
    };

    // ----------------------------------------------------------------------
    // WORK SUBMISSION FUNCTION (CRITICAL FIX FOR TRANSITION)
    // ----------------------------------------------------------------------
    const [evaluationResult, setEvaluationResult] = useState(null); // Store evaluation result

    const submitWork = async () => {
        setLoading(true);
        setMessage('');
        setEvaluationResult(null);
        
        // Validation Logic
        let finalProofUrl = '';
        
        if (uploadType === 'video') {
             if (!imageUrl && !audioUrl) {
                setMessage('🚨 Submission Check: Please provide Proof/Audio.');
                setLoading(false);
                return;
            }
        } else {
            // Check if at least one image is uploaded
            const uploadedCount = Object.values(imageViewUrls).filter(url => url !== '').length;
            if (uploadedCount === 0 && !audioUrl) {
                setMessage('🚨 Submission Check: Please upload at least one image view or audio.');
                setLoading(false);
                return;
            }
        }

        try {
            // 1. Prepare Final Proof URL
            if (uploadType === 'video') {
                // If a local file was chosen, upload it to backend first to get a served path
                finalProofUrl = imageUrl;
                if (imageFile) {
                    const formData = new FormData();
                    formData.append('file', imageFile);
                    const kind = 'video';
                    const uploadResp = await axios.post(
                        `${API_BASE_URL}/work/upload_proof/${userId}?kind=${kind}`,
                        formData,
                        { headers: { 'Content-Type': 'multipart/form-data' } }
                    );
                    finalProofUrl = uploadResp.data.proof_url; // e.g., /proofs/<user>/<file>
                }
            } else {
                // Combine all uploaded image URLs into a pipe-delimited string
                // Only include views that have URLs
                const urls = Object.values(imageViewUrls).filter(url => url !== '');
                if (urls.length > 0) {
                    finalProofUrl = urls.join('|');
                } else {
                    finalProofUrl = 'N/A';
                }
            }

            // 2. Prepare Audio URL
            let finalAudioUrl = audioUrl;
            if (audioUrl && audioUrl.startsWith('blob:')) {
                const blob = await fetch(audioUrl).then(r => r.blob());
                const audioFile = new File([blob], `audio_story_${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
                const audioForm = new FormData();
                audioForm.append('file', audioFile);
                const audioUploadResp = await axios.post(
                    `${API_BASE_URL}/work/upload_proof/${userId}?kind=audio`,
                    audioForm,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );
                finalAudioUrl = audioUploadResp.data.proof_url;
            }

            // Step 1: Submit work and mint token
            setMessage('Minting Skill Token...');
            const submitResp = await axios.post(`${API_BASE_URL}/work/submit/${userId}`, {
                skill_name: skill,
                image_url: finalProofUrl || 'N/A', 
                audio_file_url: finalAudioUrl || 'N/A', 
                language_code: languageCode,
            });
            
            const credentialId = submitResp.data.credential_id;

            // Step 2: Evaluate Skill (AI + Search)
            setMessage('Analyzing skill & finding opportunities (this may take a moment)...');
            try {
                // We just trigger the evaluation so it saves to the DB.
                // The dashboard will display the results (recommendations).
                await axios.post(`${API_BASE_URL}/work/evaluate/${credentialId}`);
                setMessage('✅ Work Verified & Opportunities Found!');
                
                // Auto-redirect to dashboard after a short delay
                setTimeout(() => {
                    nextStep();
                }, 1000);

            } catch (evalErr) {
                console.error("Evaluation failed", evalErr);
                setMessage('⚠️ Token minted, but AI evaluation failed. Proceeding...');
                setTimeout(() => nextStep(), 2000);
                return;
            }

        } catch (error) {
            setMessage(`Work Submission Failed: ${error.response?.data?.detail || 'Server error'}`);
            setLoading(false);
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#fff', minHeight: '400px' }}>
            <h2 style={{ color: '#28a745', textAlign: 'center' }}>🌟 Step 4: Build Your Portfolio</h2>
            <p style={{ textAlign: 'center', color: '#555' }}>
                This is the final stage to submit your work and mint your Skill Token.
            </p>
            {message && <p style={{ color: '#007bff', fontWeight: 'bold', textAlign: 'center' }}>{message}</p>}

            {/* ------------------------------------------------------------- */}
            {/* MICRO-PORTFOLIO SUBMISSION FORM */}
            {/* ------------------------------------------------------------- */}
            <div style={{ 
                padding: '25px', 
                border: '1px dashed #28a745', 
                borderRadius: '8px', 
                marginTop: '40px',
                maxWidth: '600px',
                margin: 'auto',
                boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
            }}>
                <h4 style={{ color: '#28a745', textAlign: 'center', marginBottom: '30px' }}>
                    Submit New Work & Voice Story
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 1. Primary Skill Selection (NOW FLEXIBLE) */}
                    <FlexibleDomainInput
                        id="primary_skill_final"
                        label="Primary Skill"
                        options={['Pottery', 'Carpentry', 'Weaving', 'Welder', 'Electrician', 'Tailor', 'Plumber', 'Mechanic']}
                        currentValue={skill}
                        onChange={setSkill}
                        onCustomChange={setSkill}
                    />
                    
                    {/* 2. PROOF TYPE SELECTION */}
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Proof Type:</label>
                        <label style={{ marginRight: '15px' }}>
                            <input 
                                type="radio" 
                                value="image" 
                                checked={uploadType === 'image'} 
                                onChange={() => setUploadType('image')} 
                            /> Image (Multiple Views)
                        </label>
                        <label>
                            <input 
                                type="radio" 
                                value="video" 
                                checked={uploadType === 'video'} 
                                onChange={() => setUploadType('video')} 
                            /> Video (Single File)
                        </label>
                    </div>

                    {/* 3. PROOF UPLOAD (CONDITIONAL) */}
                    {uploadType === 'video' ? (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ minWidth: '100px', fontWeight: 'bold' }}>Video File:</label>
                            
                            {/* Hidden File Input */}
                            <input
                                type="file"
                                accept="video/*"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                style={{ display: 'none' }} 
                            />
                            
                            {/* Custom Upload Button */}
                            <button
                                onClick={triggerFileInput}
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    minWidth: '150px'
                                }}
                            >
                                {imageFile ? 'Change Video' : 'Choose Video'}
                            </button>
                            
                            <input
                                type="text"
                                placeholder={imageFile ? imageFile.name : "Or paste Video Link"}
                                value={imageUrl}
                                onChange={(e) => {setImageUrl(e.target.value); setImageFile(null); }} 
                                style={{ padding: '10px', flexGrow: 1, border: '1px solid #ccc' }}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <SingleViewInput label="Top View" viewKey="top" />
                            <SingleViewInput label="Front View" viewKey="front" />
                            <SingleViewInput label="Left View" viewKey="left" />
                            <SingleViewInput label="Right View" viewKey="right" />
                            <div style={{ gridColumn: 'span 2' }}>
                                <SingleViewInput label="Other / Extra View" viewKey="other" />
                            </div>
                        </div>
                    )}

                    {/* 4. Skill Story (Voice) - DUAL INPUT (Record OR Link) */}
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ minWidth: '100px', fontWeight: 'bold' }}>Voice Story:</label>
                        
                        {/* RECORDER COMPONENT */}
                        <VoiceRecorder audioUrl={audioUrl} setAudioUrl={setAudioUrl} />

                        <input
                            type="text"
                            placeholder="Or paste Audio Link"
                            value={audioUrl}
                            onChange={(e) => setAudioUrl(e.target.value)}
                            style={{ padding: '10px', flexGrow: 1, border: '1px solid #ccc' }}
                        />
                        <select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} style={{ padding: '10px' }}>
                            <option value="hi">Hindi</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button onClick={submitWork} disabled={loading} 
                                style={{ padding: '15px 40px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontSize: '18px', borderRadius: '5px' }}>
                            {loading ? 'Minting...' : 'Submit Work & Mint Token'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StepFinalSummary;
