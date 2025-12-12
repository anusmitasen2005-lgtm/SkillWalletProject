import React, { useState, useRef } from 'react'; 
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// ----------------------------------------------------------------------
// Flexible Domain Input Component (for custom skills)
// ----------------------------------------------------------------------
const FlexibleDomainInput = ({ id, label, options, currentValue, onChange, onCustomChange }) => {
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
    const [audioBlob, setAudioBlob] = useState(null);
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
                setAudioBlob(blob);
                
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


function StepFinalSummary({ userId, accessToken, nextStep }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    // State for Work Submission Form
    const [skill, setSkill] = useState('Pottery'); 
    const [imageUrl, setImageUrl] = useState(''); 
    const [imageFile, setImageFile] = useState(null); 
    const [audioUrl, setAudioUrl] = useState(''); 
    const [languageCode, setLanguageCode] = useState('hi');
    
    // Reference for the hidden file input
    const fileInputRef = useRef(null); 

    // --- File Upload Logic ---
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setImageFile(file);
            setImageUrl(file.name); 
            setMessage(`Image/Video file selected: ${file.name}.`);
        }
    };
    
    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    // ----------------------------------------------------------------------
    // WORK SUBMISSION FUNCTION (CRITICAL FIX FOR TRANSITION)
    // ----------------------------------------------------------------------
    const submitWork = async () => {
        setLoading(true);
        setMessage('');
        
        if (!skill || (!imageUrl && !audioUrl)) {
            setMessage('🚨 Submission Check: Please define your Primary Skill and provide Proof/Audio.');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/work/submit/${userId}`, {
                skill_name: skill,
                image_url: imageUrl || 'N/A', 
                audio_file_url: audioUrl || 'N/A', 
                language_code: languageCode,
            });
            
            const token = response.data.skill_token || 'SW-A3F7-229K';

            // 1. Show immediate success message
            setMessage(`🚀 Success! Backend says: ${response.data.message}`);
            
            // 2. Wait 2 seconds, show the final token message, and then transition
            setTimeout(() => {
                // Show final message
                setMessage(`🎖 Your Skill Wallet Token ${token} Has Been Minted!`);
                
                // CRITICAL FIX: Ensure nextStep() is called after the user reads the final message
                // Use a small delay to ensure the last message renders before redirect
                setTimeout(() => {
                    nextStep(); 
                }, 1000); 
                
            }, 2000); 

        } catch (error) {
            setMessage(`Work Submission Failed: ${error.response?.data?.detail || 'Server error'}`);
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
                    
                    {/* 2. Proof (Image/Video) - BUTTON/INPUT SYSTEM */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ minWidth: '150px', fontWeight: 'bold' }}>Proof (Image/Video):</label>
                        
                        {/* Hidden File Input */}
                        <input
                            type="file"
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
                            {imageFile ? 'Change File' : 'Choose File'}
                        </button>
                        
                        {/* Display File Name or Paste Link */}
                        <input
                            type="text"
                            placeholder={imageFile ? imageFile.name : "Or paste Image/Video Link (e.g., s3://...)"}
                            value={imageUrl}
                            onChange={(e) => {setImageUrl(e.target.value); setImageFile(null); }} 
                            style={{ padding: '10px', flexGrow: 1, border: '1px solid #ccc' }}
                        />
                    </div>

                    {/* 3. Skill Story (Voice) - DUAL INPUT (Record OR Link) */}
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ minWidth: '150px', fontWeight: 'bold' }}>Skill Story (Voice):</label>
                        
                        {/* RECORDER COMPONENT */}
                        <VoiceRecorder audioUrl={audioUrl} setAudioUrl={setAudioUrl} />

                        <input
                            type="text"
                            placeholder="Or paste Audio Link (e.g., s3://audio/desc.mp3)"
                            value={audioUrl}
                            onChange={(e) => setAudioUrl(e.target.value)}
                            style={{ padding: '10px', flexGrow: 1, border: '1px solid #ccc' }}
                        />
                        <select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} style={{ padding: '10px' }}>
                            <option value="hi">Hindi (Voice)</option>
                            <option value="en">English (Voice)</option>
                        </select>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button onClick={submitWork} disabled={loading} 
                                style={{ padding: '15px 40px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontSize: '18px', borderRadius: '5px' }}>
                            {loading ? 'Auditing Skill...' : 'Submit Micro-Proof & Mint Token'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StepFinalSummary;