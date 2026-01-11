import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const AddWorkProofFlow = ({ userId, onClose, onComplete }) => {
    const [step, setStep] = useState('INTRO'); // INTRO, CAMERA, REVIEW_PHOTO, AUDIO_INTRO, RECORDING, REVIEW_AUDIO, SUBMITTING, SUCCESS
    const [mediaStream, setMediaStream] = useState(null);
    const [capturedImageBlob, setCapturedImageBlob] = useState(null);
    const [capturedImageUrl, setCapturedImageUrl] = useState(null);
    const [fileType, setFileType] = useState('image'); // 'image' or 'video'
    const [storyMode, setStoryMode] = useState('voice'); // 'voice' or 'text'
    const [textStory, setTextStory] = useState('');
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [uploadProgress, setUploadProgress] = useState(0);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const timerRef = useRef(null);

    // --- Cleanup on unmount ---
    useEffect(() => {
        return () => {
            stopCamera();
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
        };
    }, []);

    const stopCamera = () => {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            setMediaStream(null);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        setFileType(isVideo ? 'video' : 'image');
        setCapturedImageBlob(file);
        setCapturedImageUrl(URL.createObjectURL(file));
        setStep('REVIEW_PHOTO');
    };

    // --- Step 1: Permission & Intro ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } // Prefer back camera
            });
            setMediaStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setStep('CAMERA');
        } catch (err) {
            console.error("Camera error:", err);
            alert("We need camera access to see your work. Please allow it in settings.");
        }
    };

    // --- Step 2: Camera Capture ---
    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            // Set canvas size to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to blob
            canvas.toBlob((blob) => {
                setCapturedImageBlob(blob);
                setCapturedImageUrl(URL.createObjectURL(blob));
                stopCamera(); // Stop stream to save battery/cpu
                setStep('REVIEW_PHOTO');
            }, 'image/jpeg', 0.85);
        }
    };

    const retakePhoto = () => {
        setCapturedImageBlob(null);
        setCapturedImageUrl(null);
        setStep('INTRO');
    };

    // --- Step 3: Audio Recording ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                setStep('REVIEW_AUDIO');
                
                // Stop tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setStep('RECORDING');

            // Timer
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Mic error:", err);
            alert("We need microphone access to hear your story.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const retakeAudio = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setStep('VOICE_INSTRUCTIONS');
    };

    // --- Step 4: Submit ---
    const submitProof = async () => {
        setStep('SUBMITTING');
        try {
            // 1. Upload Work Evidence (Image or Video)
            const imageFormData = new FormData();
            const ext = fileType === 'video' ? 'webm' : 'jpg';
            imageFormData.append('file', capturedImageBlob, `work_proof_${Date.now()}.${ext}`);
            
            const imgRes = await axios.post(
                `${API_BASE_URL}/identity/tier2/upload/${userId}?file_type=work_evidence`, 
                imageFormData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            
            const imagePath = imgRes.data.file_path;
            setUploadProgress(40);

            // 2. Upload Story (Audio or Text)
            const storyFormData = new FormData();
            let storyPath = null;

            if (storyMode === 'voice' && audioBlob) {
                storyFormData.append('file', audioBlob, `skill_story_${Date.now()}.webm`);
                const audioRes = await axios.post(
                    `${API_BASE_URL}/identity/tier2/upload/${userId}?file_type=work_story`, 
                    storyFormData,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );
                storyPath = audioRes.data.file_path;
            } else if (storyMode === 'text' && textStory) {
                const textBlob = new Blob([textStory], { type: 'text/plain' });
                storyFormData.append('file', textBlob, `skill_story_${Date.now()}.txt`);
                const textRes = await axios.post(
                    `${API_BASE_URL}/identity/tier2/upload/${userId}?file_type=work_story`, 
                    storyFormData,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );
                storyPath = textRes.data.file_path;
            }
            
            setUploadProgress(80);

            // 3. Submit Metadata
            await axios.post(`${API_BASE_URL}/work/submit/${userId}`, {
                wallet_hash: "manual_entry_hash",
                skill_name: "Manual Work Entry", 
                image_url: imagePath,
                audio_file_url: storyPath, // This field name might be misleading if it's text, but backend probably treats it as a file path
                language_code: "en", 
                description: storyMode === 'text' ? textStory : "Voice recorded work proof"
            });
            
            setUploadProgress(100);
            setStep('SUCCESS');
            setTimeout(() => {
                onComplete();
            }, 2000);

        } catch (err) {
            console.error("Submission failed:", err);
            const errorMsg = err.response?.data?.detail || err.message || "Unknown error";
            alert(`Failed to save: ${errorMsg}. Please try again.`);
            setStep('REVIEW_AUDIO');
        }
    };

    // --- Render Helpers ---
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col text-white overflow-hidden">
            {/* Header / Close */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                <h2 className="text-lg font-bold tracking-wide">Add Work Proof</h2>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                    ✕
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full">
                
                {/* 1. INTRO */}
                {step === 'INTRO' && (
                    <div className="p-6 text-center w-full max-w-md animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-4 overflow-y-auto max-h-full">
                        
                        <h1 className="text-xl font-bold mb-2">Add Work Proof</h1>
                        
                        {/* Option 1: Camera */}
                        <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg shadow-blue-900/50">
                                📷
                            </div>
                            <h2 className="text-xl font-bold mb-2">Show Your Work</h2>
                            <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                                We will use your camera so you can show the work you have done with your own hands.
                            </p>
                            <button 
                                onClick={startCamera}
                                className="w-full py-3 bg-white text-blue-900 rounded-xl font-bold text-lg hover:bg-gray-100 transition-transform active:scale-95 shadow-lg"
                            >
                                Open Camera
                            </button>
                        </div>

                        <div className="flex items-center gap-4 text-gray-500">
                            <div className="h-[1px] bg-gray-700 flex-1"></div>
                            <span className="text-xs font-bold uppercase">OR</span>
                            <div className="h-[1px] bg-gray-700 flex-1"></div>
                        </div>

                        {/* Option 2: Upload */}
                        <div className="relative bg-gray-800 rounded-3xl p-6 border border-gray-700 group hover:border-gray-500 transition-colors">
                             <input 
                                type="file" 
                                accept="image/*,video/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleFileUpload}
                            />
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-2xl group-hover:bg-gray-600 transition-colors">
                                    📤
                                </div>
                                <div className="text-left flex-1">
                                    <h2 className="text-lg font-bold">Upload File</h2>
                                    <p className="text-gray-400 text-xs">
                                        Image, Video
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. CAMERA */}
                {step === 'CAMERA' && (
                    <div className="relative w-full h-full flex flex-col bg-black">
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="flex-1 w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Overlays */}
                        <div className="absolute inset-0 pointer-events-none border-[1px] border-white/30 m-4 rounded-3xl flex flex-col justify-between p-6">
                            <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl self-center text-center">
                                <p className="font-bold text-lg">Show your completed work</p>
                                <p className="text-sm text-gray-300">Move slowly. Ensure good light.</p>
                            </div>
                        </div>

                        {/* Capture Button */}
                        <div className="absolute bottom-10 left-0 right-0 flex justify-center pb-safe">
                            <button 
                                onClick={capturePhoto}
                                className="w-20 h-20 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all active:scale-90"
                            >
                                <div className="w-16 h-16 bg-white rounded-full"></div>
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. REVIEW PHOTO */}
                {step === 'REVIEW_PHOTO' && (
                    <div className="w-full h-full flex flex-col bg-black">
                        {fileType === 'video' ? (
                            <video src={capturedImageUrl} controls className="flex-1 w-full h-full object-contain" />
                        ) : (
                            <img src={capturedImageUrl} alt="Captured" className="flex-1 w-full h-full object-contain" />
                        )}
                        
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex gap-4">
                            <button 
                                onClick={retakePhoto}
                                className="flex-1 py-4 bg-gray-800 rounded-xl font-bold text-gray-300 hover:bg-gray-700"
                            >
                                Retake
                            </button>
                            <button 
                                onClick={() => setStep('AUDIO_INTRO')}
                                className="flex-1 py-4 bg-blue-600 rounded-xl font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-900/50"
                            >
                                Looks Good
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. STORY SELECTION */}
                {step === 'AUDIO_INTRO' && (
                    <div className="p-8 text-center max-w-sm animate-in fade-in slide-in-from-right-8 w-full">
                         <h1 className="text-2xl font-bold mb-2">Tell Your Story</h1>
                         <p className="text-gray-300 mb-8 text-sm">How do you want to explain your work?</p>
                         
                         <div className="grid gap-4 w-full">
                            <button 
                                onClick={() => {
                                    setStoryMode('voice');
                                    setStep('VOICE_INSTRUCTIONS');
                                }}
                                className="bg-purple-900/50 border border-purple-500/30 p-6 rounded-2xl flex flex-col items-center hover:bg-purple-900/80 transition-all group"
                            >
                                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-3xl shadow-lg mb-3 group-hover:scale-110 transition-transform">
                                    🎙️
                                </div>
                                <h3 className="text-lg font-bold">Record Voice</h3>
                            </button>

                            <button 
                                onClick={() => {
                                    setStoryMode('text');
                                    setStep('TEXT_INPUT');
                                }}
                                className="bg-gray-800 border border-gray-700 p-6 rounded-2xl flex flex-col items-center hover:bg-gray-700 transition-all group"
                            >
                                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-3xl shadow-lg mb-3 group-hover:scale-110 transition-transform">
                                    ✍️
                                </div>
                                <h3 className="text-lg font-bold">Type Story</h3>
                            </button>
                         </div>
                    </div>
                )}

                {/* 4b. VOICE INSTRUCTIONS */}
                {step === 'VOICE_INSTRUCTIONS' && (
                    <div className="p-8 text-center max-w-sm animate-in fade-in slide-in-from-right-8">
                        <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-xl shadow-purple-900/50">
                            🎙️
                        </div>
                        <h1 className="text-2xl font-bold mb-4">Record Audio</h1>
                        <p className="text-gray-300 mb-8 text-lg leading-relaxed">
                            Explain what you did in your own words. Just speak naturally.
                        </p>
                        <button 
                            onClick={startRecording}
                            className="w-full py-4 bg-white text-purple-900 rounded-2xl font-bold text-xl hover:bg-gray-100 transition-transform active:scale-95 shadow-lg"
                        >
                            Start Recording
                        </button>
                        <button 
                            onClick={() => setStep('AUDIO_INTRO')}
                            className="mt-4 text-gray-400 text-sm hover:text-white"
                        >
                            Back
                        </button>
                    </div>
                )}

                {/* 4c. TEXT INPUT */}
                {step === 'TEXT_INPUT' && (
                    <div className="p-6 w-full max-w-md animate-in fade-in h-full flex flex-col">
                        <h1 className="text-xl font-bold mb-4 text-center">Write Your Story</h1>
                        
                        <textarea
                            className="flex-1 w-full bg-gray-800 border-2 border-gray-700 rounded-2xl p-4 text-white text-lg focus:border-purple-500 outline-none resize-none mb-4"
                            placeholder="I built this using..."
                            value={textStory}
                            onChange={(e) => setTextStory(e.target.value)}
                        ></textarea>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setStep('AUDIO_INTRO')}
                                className="flex-1 py-4 bg-gray-800 rounded-xl font-bold text-gray-300 hover:bg-gray-700"
                            >
                                Back
                            </button>
                            <button 
                                onClick={() => setStep('REVIEW_AUDIO')}
                                disabled={!textStory.trim()}
                                className={`flex-1 py-4 rounded-xl font-bold text-white shadow-lg transition-all ${!textStory.trim() ? 'bg-gray-600 opacity-50' : 'bg-purple-600 hover:bg-purple-500'}`}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}

                {/* 5. RECORDING */}
                {step === 'RECORDING' && (
                    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-purple-900 to-black">
                        <div className="mb-8 text-6xl font-black tracking-widest tabular-nums animate-pulse text-white">
                            {formatTime(recordingTime)}
                        </div>
                        
                        <div className="w-full max-w-xs h-32 flex items-center justify-center gap-1 mb-12">
                            {/* Fake visualizer bars */}
                            {[...Array(10)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className="w-3 bg-white/80 rounded-full animate-bounce"
                                    style={{ 
                                        height: `${Math.random() * 100}%`,
                                        animationDuration: `${0.5 + Math.random() * 0.5}s`
                                    }} 
                                />
                            ))}
                        </div>

                        <p className="text-purple-200 mb-8 text-center px-6">
                            "I built this wall using..."<br/>
                            "I fixed the wiring by..."
                        </p>

                        <button 
                            onClick={stopRecording}
                            className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center shadow-2xl shadow-red-900/50 hover:scale-105 transition-transform"
                        >
                            <div className="w-8 h-8 bg-white rounded-md"></div>
                        </button>
                        <p className="mt-4 text-sm font-bold uppercase tracking-widest text-red-400">Tap to Stop</p>
                    </div>
                )}

                {/* 6. REVIEW STORY */}
                {step === 'REVIEW_AUDIO' && (
                    <div className="p-8 text-center max-w-sm w-full animate-in fade-in">
                        <h2 className="text-xl font-bold mb-8">Ready to Submit?</h2>
                        
                        <div className="bg-gray-800 rounded-2xl p-6 mb-8 text-left">
                            <p className="font-bold text-white mb-2">Your Skill Story</p>
                            
                            {storyMode === 'voice' ? (
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => {
                                            const audio = new Audio(audioUrl);
                                            audio.play();
                                        }}
                                        className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black text-xl pl-1 shrink-0"
                                    >
                                        ▶
                                    </button>
                                    <p className="text-sm text-gray-400">{formatTime(recordingTime)} • Voice Note</p>
                                </div>
                            ) : (
                                <div className="max-h-32 overflow-y-auto bg-black/20 p-3 rounded-lg">
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{textStory}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-4">
                            <button 
                                onClick={submitProof}
                                className="w-full py-4 bg-green-600 rounded-2xl font-bold text-xl text-white shadow-lg hover:bg-green-500"
                            >
                                Save Work Proof
                            </button>
                            <button 
                                onClick={() => {
                                    if(storyMode === 'voice') retakeAudio();
                                    else setStep('TEXT_INPUT');
                                }}
                                className="text-gray-400 py-2 hover:text-white"
                            >
                                {storyMode === 'voice' ? "Record Again" : "Edit Story"}
                            </button>
                        </div>
                    </div>
                )}

                {/* 7. SUBMITTING */}
                {step === 'SUBMITTING' && (
                    <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <h2 className="text-2xl font-bold">Saving...</h2>
                        <p className="text-blue-300 mt-2">{uploadProgress}% Complete</p>
                    </div>
                )}

                {/* 8. SUCCESS */}
                {step === 'SUCCESS' && (
                    <div className="text-center animate-in zoom-in duration-300">
                        <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-6xl shadow-2xl shadow-green-900/50">
                            ✓
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Saved!</h1>
                        <p className="text-gray-300">Your work has been added to your wallet.</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AddWorkProofFlow;
