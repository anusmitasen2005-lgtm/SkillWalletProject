import React, { useState } from 'react';
import axios from 'axios';
// NOTE: We are replacing the original 'Profile' with the new multi-step flow
// import Profile from './Profile'; 
import ProfileFlow from './ProfileFlow'; // <-- USING THE MULTI-STEP FLOW

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

function App() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState(null); 
    const [accessToken, setAccessToken] = useState(null); 
    

    // --- Core Formatting Logic (Reusable for both send and verify) ---
    const formatIndianNumber = (number) => {
        // 1. Remove all non-digits
        const cleanNumber = number.replace(/[^0-9]/g, '');

        // 2. Enforce 10-digit length (standard Indian mobile)
        if (cleanNumber.length !== 10) {
            return { error: 'Please enter a valid 10-digit Indian mobile number.' };
        }

        // 3. Automatically add the mandatory +91 prefix for the backend
        return { formattedNumber: `+91${cleanNumber}` };
    };
    // ------------------------------------------------------------------


    const sendOtp = async () => {
        setLoading(true);
        setMessage('');

        const { formattedNumber, error } = formatIndianNumber(phoneNumber);

        if (error) {
            setMessage(error);
            setLoading(false);
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/auth/otp/send`, { phone_number: formattedNumber });
            setMessage('🟢 OTP sent! Check your backend terminal for the code.');
        } catch (error) {
            console.error('OTP Send Error:', error);
            if (!error.response) {
                // Network error - backend not reachable
                setMessage('❌ Cannot connect to backend server. Please ensure the backend is running on http://127.0.0.1:8000');
            } else {
                const status = error.response?.status;
                const detail = error.response?.data?.detail || error.message;
                setMessage(`❌ OTP Send Failed (Status: ${status}): ${detail}`);
            }
        }
        setLoading(false);
    };

    const verifyOtp = async () => {
        setLoading(true);
        setMessage('');

        const { formattedNumber, error } = formatIndianNumber(phoneNumber);
        
        if (error) {
            setMessage(error);
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
                phone_number: formattedNumber, // Use the guaranteed identical format
                otp_code: otpCode,
            });
            
            // --- SUCCESS LOGIC: Extraction & State Update ---
            const token = response.data.access_token;
            // REGEX to safely extract the user ID from the DEBUG token string
            const userIdMatch = token.match(/for_(\d+)/); 
            const extractedUserId = userIdMatch ? parseInt(userIdMatch[1]) : null;

            if (extractedUserId) {
                setUserId(extractedUserId); 
                setAccessToken(token); 
                setIsLoggedIn(true); 
                console.log('Login Successful, Access Token:', token); 
                localStorage.setItem('userId', extractedUserId);
                localStorage.setItem('accessToken', token);

                // Initialize Skill Wallet immediately after successful OTP verification
                try {
                    const initResp = await axios.post(`${API_BASE_URL}/wallet/initialize`, {
                        phone_number: formattedNumber
                    });
                    if (initResp.data && initResp.data.wallet_hash) {
                        localStorage.setItem('walletHash', initResp.data.wallet_hash);
                    }
                } catch (walletErr) {
                    console.warn('Wallet initialization failed (non-critical):', walletErr);
                }
            } else {
                setMessage('Verification failed: Could not parse User ID from token.');
            }

        } catch (error) {
            const detail = error.response?.data?.detail;
            const status = error.response?.status;
            if (detail) {
                setMessage(`Verification Failed (Status: ${status}): ${detail}`);
            } else if (status) {
                setMessage(`Verification Failed (Status: ${status}). Please check console for details.`);
            } else {
                setMessage('Verification Failed. Check if the backend server is running.');
            }
        }
        setLoading(false);
    };

    // ----------------------------------------------------------------------
    // CONDITIONAL RENDERING: Shows Login Form OR Profile Dashboard
    // ----------------------------------------------------------------------
    return (
        <div className="app-container" style={{ textAlign: 'center', fontFamily: 'Arial' }}>
            {isLoggedIn ? (
                // If logged in, show the new gamified Profile Flow
                <ProfileFlow userId={userId} accessToken={accessToken} />
            ) : (
                // If not logged in, show the Login Form
                <>
                    <h1>Skill Wallet Login (Tier 1)</h1>
                    <p style={{ color: 'gray' }}>Enter 10-digit Indian Mobile Number</p>
                    <div style={{ marginBottom: '15px' }}>
                        <input
                            type="tel"
                            placeholder="Mobile Number (e.g., 9876543210)"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            style={{ padding: '10px', marginRight: '10px' }}
                            disabled={loading}
                        />
                        <button onClick={sendOtp} disabled={loading} style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none' }}>
                            {loading ? 'Sending...' : 'Get OTP'}
                        </button>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <input
                            type="text"
                            placeholder="Enter OTP Code"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            style={{ padding: '10px', marginRight: '10px' }}
                            disabled={loading}
                        />
                        <button onClick={verifyOtp} disabled={loading} style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none' }}>
                            {loading ? 'Verifying...' : 'Verify & Log In'}
                        </button>
                    </div>
                    {message && <p style={{ color: 'red' }}>{message}</p>}
                </>
            )}
        </div>
    );
}

export default App;
