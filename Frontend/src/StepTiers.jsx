
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { VoiceHeader, ActionButton, VoiceControl } from './components/VoiceUI';
import { Camera, FileText, CheckCircle, X, Upload } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

function StepTiers({ userId, nextStep }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [activeDocType, setActiveDocType] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    
    // Docs state
    const [docs, setDocs] = useState({
        aadhaar: null,
        pan: null,
        training_letter: null,
        apprenticeship: null,
        local_authority: null
    });

    // --- VOICE HELPERS ---
    const speak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    };

    // --- CAMERA LOGIC ---
    const startCamera = async (docType) => {
        setActiveDocType(docType);
        setCameraOpen(true);
        speak("Keep the paper inside the box.");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            alert("Could not access camera.");
            setCameraOpen(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setCameraOpen(false);
        setActiveDocType(null);
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            
            canvas.toBlob(blob => {
                const file = new File([blob], `${activeDocType}_${Date.now()}.jpg`, { type: 'image/jpeg' });
                handleFileChange(file, activeDocType);
                stopCamera();
            }, 'image/jpeg', 0.8);
        }
    };

    const handleFileChange = async (file, docType) => {
        if (file) {
            setDocs(prev => ({ ...prev, [docType]: file }));
            await uploadDoc(docType, file);
        }
    };

    const uploadDoc = async (docType, file) => {
        setLoading(true);
        setMessage(`Uploading ${docType}...`);
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const backendFileTypeMap = {
                aadhaar: 'aadhaar',
                pan: 'pan_card',
                training_letter: 'training_letter',
                apprenticeship: 'apprenticeship_proof',
                local_authority: 'local_authority_proof'
            };

            await axios.post(
                `${API_BASE_URL}/identity/tier2/upload/${userId}?file_type=${backendFileTypeMap[docType]}`, 
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            setMessage(`✅ ${docType.replace('_', ' ')} uploaded!`);
            speak(`${docType.replace('_', ' ')} saved.`);
        } catch (err) {
            console.error(err);
            setMessage(`❌ Failed to upload ${docType}.`);
        } finally {
            setLoading(false);
        }
    };

    // --- COMPONENT: DOC CARD ---
    const DocCard = ({ label, type, colorClass, icon }) => (
        <div className={`p-4 rounded-2xl border-2 ${colorClass} relative overflow-hidden transition-all active:scale-95 shadow-sm mb-4`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-white rounded-full shadow-sm">{icon}</span>
                    <div>
                        <h4 className="font-bold text-gray-800">{label}</h4>
                        {docs[type] && <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle size={12}/> Uploaded</span>}
                    </div>
                </div>
                {/* Voice Controls (Mic for explanation - mocked for now) */}
                <VoiceControl 
                    onSpeak={() => speak(`This is for ${label}. You can take a photo or upload a file.`)}
                    onListen={() => speak("Listening...")} 
                    listening={false}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => startCamera(type)}
                    className="bg-white py-3 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 font-bold text-gray-600 hover:border-amber-400 hover:text-amber-500 transition-colors"
                >
                    <Camera size={20} />
                    <span className="text-sm">{docs[type] ? "Retake" : "Camera"}</span>
                </button>

                <div className="relative">
                    <input 
                        type="file"
                        accept="image/*,application/pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => handleFileChange(e.target.files[0], type)}
                    />
                    <button 
                        className="w-full h-full bg-white py-3 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 font-bold text-gray-600 hover:border-blue-400 hover:text-blue-500 transition-colors"
                    >
                        <Upload size={20} />
                        <span className="text-sm">Upload File</span>
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 relative min-h-screen pb-24">
            <VoiceHeader title="Trusted Identity" step="2 of 3" subtitle="Identity Proofs" />
            
            <div className="space-y-8">
                {/* TIER 2 SECTION (Green) */}
                <div>
                    <h3 className="font-bold text-gray-500 mb-4 uppercase tracking-wider text-xs ml-1">Tier 2: Government ID (Green)</h3>
                    <DocCard label="Aadhaar Card" type="aadhaar" colorClass="bg-green-50 border-green-100" icon="🆔" />
                    <DocCard label="PAN Card" type="pan" colorClass="bg-green-50 border-green-100" icon="💳" />
                </div>

                {/* TIER 3 SECTION (Grey) */}
                <div>
                    <h3 className="font-bold text-gray-500 mb-4 uppercase tracking-wider text-xs ml-1">Tier 3: Extra Proof (Grey - Optional)</h3>
                    <DocCard label="Training Letter" type="training_letter" colorClass="bg-gray-50 border-gray-100" icon="📜" />
                    <DocCard label="Apprenticeship" type="apprenticeship" colorClass="bg-gray-50 border-gray-100" icon="🛠️" />
                    <DocCard label="Local Authority" type="local_authority" colorClass="bg-gray-50 border-gray-100" icon="🏛️" />
                </div>
            </div>

            {/* MESSAGE TOAST */}
            {message && (
                <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl font-bold z-50">
                    {message}
                </div>
            )}

            {/* FOOTER ACTIONS */}
            <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-100 z-10">
                <ActionButton onClick={nextStep} disabled={loading}>
                    Continue
                </ActionButton>
            </div>

            {/* CAMERA OVERLAY */}
            {cameraOpen && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col">
                    <div className="relative flex-1">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Overlay Box */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-3/4 aspect-[3/2] border-4 border-white/50 rounded-xl relative">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1"></div>
                            </div>
                        </div>
                        
                        <button onClick={stopCamera} className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full">
                            <X size={32} />
                        </button>
                    </div>
                    
                    <div className="h-32 bg-black flex items-center justify-center gap-8">
                        <button onClick={captureImage} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg flex items-center justify-center active:scale-95 transition-transform">
                            <div className="w-16 h-16 bg-white rounded-full border-2 border-black"></div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StepTiers;
