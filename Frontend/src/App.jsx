import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Home, BookOpen, Wallet, Briefcase, Mic, Languages, Camera } from 'lucide-react';

// Import Pages
import Login from "./Login";
import ProfileFlow from "./ProfileFlow";
import PublicProfile from './PublicProfile';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function App() {
    // --- ROUTING CHECK (Manual Router) ---
    const [publicHash, setPublicHash] = useState(null);

    useEffect(() => {
        const path = window.location.pathname;
        if (path.startsWith('/verify/')) {
            const hash = path.split('/verify/')[1];
            if (hash) setPublicHash(hash);
        }
    }, []);

    // If viewing public profile, return early
    if (publicHash) {
        return <PublicProfile walletHash={publicHash} />;
    }

    // --- Auth State ---
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState(null); 
    
    // --- Global Language State ---
    // Default to user's phone language if possible, else English
    const [language, setLanguage] = useState(navigator.language.startsWith('hi') ? 'hi' : 'en');
    
    // --- Helper: Format Indian Number ---
    const formatIndianNumber = (number) => {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        if (cleanNumber.length !== 10) {
            return { error: 'Please enter a valid 10-digit Indian mobile number.' };
        }
        return { formattedNumber: `+91${cleanNumber}` };
    };

    // --- Auth Logic: Send OTP ---
    const sendOtp = async () => {
        setLoading(true);
        setMessage('');
        const { formattedNumber, error } = formatIndianNumber(phoneNumber);
        if (error) { setMessage(error); setLoading(false); return; }

        try {
            await axios.post(`${API_BASE_URL}/auth/otp/send`, { phone_number: formattedNumber });
            setMessage('🟢 OTP sent! Check your backend terminal.');
        } catch (error) {
            setMessage(`OTP Send Failed. Check console.`);
        }
        setLoading(false);
    };

    // --- Auth Logic: Verify OTP ---
    const verifyOtp = async () => {
        setLoading(true);
        setMessage('');
        const { formattedNumber, error } = formatIndianNumber(phoneNumber);
        if (error) { setMessage(error); setLoading(false); return; }

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
                phone_number: formattedNumber,
                otp_code: otpCode,
            });
            
            const token = response.data.access_token;
            // Extract User ID from dummy token
            const userIdMatch = token.match(/for_(\d+)/); 
            const extractedUserId = userIdMatch ? parseInt(userIdMatch[1]) : null;

            if (extractedUserId) {
                setUserId(extractedUserId); 
                setIsLoggedIn(true); 
            } else {
                setMessage('Verification failed: Could not parse User ID.');
            }
        } catch (error) {
            setMessage('Verification Failed. Check backend.');
        }
        setLoading(false);
    };

    // --- RENDER ---
    if (!isLoggedIn) {
        return (
            <Login
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                otpCode={otpCode}
                setOtpCode={setOtpCode}
                sendOtp={sendOtp}
                verifyOtp={verifyOtp}
                loading={loading}
                message={message}
            />
        );
    }

    // --- MAIN APP LAYOUT (Once Logged In) ---
    // Using ProfileFlow to restore the Tier 1 / Tier 2 step-based design
    return <ProfileFlow language={language} setLanguage={setLanguage} />;
}

export default App;