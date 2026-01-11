import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Mic, Send, X, Volume2, User, Shield, MoreVertical } from 'lucide-react';

const Chatbot = ({ 
    mode = 'live', // 'live' or 'recorded'
    teacherName = 'Instructor',
    onClose,
    isLive = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [showRules, setShowRules] = useState(true);
    const [rulesAgreed, setRulesAgreed] = useState(false);
    const messagesEndRef = useRef(null);

    // Initial Welcome Voice
    useEffect(() => {
        if (isOpen && rulesAgreed) {
            const text = mode === 'live' 
                ? "You can type or speak your question. Please ask only class-related doubts."
                : "You can ask questions. The teacher will reply when available.";
            speak(text);
        }
    }, [isOpen, rulesAgreed, mode]);

    const speak = (text) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    const handleSend = () => {
        if (!inputText.trim()) return;

        const newMessage = {
            id: Date.now(),
            text: inputText,
            sender: 'student',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setInputText('');
        scrollToBottom();

        // Simulate Teacher Response (Mock)
        if (mode === 'live') {
            setTimeout(() => {
                const reply = {
                    id: Date.now() + 1,
                    text: "That's a great question! I am explaining it now.",
                    sender: 'teacher',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, reply]);
                scrollToBottom();
                if (navigator.vibrate) navigator.vibrate(200);
            }, 3000);
        } else {
             setTimeout(() => {
                const reply = {
                    id: Date.now() + 1,
                    text: "Waiting for teacher response...",
                    sender: 'system',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, reply]);
                scrollToBottom();
            }, 1000);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice input not supported in this browser.");
            return;
        }
        
        setIsListening(true);
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'en-US'; // Default to English for now, could be dynamic
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputText(transcript);
            setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    // Screen 4: Rules Modal
    if (isOpen && !rulesAgreed) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Shield className="text-blue-600" /> Chat Rules
                    </h2>
                    
                    <div className="space-y-4 mb-6">
                        {[
                            "Ask only about this class.",
                            "Be respectful to the teacher.",
                            "Do not share phone numbers.",
                            "Your messages are visible to the teacher."
                        ].map((rule, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                <p className="text-gray-700 text-sm">{rule}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 mb-6 p-3 bg-blue-50 rounded-lg">
                        <input type="checkbox" id="agree" className="w-5 h-5 text-blue-600 rounded" />
                        <label htmlFor="agree" className="text-sm font-bold text-blue-900">I understand</label>
                    </div>

                    <button 
                        onClick={() => setRulesAgreed(true)}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    }

    // Collapsed State (Floating Button)
    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 z-40 animate-bounce-subtle"
            >
                <MessageCircle size={24} />
                <span className="font-bold pr-2">Ask Doubt</span>
            </button>
        );
    }

    // Expanded Chat Panel
    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
                <div>
                    <h3 className="font-bold text-gray-800">
                        {mode === 'live' ? 'Ask Your Teacher' : 'Ask the Teacher (Offline)'}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <User size={12} /> {teacherName}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => speak(mode === 'live' ? "You can type or speak your question." : "Ask questions here.")} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full">
                        <Volume2 size={20} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm text-gray-400">No questions yet. Ask something!</p>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-3 ${
                            msg.sender === 'student' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                        }`}>
                            {msg.sender === 'teacher' && (
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded">TEACHER</span>
                                </div>
                            )}
                            <p className="text-sm">{msg.text}</p>
                            <span className={`text-[10px] block mt-1 ${msg.sender === 'student' ? 'text-blue-200' : 'text-gray-400'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                
                {/* System Message for Pause */}
                {mode === 'live' && messages.length > 0 && messages[messages.length-1].sender === 'teacher' && (
                    <div className="flex justify-center my-4">
                        <span className="bg-yellow-50 text-yellow-700 text-xs px-3 py-1 rounded-full border border-yellow-100 flex items-center gap-1 animate-pulse">
                            ✋ Teacher is explaining your question live
                        </span>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Safety Footer */}
            <div className="bg-gray-50 px-4 py-1 flex justify-center border-t border-gray-100">
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Shield size={10} /> Messages are monitored for safety
                </p>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                {isListening ? (
                    <div className="flex flex-col items-center py-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center animate-pulse mb-2">
                            <Mic size={32} className="text-red-600" />
                        </div>
                        <p className="text-sm font-bold text-gray-600">Listening...</p>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button 
                            onClick={startListening}
                            className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            <Mic size={20} />
                        </button>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={mode === 'live' ? "Type your question here..." : "Ask a question..."}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!inputText.trim()}
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chatbot;
