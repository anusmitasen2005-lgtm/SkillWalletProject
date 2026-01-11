
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { VoiceInput, VoiceHeader, ActionButton } from './components/VoiceUI';
import { Briefcase, MapPin, Calendar, User, Camera } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

function StepIdentity({ nextStep, userId, onLogin }) {
  // Auth State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Profile State
  const [view, setView] = useState(userId ? 'profile' : 'auth'); // 'auth' or 'profile'
  
  // Wizard Step State: 0=Name, 1=Age, 2=State, 3=District, 4=Locality, 5=Profession
  const [currentStep, setCurrentStep] = useState(0);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (userId) setView('profile');
  }, [userId]);

  const [profileData, setProfileData] = useState({
    name: '',
    profession: '',
    age: '',
    state: '',
    district: '',
    local_area: '',
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // --- VOICE HELPERS ---
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const listen = (callback) => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN'; // Default to Indian English
      recognition.interimResults = false;
      
      setListening(true);
      
      recognition.onstart = () => {};
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        callback(transcript);
        setListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech error", event);
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();
    } else {
      alert("Voice input not supported in this browser.");
    }
  };

  // --- AUTH HANDLERS ---
  const sendOtp = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await axios.post(`${API_BASE_URL}/auth/otp/send`, { phone_number: phoneNumber });
      setIsOtpSent(true);
    } catch (err) {
      setAuthError('Failed to send OTP. Check console/network.');
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyOtp = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/otp/verify`, { 
        phone_number: phoneNumber, 
        otp_code: otpCode 
      });
      const uid = res.data.user_id || 1; 
      onLogin(uid, res.data.access_token);
      setView('profile');
    } catch (err) {
      setAuthError('Invalid OTP.');
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  // --- PROFILE HANDLERS ---
  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    
    // Upload immediately
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        // Use userId from prop
        await axios.post(`${API_BASE_URL}/identity/tier2/upload/${userId}?file_type=profile_photo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    } catch (err) {
        console.error("Photo upload failed", err);
        setProfileError("Failed to upload photo, but you can continue.");
    }
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    } else {
      saveProfile();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const saveProfile = async () => {
    // Combine location fields into local_area string for backend compatibility if needed, 
    // or send them separately if backend supports it.
    // The backend `CoreProfileUpdate` model supports state, district, local_area.
    
    setProfileLoading(true);
    setProfileError('');
    
    try {
        await axios.post(`${API_BASE_URL}/user/update_core_profile/${userId}`, {
            name: profileData.name,
            profession: profileData.profession,
            age: parseInt(profileData.age) || 0,
            state: profileData.state,
            district: profileData.district,
            local_area: profileData.local_area,
            // Date of birth is not collected in this flow yet, relying on Age
        });

        nextStep();
    } catch (err) {
        setProfileError('Failed to save profile. Please try again.');
        console.error(err);
    } finally {
        setProfileLoading(false);
    }
  };

  // --- RENDER WIZARD STEPS ---
  const renderStep = () => {
    switch (currentStep) {
      case 0: // NAME
        return (
          <>
             <VoiceHeader title="What is your name?" step="1 of 7" subtitle="Basic Info" />
             <div className="flex justify-center mb-6 text-amber-500"><User size={64} /></div>
             <VoiceInput 
                value={profileData.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                placeholder="Say your full name..."
                active={true}
                listening={listening}
                onSpeak={() => speak("Please say your full name")}
                onListen={() => listen((text) => {
                    handleProfileChange('name', text);
                    speak(`You said ${text}. Is this correct?`);
                })}
             />
          </>
        );
      case 1: // AGE
        return (
          <>
             <VoiceHeader title="How old are you?" step="2 of 6" subtitle="Basic Info" />
             <div className="flex justify-center mb-6 text-amber-500"><Calendar size={64} /></div>
             <VoiceInput 
                value={profileData.age}
                onChange={(e) => handleProfileChange('age', e.target.value)}
                placeholder="e.g. 25"
                type="number"
                active={true}
                listening={listening}
                onSpeak={() => speak("Say your age")}
                onListen={() => listen((text) => {
                    // Extract number from text
                    const num = text.match(/\d+/);
                    if (num) handleProfileChange('age', num[0]);
                })}
             />
          </>
        );
      case 2: // STATE
        return (
          <>
             <VoiceHeader title="Which State do you live in?" step="3 of 7" subtitle="Location" />
             <div className="flex justify-center mb-6 text-amber-500"><MapPin size={64} /></div>
             <VoiceInput 
                value={profileData.state}
                onChange={(e) => handleProfileChange('state', e.target.value)}
                placeholder="e.g. Maharashtra"
                active={true}
                listening={listening}
                onSpeak={() => speak("Which state do you live in?")}
                onListen={() => listen((text) => handleProfileChange('state', text))}
             />
          </>
        );
      case 3: // DISTRICT
        return (
          <>
             <VoiceHeader title="Which District?" step="4 of 7" subtitle="Location" />
             <div className="flex justify-center mb-6 text-amber-500"><MapPin size={64} /></div>
             <VoiceInput 
                value={profileData.district}
                onChange={(e) => handleProfileChange('district', e.target.value)}
                placeholder="e.g. Pune"
                active={true}
                listening={listening}
                onSpeak={() => speak("Which district is that in?")}
                onListen={() => listen((text) => handleProfileChange('district', text))}
             />
          </>
        );
      case 4: // LOCAL AREA
        return (
          <>
             <VoiceHeader title="Which Local Area?" step="5 of 7" subtitle="Location" />
             <div className="flex justify-center mb-6 text-amber-500"><MapPin size={64} /></div>
             <VoiceInput 
                value={profileData.local_area}
                onChange={(e) => handleProfileChange('local_area', e.target.value)}
                placeholder="e.g. Shivajinagar"
                active={true}
                listening={listening}
                onSpeak={() => speak("What is the name of your local area?")}
                onListen={() => listen((text) => handleProfileChange('local_area', text))}
             />
          </>
        );
      case 5: // PROFESSION
        return (
          <>
             <VoiceHeader title="What is your main skill?" step="6 of 7" subtitle="Work" />
             <div className="flex justify-center mb-6 text-amber-500"><Briefcase size={64} /></div>
             <VoiceInput 
                value={profileData.profession}
                onChange={(e) => handleProfileChange('profession', e.target.value)}
                placeholder="e.g. Carpenter"
                active={true}
                listening={listening}
                onSpeak={() => speak("Say your main work or skill")}
                onListen={() => listen((text) => handleProfileChange('profession', text))}
             />
             <div className="grid grid-cols-3 gap-2 mt-4 opacity-50">
                 {['Electrician', 'Plumber', 'Mason', 'Driver', 'Tailor', 'Cook'].map(job => (
                     <div key={job} className="text-xs border p-2 rounded text-center" onClick={() => handleProfileChange('profession', job)}>
                         {job}
                     </div>
                 ))}
             </div>
          </>
        );
      case 6: // PROFILE PHOTO
        return (
          <>
            <VoiceHeader title="Add a profile photo?" step="7 of 7" subtitle="Photo" />
            <div className="flex flex-col items-center justify-center mb-6">
                <div className="w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
                    {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <Camera size={40} className="text-gray-400" />
                    )}
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>
                <p className="text-xs text-gray-400 mt-2">Tap to upload</p>
            </div>
            
            <div className="flex gap-4 mt-4">
                <button 
                    onClick={() => saveProfile()} // Skip/Next acts as save
                    className="flex-1 py-3 text-gray-500 font-bold"
                >
                    Skip
                </button>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // --- AUTH VIEW ---
  if (view === 'auth') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-blue-800 mb-2">Welcome to Skill Wallet</h2>
        <p className="text-gray-500 mb-8">Your digital skill identity.</p>
        
        {!isOtpSent ? (
            <div className="space-y-4">
                <input 
                    className="w-full p-4 border border-gray-300 rounded-xl text-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Phone Number (+91...)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <button 
                    onClick={sendOtp} 
                    disabled={authLoading}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition"
                >
                    {authLoading ? "Sending..." : "Get Started"}
                </button>
            </div>
        ) : (
            <div className="space-y-4">
                <input 
                    className="w-full p-4 border border-gray-300 rounded-xl text-center text-2xl tracking-widest outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                />
                <button 
                    onClick={verifyOtp} 
                    disabled={authLoading}
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition"
                >
                    {authLoading ? "Verifying..." : "Verify Login"}
                </button>
            </div>
        )}
        {authError && <p className="text-red-500 mt-4">{authError}</p>}
      </div>
    );
  }

  // VIEW: WHO I AM (WIZARD)
  return (
    <div className="p-6 h-full flex flex-col justify-between min-h-[500px]">
        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center pt-8">
            {renderStep()}
        </div>

        {/* Navigation */}
        <div className="mt-8 space-y-3">
             {profileError && <p className="text-red-500 text-center mb-2">{profileError}</p>}

             <ActionButton onClick={handleNext} disabled={profileLoading}>
                 {currentStep === 6 ? (profileLoading ? "Creating Identity..." : "Finish & Continue") : "Next Step"}
             </ActionButton>
             
             {currentStep > 0 && (
                 <button 
                    onClick={handleBack}
                    className="w-full py-3 text-gray-400 font-bold hover:text-gray-600"
                 >
                     Go Back
                 </button>
             )}
        </div>
    </div>
  );
}

export default StepIdentity;
