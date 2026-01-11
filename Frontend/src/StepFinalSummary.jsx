
import React, { useState, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function StepFinalSummary({ userId, nextStep }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState('');
    const [skill, setSkill] = useState('Pottery');

    const submitWork = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/work/submit/${userId}`, {
                skill_name: skill,
                image_url: 'uploaded_proof.jpg',
                audio_file_url: audioUrl || 'voice_story.mp3',
                language_code: 'hi',
            });
            setMessage(`🎖️ Token ${response.data.skill_token || 'SW-XM24'} Minted!`);
            setTimeout(nextStep, 2500);
        } catch (error) {
            setMessage('Minting failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-8 bg-white rounded-3xl shadow-2xl border border-indigo-50">
            <div className="text-center mb-10">
                <div className="inline-block p-3 bg-indigo-100 rounded-full mb-4">
                    <span className="text-3xl">🚀</span>
                </div>
                <h2 className="text-3xl font-black text-indigo-900">Step 4: Mint Your Skill Token</h2>
                <p className="text-gray-500">Record your story and finalize your Skill Wallet.</p>
            </div>

            <div className="space-y-8">
                {/* Skill Selection */}
                <div className="bg-gray-50 p-6 rounded-2xl">
                    <label className="block text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wider">Target Skill</label>
                    <select 
                        value={skill} 
                        onChange={(e) => setSkill(e.target.value)}
                        className="w-full p-4 bg-white border-2 border-indigo-100 rounded-xl font-bold text-indigo-700 focus:border-indigo-500 outline-none"
                    >
                        {['Pottery', 'Carpentry', 'Weaving', 'Welder', 'Electrician'].map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>

                {/* Voice Recorder UI */}
                <div className="border-2 border-dashed border-indigo-200 p-8 rounded-3xl text-center">
                    <h4 className="font-bold text-gray-700 mb-4">Voice Skill Story</h4>
                    <button 
                        onClick={() => setIsRecording(!isRecording)}
                        className={`w-20 h-20 rounded-full mb-4 flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200'}`}
                    >
                        <span className="text-white text-2xl">{isRecording ? '⏹️' : '🎤'}</span>
                    </button>
                    <p className="text-sm font-medium text-gray-500">
                        {isRecording ? "Recording... Talk about your experience" : "Click to record your story"}
                    </p>
                </div>

                {message && (
                    <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl text-center">
                        <p className="text-emerald-700 font-black">{message}</p>
                    </div>
                )}

                <button 
                    onClick={submitWork}
                    disabled={loading}
                    className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xl rounded-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                >
                    {loading ? 'AUDITING SKILL...' : 'MINT SKILL TOKEN'}
                </button>
            </div>
        </div>
    );
}

export default StepFinalSummary;