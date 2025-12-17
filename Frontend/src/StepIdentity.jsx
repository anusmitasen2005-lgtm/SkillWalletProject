import React, { useState } from 'react';
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

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


function StepIdentity({ nextStep, setUserId, setAccessToken, userId, accessToken }) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const storedAccessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const initialFlow = storedUserId && storedAccessToken ? 'profile_setup' : 'input_phone';
    const [flowState, setFlowState] = useState(initialFlow);
    const [name, setName] = useState('');         
    const [profession, setProfession] = useState(''); 
    const [profilePhoto, setProfilePhoto] = useState(null); 
    const [formError, setFormError] = useState('');
    const initialUserId = userId ?? (storedUserId ? parseInt(storedUserId) : null);
    const initialAccessToken = accessToken ?? storedAccessToken;

    const normalizePhone = (input) => {
        const digits = String(input || '').replace(/\D/g, '');
        if (digits.length === 10) return `+91${digits}`;
        if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
        return input && String(input).startsWith('+') ? String(input) : `+${digits}`;
    };

    const handleSendOtp = async () => {
        setFormError('');
        try {
            const formatted = normalizePhone(phoneNumber);
            await axios.post(`${API_BASE_URL}/auth/otp/send`, { phone_number: formatted });
            setFlowState('input_otp');
        } catch (error) {
            console.error("Error sending OTP:", error);
            setFormError('Failed to send OTP. Check phone format or server status.');
        }
    };

    const handleVerifyOtp = async () => {
        setFormError('');
        try {
            const formatted = normalizePhone(phoneNumber);
            const response = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
                phone_number: formatted,
                otp_code: otpCode,
            });

            if (response.data.access_token) {
                const tokenParts = response.data.access_token.split('_');
                const newUserId = parseInt(tokenParts[tokenParts.length - 1]);
                
                // Set and persist access tokens and user ID
                localStorage.setItem('userId', newUserId);
                localStorage.setItem('accessToken', response.data.access_token);
                localStorage.setItem('access_token', response.data.access_token); // Ensure admin views use the same token
                
                setAccessToken(response.data.access_token);
                setUserId(newUserId); 

                // Auto-set owner profile and jump to Admin view if owner phone used
                if (normalizePhone(phoneNumber) === "+919106983613") {
                    try {
                        await axios.post(`${API_BASE_URL}/user/update_core_profile/${newUserId}`, {
                            name: "Anusmita Sen",
                            profession: "Owner",
                        });
                    } catch (e) {
                        console.warn('Owner profile auto-update failed (non-critical):', e);
                    }
                    localStorage.setItem('currentStep', "5");
                }
                // Initialize Skill Wallet immediately after successful OTP verification
                try {
                    const initResp = await axios.post(`${API_BASE_URL}/wallet/initialize`, {
                        phone_number: phoneNumber
                    });
                    if (initResp.data && initResp.data.wallet_hash) {
                        localStorage.setItem('walletHash', initResp.data.wallet_hash);
                    }
                } catch (walletErr) {
                    console.warn('Wallet initialization failed (non-critical):', walletErr);
                }
                
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
            const currentUserId = initialUserId || userId;
            const currentAccessToken = initialAccessToken || accessToken;
            
            // Validate userId is available
            if (!currentUserId) {
                setFormError('❌ User ID is missing. Please log in again.');
                return;
            }
            
            // 1. FIRST: Save the core profile data (Name, Profession)
            // This will fail fast if user doesn't exist, before attempting photo upload
            console.log(`Submitting profile for userId: ${currentUserId}`, { name, profession });
            
            await axios.post(`${API_BASE_URL}/user/update_core_profile/${currentUserId}`, {
                name: name,
                profession: profession
            }, {
                headers: { Authorization: `Bearer ${currentAccessToken}` }
            });
            
            // 2. THEN: Handle Photo Upload (Optional) - only if profile save succeeded
            if (profilePhoto) {
                try {
                    const formData = new FormData();
                    formData.append('file', profilePhoto);
                    
                    await axios.post(
                        `${API_BASE_URL}/identity/tier2/upload/${currentUserId}?file_type=profile_photo`,
                        formData, 
                        {
                            headers: {
                                Authorization: `Bearer ${currentAccessToken}`,
                                'Content-Type': 'multipart/form-data',
                            },
                        }
                    );
                } catch (photoError) {
                    // Photo upload is optional, so we don't fail the whole process
                    console.warn("Photo upload failed (non-critical):", photoError);
                    // Don't show error - profile was saved successfully
                }
            }
            
            nextStep();

        } catch (error) {
            console.error("Error updating profile:", error);
            const errorDetail = error.response?.data?.detail || error.message || 'Unknown error';
            const errorStatus = error.response?.status;
            
            if (!error.response) {
                setFormError('❌ Cannot connect to backend server. Please ensure the backend is running on http://127.0.0.1:8000');
            } else if (errorStatus === 404 && (errorDetail.includes('not found') || errorDetail.includes('User'))) {
                // User not found - database was likely reset, clear localStorage and redirect
                setFormError('❌ User session expired. Database was reset. Clearing session and reloading...');
                localStorage.clear();
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                return; // Don't proceed to nextStep
            } else {
                setFormError(`❌ Failed to save profile (Status: ${errorStatus}): ${errorDetail}`);
            }
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
