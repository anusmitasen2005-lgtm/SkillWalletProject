
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Camera, Upload, Mic, Video, CheckCircle, AlertCircle, Play, Square, ArrowRight, X } from 'lucide-react';
import { VoiceHeader, VoiceControl, ActionButton, GuidanceArrow } from './components/VoiceUI';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

function StepWork({ userId, nextStep }) {
    const [subStep, setSubStep] = useState(0); // 0: Intro/Selection, 1: Camera Flow, 2: Story Intro, 3: Story Recording
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    // Work Proof State
    const [workFile, setWorkFile] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [recordingVideo, setRecordingVideo] = useState(false);
    const [openCvStatus, setOpenCvStatus] = useState("Initializing...");
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const videoChunksRef = useRef([]);

    // Skill Story State
    const [storyBlob, setStoryBlob] = useState(null);
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [storyPromptIndex, setStoryPromptIndex] = useState(0);
    const [storyMode, setStoryMode] = useState(null); // 'voice' or 'text'
    const [isReviewing, setIsReviewing] = useState(false);
    const [textAnswers, setTextAnswers] = useState({});
    const audioChunksRef = useRef([]);

    const storyPrompts = [
        "What were you asked to do?",
        "How did you do it?",
        "What tools did you use?",
        "Did you face any problems?"
    ];

    // --- UTILS ---
    const speak = (text) => {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    // --- WORK PROOF LOGIC ---

    const handleFileUpload = async (file, type) => {
        if (!file) return;
        setLoading(true);
        setMessage('Saving work proof...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            // Defaulting to work_video for generic work proof
            const endpoint = `${API_BASE_URL}/identity/tier2/upload/${userId}?file_type=${type}`;
            
            await axios.post(endpoint, formData, { 
                headers: { 'Content-Type': 'multipart/form-data' } 
            });

            setMessage('✅ Saved!');
            setWorkFile(file);
            setTimeout(() => {
                setMessage('');
                setSubStep(2); // Move to Skill Story
                speak("Great! Now, tell us the story of this work.");
            }, 1500);
        } catch (err) {
            console.error(err);
            setMessage('❌ Failed to save.');
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        setCameraActive(true);
        setSubStep(1);
        setOpenCvStatus("Initializing Smart Camera...");
        speak("Opening camera. Please allow access.");
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' },
                audio: true 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            
            // Simulate OpenCV Checks with Voice Prompts
            setTimeout(() => {
                setOpenCvStatus("🔍 Checking focus...");
                speak("Checking camera focus. Please hold steady.");
            }, 2000);

            setTimeout(() => {
                setOpenCvStatus("📐 Checking distance...");
                speak("Move a little closer to show the details.");
            }, 5000);

            setTimeout(() => {
                setOpenCvStatus("✅ Environment OK. Detecting tools...");
                speak("I can see your workspace. Make sure to show the full task.");
            }, 8000);

            setTimeout(() => {
                setOpenCvStatus("🎥 Ready to Record!");
                speak("Camera is ready. Press the red button when you start working.");
            }, 11000);

        } catch (err) {
            console.error("Camera error:", err);
            alert("Could not access camera.");
            setCameraActive(false);
            setSubStep(0);
        }
    };

    const startVideoRecording = () => {
        if (!videoRef.current?.srcObject) return;
        
        mediaRecorderRef.current = new MediaRecorder(videoRef.current.srcObject);
        videoChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) videoChunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
            // Simulate Post-Processing / Reuse Detection
            setOpenCvStatus("🛡️ Verifying authenticity...");
            speak("Verifying your work proof...");
            
            setTimeout(() => {
                 const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
                const file = new File([blob], `work_video_${Date.now()}.webm`, { type: 'video/webm' });
                
                // Simulate Reuse Check Result
                setOpenCvStatus("✅ Original Content Verified");
                speak("Work verified. Saving now.");
                
                setTimeout(() => {
                    handleFileUpload(file, 'work_video');
                    setCameraActive(false);
                    // Stop tracks
                    if (videoRef.current && videoRef.current.srcObject) {
                        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                    }
                }, 1500);
            }, 2000);
        };

        mediaRecorderRef.current.start();
        setRecordingVideo(true);
        speak("Recording started. Explain what you are doing if you like.");
    };

    const stopVideoRecording = () => {
        if (mediaRecorderRef.current && recordingVideo) {
            // Check duration (simulation)
            // In a real app we'd check timestamps. Here we just assume if they stop it's done.
            mediaRecorderRef.current.stop();
            setRecordingVideo(false);
        }
    };

    // --- SKILL STORY LOGIC ---

    const startAudioRecording = async () => {
        setStoryMode('voice');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setStoryBlob(blob);
                setIsReviewing(true); // Move to review instead of auto-save
            };

            mediaRecorderRef.current.start();
            setIsRecordingAudio(true);
            setStoryPromptIndex(0);
            speak(storyPrompts[0]);
        } catch (err) {
            console.error("Mic error:", err);
            alert("Could not access microphone.");
        }
    };

    const nextPrompt = () => {
        if (storyPromptIndex < storyPrompts.length - 1) {
            const nextIdx = storyPromptIndex + 1;
            setStoryPromptIndex(nextIdx);
            speak(storyPrompts[nextIdx]);
        } else {
            if (storyMode === 'voice') {
                stopAudioRecording();
            } else {
                setIsReviewing(true);
            }
        }
    };

    const stopAudioRecording = () => {
        if (mediaRecorderRef.current && isRecordingAudio) {
            mediaRecorderRef.current.stop();
            setIsRecordingAudio(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleTextAnswer = (text) => {
        setTextAnswers(prev => ({ ...prev, [storyPromptIndex]: text }));
    };

    const saveStory = async () => {
        setLoading(true);
        setMessage("Saving your story...");
        
        try {
            const formData = new FormData();
            
            if (storyMode === 'voice' && storyBlob) {
                 const file = new File([storyBlob], `skill_story_${Date.now()}.webm`, { type: 'audio/webm' });
                 formData.append('file', file);
            } else {
                // Combine text answers into a text file
                const fullStory = storyPrompts.map((p, i) => `Q: ${p}\nA: ${textAnswers[i] || ''}\n`).join('\n');
                const file = new File([fullStory], `skill_story_text_${Date.now()}.txt`, { type: 'text/plain' });
                formData.append('file', file);
            }

            await axios.post(`${API_BASE_URL}/identity/tier2/upload/${userId}?file_type=community_recording`, formData, {
                 headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage("✅ Story Saved!");
            setTimeout(() => {
                nextStep(); // Finish Step
            }, 1500);
        } catch (err) {
            console.error(err);
            setMessage("❌ Failed to save story.");
        } finally {
            setLoading(false);
        }
    };

    const retakeStory = () => {
        setStoryBlob(null);
        setIsReviewing(false);
        setStoryPromptIndex(0);
        setTextAnswers({});
        // Keep the mode selected, or reset it? Let's keep it.
        if (storyMode === 'voice') {
            startAudioRecording();
        }
    };

    // --- RENDERERS ---

    const renderCameraFlow = () => (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="relative flex-1 bg-gray-900">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-80" />
                
                {/* OpenCV Overlay Simulation */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-2 border-amber-400 rounded-lg relative opacity-70">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1"></div>
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-amber-400 opacity-50 animate-pulse"></div>
                    </div>
                </div>

                <div className="absolute top-10 left-0 right-0 text-center">
                    <span className="bg-black/60 text-amber-400 px-4 py-2 rounded-full font-mono text-sm border border-amber-400/30 backdrop-blur-md">
                        {openCvStatus}
                    </span>
                </div>
            </div>

            <div className="bg-black p-6 pb-10 flex flex-col items-center gap-4">
                {!recordingVideo ? (
                    <button 
                        onClick={startVideoRecording}
                        disabled={openCvStatus !== "🎥 Ready to Record!"}
                        className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${openCvStatus === "🎥 Ready to Record!" ? 'bg-red-600 scale-110 shadow-lg shadow-red-500/50' : 'bg-gray-600 opacity-50'}`}
                    >
                        <div className="w-16 h-16 bg-red-500 rounded-full animate-pulse"></div>
                    </button>
                ) : (
                    <div className="w-full flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2 text-white animate-pulse">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="font-mono">REC 00:05</span>
                        </div>
                        <button 
                            onClick={stopVideoRecording}
                            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent"
                        >
                            <div className="w-8 h-8 bg-red-600 rounded-sm"></div>
                        </button>
                    </div>
                )}
                
                <button onClick={() => {
                    stopVideoRecording();
                    setCameraActive(false);
                    setSubStep(0);
                    if(videoRef.current && videoRef.current.srcObject) {
                        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
                    }
                }} className="text-white text-sm underline mt-2">Cancel</button>
            </div>
        </div>
    );

    const renderStoryFlow = () => {
        // 1. Selection Screen (if not recording and not reviewing)
        if (!isRecordingAudio && !storyMode && !isReviewing) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <VoiceHeader 
                        title="Tell Your Story" 
                        step="Step 2" 
                        subtitle="Choose Format" 
                    />
                    
                    <div className="grid gap-6 w-full max-w-sm">
                        <button 
                            onClick={startAudioRecording}
                            className="bg-blue-50 border-2 border-blue-100 p-8 rounded-3xl flex flex-col items-center hover:bg-blue-100 hover:border-blue-300 transition-all group"
                        >
                            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform">
                                <Mic size={40} />
                            </div>
                            <h3 className="text-xl font-black text-blue-900">Record Voice</h3>
                            <p className="text-blue-600 text-sm font-medium">Speak naturally</p>
                        </button>

                        <button 
                            onClick={() => { setStoryMode('text'); setStoryPromptIndex(0); speak(storyPrompts[0]); }}
                            className="bg-gray-50 border-2 border-gray-100 p-8 rounded-3xl flex flex-col items-center hover:bg-gray-100 hover:border-gray-300 transition-all group"
                        >
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-gray-500 mb-4 shadow-md group-hover:scale-110 transition-transform">
                                <span className="text-3xl">⌨️</span>
                            </div>
                            <h3 className="text-xl font-black text-gray-800">Type Story</h3>
                            <p className="text-gray-500 text-sm font-medium">Write your answers</p>
                        </button>
                    </div>
                </div>
            );
        }

        // 2. Review Screen
        if (isReviewing) {
             return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in duration-300">
                    <VoiceHeader 
                        title="Review Your Story" 
                        step="Step 2" 
                        subtitle="Check & Submit" 
                    />
                    
                    <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-xl border border-gray-100 mb-8">
                        {storyMode === 'voice' && storyBlob ? (
                            <div className="text-center">
                                <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg animate-pulse">
                                    <Play size={40} fill="currentColor" />
                                </div>
                                <h3 className="font-bold text-gray-800 mb-2">Listen to your story</h3>
                                <audio controls src={URL.createObjectURL(storyBlob)} className="w-full mt-4" />
                            </div>
                        ) : (
                            <div className="text-left space-y-4 max-h-[40vh] overflow-y-auto">
                                <h3 className="font-bold text-gray-800 text-center mb-4">Your Written Story</h3>
                                {storyPrompts.map((p, i) => (
                                    <div key={i} className="bg-gray-50 p-4 rounded-xl">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">{p}</p>
                                        <p className="text-gray-800 font-medium">{textAnswers[i] || 'No answer'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4 w-full max-w-xs">
                        <ActionButton onClick={saveStory}>
                            Looks Good! Submit ✅
                        </ActionButton>
                        <button 
                            onClick={retakeStory}
                            className="text-gray-500 font-bold py-3 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Discard & Try Again ↺
                        </button>
                    </div>
                </div>
            );
        }

        // 3. Active Flow (Voice or Text)
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                 <VoiceHeader 
                    title={storyMode === 'voice' ? "Tell Your Story" : "Write Your Story"}
                    step="Step 2" 
                    subtitle={storyMode === 'voice' ? "Voice Recording" : "Text Input"}
                />

                <div className="text-center w-full max-w-md">
                    <div className="mb-8 p-6 bg-amber-50 rounded-2xl border-2 border-amber-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-200">
                            <div 
                                className="h-full bg-amber-500 transition-all duration-500"
                                style={{ width: `${((storyPromptIndex + 1) / storyPrompts.length) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-amber-600 font-bold uppercase text-xs mb-2">Question {storyPromptIndex + 1} of {storyPrompts.length}</p>
                        <h3 className="text-2xl font-black text-gray-800 leading-tight mb-4">
                            {storyPrompts[storyPromptIndex]}
                        </h3>

                        {storyMode === 'text' && (
                            <textarea
                                autoFocus
                                className="w-full p-4 rounded-xl border-2 border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none text-lg font-medium min-h-[120px]"
                                placeholder="Type your answer here..."
                                value={textAnswers[storyPromptIndex] || ''}
                                onChange={(e) => handleTextAnswer(e.target.value)}
                            ></textarea>
                        )}
                    </div>

                    {storyMode === 'voice' && (
                        <div className="mb-8 flex justify-center">
                            <div className="flex gap-1 items-end h-12">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="w-2 bg-red-400 rounded-full animate-music" style={{ height: '100%', animationDelay: `${i * 0.1}s` }}></div>
                                ))}
                            </div>
                        </div>
                    )}

                    <ActionButton onClick={nextPrompt}>
                        {storyPromptIndex < storyPrompts.length - 1 ? "Next Question ➔" : "Finish & Review 🏁"}
                    </ActionButton>
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-500 mb-4"></div>
            <p className="text-xl font-bold text-gray-700 animate-pulse">{message}</p>
        </div>
    );

    if (cameraActive) return renderCameraFlow();

    if (subStep === 2 || subStep === 3) return renderStoryFlow();

    return (
        <div className="p-6">
             <VoiceHeader 
                title="Show Your Work" 
                step="Step 1" 
                subtitle="Work Proof" 
            />

            <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
                <button 
                    onClick={startCamera}
                    className="group relative bg-white border-2 border-gray-100 rounded-3xl p-6 text-center hover:border-amber-400 hover:shadow-xl transition-all"
                >
                    <GuidanceArrow active={true} />
                    <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/50">
                        <Camera size={32} className="text-white" />
                    </div>
                    <h3 className="text-xl font-black text-gray-800 mb-2">Show Your Work</h3>
                    <p className="text-gray-500 text-sm mb-4 leading-relaxed">We will use your camera so you can show the work you have done with your own hands.</p>
                    <div className="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl inline-block shadow-md">
                        Open Camera
                    </div>
                </button>

                <div className="relative group">
                    <input 
                        type="file" 
                        accept="image/*,video/*" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => handleFileUpload(e.target.files[0], 'work_video')}
                    />
                    <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 flex items-center gap-4 hover:border-blue-400 hover:shadow-xl transition-all">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                            <Upload size={28} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-black text-gray-800">Upload File</h3>
                            <p className="text-gray-500 text-sm">Image, Video</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Voice Control for global instructions */}
            <VoiceControl 
                onSpeak={() => speak("Choose how to show your work. You can record a live video or upload a file.")}
                onListen={() => {}} 
                listening={false}
            />
        </div>
    );
}

export default StepWork;
