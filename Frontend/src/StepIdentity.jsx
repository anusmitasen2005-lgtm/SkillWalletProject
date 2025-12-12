import React, { useState, useEffect } from 'react';
import axios from 'axios';

// CRITICAL FIX 1: Use 127.0.0.1 for maximum stability with local backend host="0.0.0.0"
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Base styles for consistency
const inputStyle = {
    padding: '10px',
    margin: '10px 0',
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: '4px',
    border: '1px solid #ccc',
};

const buttonStyle = {
    padding: '10px 20px',
    margin: '15px 0',
    width: '100%',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
};


function StepIdentity({ nextStep, setUserId, setAccessToken }) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [flowState, setFlowState] = useState('input_phone'); // input_phone, input_otp, profile_setup
    
    const [name, setName] = useState('');         
    const [profession, setProfession] = useState(''); 
    const [profilePhoto, setProfilePhoto] = useState(null); 
    const [formError, setFormError] = useState('');

    // CRITICAL FIX 2: Aggressively check local storage to skip phone/OTP if already done
    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        const storedAccessToken = localStorage.getItem('accessToken');
        
        if (storedUserId && storedAccessToken) {
            // User is logged in, skip directly to profile setup screen
            setUserId(storedUserId);
            setAccessToken(storedAccessToken);
            setFlowState('profile_setup');
        }
    }, []);


    const handleSendOtp = async () => {
        setFormError('');
        try {
            await axios.post(`${API_BASE_URL}/auth/otp/send`, { phone_number: phoneNumber });
            setFlowState('input_otp');
        } catch (error) {
            console.error("Error sending OTP:", error);
            setFormError('Failed to send OTP. Check phone format or server status.');
        }
    };

    const handleVerifyOtp = async () => {
        setFormError('');
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
                phone_number: phoneNumber,
                otp_code: otpCode,
            });

            if (response.data.access_token) {
                const tokenParts = response.data.access_token.split('_');
                const newUserId = parseInt(tokenParts[tokenParts.length - 1]);
                
                // Set and persist access tokens and user ID
                localStorage.setItem('userId', newUserId);
                localStorage.setItem('accessToken', response.data.access_token);
                
                setAccessToken(response.data.access_token);
                setUserId(newUserId); 
                
                // CRITICAL CHANGE: Move to the profile setup screen first
                setFlowState('profile_setup');
            } else {
                setFormError('OTP verification failed.');
            }

        } catch (error) {
            console.error("Error verifying OTP:", error);
            setFormError('Invalid OTP or server error.');
        }
    };

    // CRITICAL FIX: Handles submitting Name and Profession (Mandatory Step) + Photo Upload (Optional)
    const handleProfileSetup = async () => {
        setFormError('');
        // 1. CRITICAL VALIDATION: Ensure Name and Profession are mandatory
        if (!name.trim() || !profession.trim()) {
            setFormError('Name and Profession are mandatory fields.');
            return;
        }

        try {
            // 2. Handle Photo Upload FIRST (Optional)
            if (profilePhoto) {
                const formData = new FormData();
                formData.append('file', profilePhoto);
                
                // Call the upload endpoint (profile_photo file_type)
                await axios.post(
                    `${API_BASE_URL}/identity/tier2/upload/${userId}?file_type=profile_photo`, 
                    formData, 
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'multipart/form-data',
                        },
                    }
                );
            }

            // 3. Submit the core profile data (Name, Profession)
            // This is executed only AFTER the optional photo upload succeeds or is skipped.
            await axios.post(`${API_BASE_URL}/user/update_core_profile/${userId}`, {
                name: name,
                profession: profession
            }, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            
            // 4. On success, proceed to the next step (Tier 2/Step 2)
            nextStep(); 

        } catch (error) {
            console.error("Error updating profile:", error);
            // This error should now only appear if the backend is down or the schema is fundamentally wrong.
            setFormError('Failed to save profile. Please check the backend connection.');
        }
    };


    const renderContent = () => {
        if (flowState === 'input_phone') {
            return (
                <div>
                    <h3 style={{ color: '#007bff' }}>1. Enter Phone Number</h3>
                    <input
                        type="tel"
                        placeholder="e.g., +919876543210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        style={inputStyle}
                    />
                    <button onClick={handleSendOtp} style={buttonStyle}>
                        Send OTP
                    </button>
                </div>
            );
        } else if (flowState === 'input_otp') {
            return (
                <div>
                    <h3 style={{ color: '#ffc107' }}>1. Verify OTP</h3>
                    <p>OTP sent to {phoneNumber}. Check your backend terminal for the debug code.</p>
                    <input
                        type="text"
                        placeholder="6-digit OTP"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        style={inputStyle}
                    />
                    <button onClick={handleVerifyOtp} style={buttonStyle}>
                        Verify & Continue
                    </button>
                </div>
            );
        } else if (flowState === 'profile_setup') {
            // --- NEW PROFILE SETUP VIEW (Mandatory Fields) ---
            return (
                <div>
                    <h3 style={{ color: '#007bff' }}>2. Complete Your Core Profile</h3>
                    <p>Name and Profession are **mandatory** to activate your Skill Wallet.</p>

                    {formError && <p style={{ color: 'red', fontWeight: 'bold' }}>{formError}</p>}

                    <input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={inputStyle}
                    />
                    <input
                        type="text"
                        placeholder="Profession / Primary Skill"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        style={inputStyle}
                    />
                    
                    {/* Profile Photo File Input (Optional) */}
                    <div style={{ margin: '15px 0', border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
                        <label htmlFor="profile-photo" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Profile Photo (Optional)</label>
                        <input
                            id="profile-photo"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setProfilePhoto(e.target.files[0])}
                            style={{ width: '100%' }}
                        />
                        {profilePhoto && <p style={{ fontSize: '0.8em', marginTop: '5px' }}>File selected: {profilePhoto.name}</p>}
                    </div>


                    <button 
                        onClick={handleProfileSetup} 
                        style={buttonStyle}
                    >
                        Save Profile & Continue to Tier 2
                    </button>
                </div>
            );
        }
    };


    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '450px', margin: 'auto' }}>
            {formError && <p style={{ color: 'red', fontWeight: 'bold' }}>{formError}</p>}
            {renderContent()}
        </div>
    );
}

export default StepIdentity;