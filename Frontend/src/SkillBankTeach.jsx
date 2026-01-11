import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, ArrowRight, DollarSign, Video, FileText, Calendar, Mic, Volume2, Users, Shield, AlertTriangle, MessageSquare, Upload, Smartphone, Globe, Wallet, CreditCard, ChevronRight } from 'lucide-react';
import axios from 'axios';
import TeacherChatDashboard from './components/TeacherChatDashboard';
import { InstructionSpeaker } from './components/VoiceHelpers';

export default function SkillBankTeach({ userId, onBack, language = 'en', hasUploaded, onSuccess }) {
    // Initial State Logic: If user has uploaded before, go to dashboard. Else start at entry screen.
    const [step, setStep] = useState(hasUploaded ? 'dashboard' : 'entry'); 
    // Steps: entry, guidelines, payment, payment_success, create_type, create_details, dashboard
    
    const [createType, setCreateType] = useState(null); // video, document, live
    const [loading, setLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showChatDashboard, setShowChatDashboard] = useState(false);
    
    // Real Dashboard Data
    const [dashboardData, setDashboardData] = useState({
        stats: { total_students: 0, total_videos: 0, live_scheduled: 0, earnings: 0 },
        videos: [],
        documents: [],
        live_classes: []
    });

    useEffect(() => {
        // Fetch dashboard data if user is a teacher (or if on dashboard step)
        if ((hasUploaded || step === 'dashboard') && userId) {
            axios.get(`http://localhost:8000/api/v1/teaching/dashboard/${userId}`)
                .then(res => setDashboardData(res.data))
                .catch(err => console.error("Failed to fetch teaching stats", err));
        }
    }, [hasUploaded, userId, step]);

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState('upi'); // upi, card, netbanking, wallet
    
    // Guidelines State
    const [guidelinesAgreed, setGuidelinesAgreed] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Construction',
        language: 'English',
        difficulty: 'Beginner',
        duration: '',
        safetyAgreed: false,
        file: null
    });

    // Translation Object (Exact User Script)
    const t = {
        en: {
            // Screen 3
            teachYourSkill: "Teach Your Skill",
            earnRespect: "Earn respect and income by teaching what you know.",
            uploadContent: "Upload Teaching Content",
            uploadDesc: "Upload videos or documents to teach your skill.",
            conductLive: "Conduct Live Class",
            conductDesc: "Teach learners live and answer questions directly.",
            
            // Screen 4
            guidelinesTitle: "Teaching Guidelines (Please Read Carefully)",
            g1Title: "Guideline 1: Original Content",
            g1Desc: "You must upload only content created by you. Do not upload copied videos, photos, or documents from YouTube, WhatsApp, or other platforms.",
            g2Title: "Guideline 2: Real Skill Demonstration",
            g2Desc: "Teach only skills that you personally practice in real life. Example: If you are a carpenter, show real tools and real work.",
            g3Title: "Guideline 3: Clear Visibility & Audio",
            g3Desc: "Your video must clearly show your hands, tools, and work area. Audio should be understandable without loud background noise.",
            g4Title: "Guideline 4: Respectful Language",
            g4Desc: "Do not use abusive, offensive, or misleading language.",
            g5Title: "Guideline 5: Safety Responsibility",
            g5Desc: "Always explain safety precautions before showing practical work.",
            g6Title: "Guideline 6: Verification",
            g6Desc: "Your content may be reviewed for quality and authenticity. False information can lead to removal or account suspension.",
            iHaveRead: "I have read and agree to all guidelines",
            proceedPayment: "Proceed to Payment",
            
            // Screen 5
            activationFee: "Teaching Activation Fee",
            feeExplanation: "A small one-time fee helps us verify content quality and maintain the platform.",
            upi: "UPI / QR Payment",
            card: "Debit / Credit Card",
            netbanking: "Net Banking",
            wallet: "Wallets (Optional)",
            payAmount: "Pay ₹10 & Continue", // Assuming 10 for demo, user didn't specify amount but implied a fee
            qrPlaceholder: "QR Code (dynamic)",
            upiId: "UPI ID (example: name@upi)",
            payBtn: "Pay",
            cardNumber: "Card Number (16 digits)",
            holderName: "Cardholder Name",
            expiry: "Expiry Date (MM/YY)",
            cvv: "CVV (3 digits)",
            secureTx: "Your card details are securely processed.",
            selectBank: "Select Bank",
            continue: "Continue",
            
            // Screen 6
            paymentSuccess: "Payment successful. You can now start teaching.",
            uploadNow: "Upload Teaching Content",
            
            // Screen 7
            chooseType: "Choose Content Type",
            uploadVideo: "Upload Video",
            uploadDoc: "Upload Document",
            scheduleLive: "Schedule Live Class",
            publish: "Publish",
            videoTitle: "Video Title",
            videoDesc: "Description", // Implicit in "Video Upload Form"
            skillCategory: "Skill Category",
            estDuration: "Estimated Duration",
            safetyDisclaimer: "I certify that this content follows safety guidelines.", // Implicit checkbox
            selectFile: "Video File Upload",
            language: "Language",
            
            // Screen 8
            totalStudents: "Total Students",
            totalVideos: "Total Videos",
            liveScheduled: "Live Classes Scheduled",
            earnings: "Earnings",
            contentList: "Teaching Content List",
            views: "Views",
            ratings: "Student Ratings",
            editRemove: "Edit / Remove",
            
            // Common
            back: "Back",
            processing: "Processing...",
            voiceGuidelines: "Please listen to the guidelines carefully.",
            voiceFee: "Pay a small fee to activate your teaching account."
        },
        hi: {
            // Simplified Hindi for demo purposes, replicating structure
             teachYourSkill: "अपना कौशल सिखाएं",
            earnRespect: "जो आप जानते हैं उसे सिखाकर सम्मान और आय अर्जित करें।",
            uploadContent: "शिक्षण सामग्री अपलोड करें",
            uploadDesc: "अपना कौशल सिखाने के लिए वीडियो या दस्तावेज़ अपलोड करें।",
            conductLive: "लाइव क्लास आयोजित करें",
            conductDesc: "शिक्षार्थियों को लाइव सिखाएं और सीधे सवालों के जवाब दें।",
            guidelinesTitle: "शिक्षण दिशानिर्देश (कृपया ध्यान से पढ़ें)",
            g1Title: "दिशानिर्देश 1: मूल सामग्री",
            g1Desc: "आपको केवल अपने द्वारा बनाई गई सामग्री अपलोड करनी होगी। YouTube या WhatsApp से कॉपी न करें।",
            g2Title: "दिशानिर्देश 2: असली कौशल प्रदर्शन",
            g2Desc: "केवल वही कौशल सिखाएं जो आप वास्तविक जीवन में करते हैं।",
            g3Title: "दिशानिर्देश 3: स्पष्ट दृश्य और ऑडियो",
            g3Desc: "आपके वीडियो में आपके हाथ और काम स्पष्ट दिखने चाहिए।",
            g4Title: "दिशानिर्देश 4: सम्मानजनक भाषा",
            g4Desc: "अपमानजनक भाषा का प्रयोग न करें।",
            g5Title: "दिशानिर्देश 5: सुरक्षा जिम्मेदारी",
            g5Desc: "हमेशा सुरक्षा सावधानियों की व्याख्या करें।",
            g6Title: "दिशानिर्देश 6: सत्यापन",
            g6Desc: "आपकी सामग्री की समीक्षा की जा सकती है।",
            iHaveRead: "मैंने सभी दिशानिर्देश पढ़ लिए हैं",
            proceedPayment: "भुगतान के लिए आगे बढ़ें",
            activationFee: "शिक्षण सक्रियण शुल्क",
            feeExplanation: "गुणवत्ता बनाए रखने के लिए एक छोटा शुल्क।",
            upi: "UPI / QR",
            card: "डेबिट / क्रेडिट कार्ड",
            netbanking: "नेट बैंकिंग",
            wallet: "वॉलेट",
            payAmount: "₹10 का भुगतान करें",
            qrPlaceholder: "QR कोड",
            upiId: "UPI आईडी",
            payBtn: "भुगतान करें",
            cardNumber: "कार्ड नंबर",
            holderName: "कार्डधारक का नाम",
            expiry: "समाप्ति तिथि",
            cvv: "CVV",
            secureTx: "आपका कार्ड सुरक्षित है।",
            selectBank: "बैंक चुनें",
            continue: "जारी रखें",
            paymentSuccess: "भुगतान सफल। अब आप पढ़ाना शुरू कर सकते हैं।",
            uploadNow: "सामग्री अपलोड करें",
            chooseType: "सामग्री प्रकार चुनें",
            uploadVideo: "वीडियो अपलोड करें",
            uploadDoc: "दस्तावेज़ अपलोड करें",
            scheduleLive: "लाइव क्लास शेड्यूल करें",
            publish: "प्रकाशित करें",
            videoTitle: "वीडियो शीर्षक",
            skillCategory: "कौशल श्रेणी",
            estDuration: "अनुमानित अवधि",
            safetyDisclaimer: "मैं सुरक्षा नियमों का पालन करता हूँ।",
            selectFile: "फ़ाइल चुनें",
            language: "भाषा",
            totalStudents: "कुल छात्र",
            totalVideos: "कुल वीडियो",
            liveScheduled: "लाइव कक्षाएं",
            earnings: "कमाई",
            contentList: "शिक्षण सामग्री सूची",
            views: "दृश्य",
            ratings: "रेटिंग",
            editRemove: "संपादित करें / हटाएं",
            back: "वापस",
            processing: "प्रक्रिया जारी है...",
            voiceGuidelines: "कृपया दिशानिर्देश सुनें।",
            voiceFee: "खाता सक्रिय करने के लिए शुल्क दें।"
        }
    };

    const txt = t[language] || t.en;

    const toggleVoice = (text) => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(text);
            if (language === 'hi') {
                msg.lang = 'hi-IN';
            }
            msg.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(msg);
            setIsSpeaking(true);
        }
    };

    // Cleanup
    useEffect(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, [step]);

    const handlePublish = async () => {
        if (!formData.safetyAgreed) {
            alert("Please agree to the safety disclaimer.");
            return;
        }
        setLoading(true);
        try {
            let url = `http://localhost:8000/api/v1/skillbank/create_${createType === 'live' ? 'session' : 'lesson'}/${userId}`;
            
            // Use actual form data
            const payload = {
                title: formData.title || "My New Skill Class",
                description: formData.description || "Learn from an expert.",
                type: createType,
                price: 100,
                language: formData.language,
                difficulty: formData.difficulty,
                duration_minutes: parseInt(formData.duration) || 15,
                scheduled_at: createType === 'live' ? new Date(Date.now() + 86400000).toISOString() : undefined // +1 day
            };

            await axios.post(url, payload);
            
            alert(txt.publish + " Successful!"); 
            if (onSuccess) onSuccess();
            setStep('dashboard');
        } catch (e) {
            console.error(e);
            alert("Failed to publish");
        }
        setLoading(false);
    };

    // --- RENDERERS ---

    if (showChatDashboard) {
        return <TeacherChatDashboard onBack={() => setShowChatDashboard(false)} />;
    }

    // SCREEN 3: TEACH SKILLS (ENTRY SCREEN)
    if (step === 'entry') {
        return (
            <div className="px-4 pb-20 pt-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-blue-900 mb-2">{txt.teachYourSkill}</h1>
                    <p className="text-gray-500 font-medium text-lg">{txt.earnRespect}</p>
                </div>

                <div className="space-y-6">
                    {/* Card 1: Upload Teaching Content */}
                    <div 
                        onClick={() => setStep('guidelines')}
                        className="bg-white p-8 rounded-3xl shadow-xl border border-blue-100 cursor-pointer hover:border-blue-500 hover:shadow-2xl transition-all group"
                    >
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                            <Upload size={36} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">{txt.uploadContent}</h3>
                        <p className="text-gray-500 text-base">{txt.uploadDesc}</p>
                    </div>

                    {/* Card 2: Conduct Live Class */}
                    <div 
                        onClick={() => setStep('guidelines')}
                        className="bg-white p-8 rounded-3xl shadow-xl border border-purple-100 cursor-pointer hover:border-purple-500 hover:shadow-2xl transition-all group"
                    >
                        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                            <Video size={36} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">{txt.conductLive}</h3>
                        <p className="text-gray-500 text-base">{txt.conductDesc}</p>
                    </div>
                </div>
                
                <button onClick={onBack} className="mt-10 text-gray-400 text-sm w-full text-center font-bold">
                    {txt.back}
                </button>
            </div>
        );
    }

    // SCREEN 4: TEACHING GUIDELINES
    if (step === 'guidelines') {
        const guidelines = [
            { title: txt.g1Title, desc: txt.g1Desc, icon: <Shield className="text-blue-500" /> },
            { title: txt.g2Title, desc: txt.g2Desc, icon: <CheckCircle className="text-green-500" /> },
            { title: txt.g3Title, desc: txt.g3Desc, icon: <Video className="text-purple-500" /> },
            { title: txt.g4Title, desc: txt.g4Desc, icon: <MessageSquare className="text-orange-500" /> },
            { title: txt.g5Title, desc: txt.g5Desc, icon: <AlertTriangle className="text-red-500" /> },
            { title: txt.g6Title, desc: txt.g6Desc, icon: <Shield className="text-blue-500" /> },
        ];

        return (
            <div className="px-4 pt-4 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">{txt.guidelinesTitle}</h2>
                    <button onClick={() => toggleVoice(txt.voiceGuidelines)} className="p-2 bg-blue-50 text-blue-600 rounded-full">
                        <Volume2 size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
                    {guidelines.map((g, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-start gap-3 mb-2">
                                <div className="mt-1">{g.icon}</div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">{g.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{g.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-4 pb-8 bg-white border-t border-gray-100 mt-auto flex-shrink-0 z-10">
                    <label className={`flex items-center gap-3 p-4 rounded-xl mb-4 cursor-pointer border transition-colors ${guidelinesAgreed ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                        <input 
                            type="checkbox" 
                            checked={guidelinesAgreed}
                            onChange={(e) => setGuidelinesAgreed(e.target.checked)}
                            className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-bold text-gray-800">{txt.iHaveRead}</span>
                    </label>
                    
                    <button 
                        onClick={() => setStep('payment')}
                        disabled={!guidelinesAgreed}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${guidelinesAgreed ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                        {txt.proceedPayment}
                    </button>
                </div>
            </div>
        );
    }

    // SCREEN 5: PAYMENT SCREEN
    if (step === 'payment') {
        return (
            <div className="px-4 pt-4 pb-20">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-gray-900">{txt.activationFee}</h2>
                    <button onClick={() => toggleVoice(txt.voiceFee)} className="p-2 bg-blue-50 text-blue-600 rounded-full">
                        <Volume2 size={24} />
                    </button>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-xl mb-8 flex gap-3 border border-blue-100">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Shield size={20} />
                    </div>
                    <p className="text-sm text-blue-900 font-medium leading-relaxed">{txt.feeExplanation}</p>
                </div>

                {/* Payment Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                    {[
                        { id: 'upi', label: txt.upi, icon: <Smartphone size={18} /> },
                        { id: 'card', label: txt.card, icon: <CreditCard size={18} /> },
                        { id: 'netbanking', label: txt.netbanking, icon: <Globe size={18} /> },
                        { id: 'wallet', label: txt.wallet, icon: <Wallet size={18} /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setPaymentMethod(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold whitespace-nowrap border transition-all ${paymentMethod === tab.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 min-h-[320px]">
                    {paymentMethod === 'upi' && (
                        <div className="text-center py-2">
                            <div className="w-48 h-48 bg-gray-900 mx-auto mb-6 rounded-xl flex items-center justify-center text-white font-mono text-sm shadow-inner">
                                <div className="bg-white p-2 rounded">
                                     {/* QR Code Placeholder Visual */}
                                     <div className="w-40 h-40 border-4 border-black border-dashed flex items-center justify-center text-black font-bold text-xs">
                                        DYNAMIC QR
                                     </div>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-gray-500 mb-4">{txt.qrPlaceholder}</p>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                                <input type="text" placeholder={txt.upiId} className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                            <button className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700" onClick={() => setStep('payment_success')}>
                                {txt.payBtn}
                            </button>
                        </div>
                    )}

                    {paymentMethod === 'card' && (
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{txt.cardNumber}</label>
                                <input type="text" placeholder="0000 0000 0000 0000" className="w-full p-3 border border-gray-300 rounded-xl font-mono" maxLength={19} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{txt.holderName}</label>
                                <input type="text" placeholder="JOHN DOE" className="w-full p-3 border border-gray-300 rounded-xl" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{txt.expiry}</label>
                                    <input type="text" placeholder="MM/YY" className="w-full p-3 border border-gray-300 rounded-xl font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{txt.cvv}</label>
                                    <input type="password" placeholder="123" className="w-full p-3 border border-gray-300 rounded-xl font-mono" maxLength={3} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-green-600 font-bold bg-green-50 p-3 rounded-lg mt-2">
                                <Shield size={14} /> {txt.secureTx}
                            </div>
                            <button className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700" onClick={() => setStep('payment_success')}>
                                {txt.payBtn}
                            </button>
                        </div>
                    )}

                    {paymentMethod === 'netbanking' && (
                        <div className="pt-4">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{txt.selectBank}</label>
                             <select className="w-full p-3 border border-gray-300 rounded-xl bg-white mb-6 focus:ring-2 focus:ring-blue-500 outline-none">
                                <option>Select Bank</option>
                                <option>State Bank of India</option>
                                <option>HDFC Bank</option>
                                <option>ICICI Bank</option>
                                <option>Axis Bank</option>
                            </select>
                            <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700" onClick={() => setStep('payment_success')}>
                                {txt.continue}
                            </button>
                        </div>
                    )}
                    
                    {paymentMethod === 'wallet' && (
                         <div className="space-y-3 pt-2">
                            {['PhonePe', 'Paytm', 'Google Pay'].map(w => (
                                <label key={w} className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-all">
                                    <input type="radio" name="wallet" className="w-5 h-5 text-blue-600" />
                                    <span className="font-bold text-gray-800">{w}</span>
                                </label>
                            ))}
                             <button className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700" onClick={() => setStep('payment_success')}>
                                {txt.payBtn}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // SCREEN 6: PAYMENT SUCCESS
    if (step === 'payment_success') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                <div className="w-28 h-28 bg-green-100 rounded-full flex items-center justify-center mb-8 animate-in zoom-in duration-300 shadow-lg shadow-green-100">
                    <CheckCircle size={56} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-3">{txt.paymentSuccess}</h2>
                <p className="text-gray-500 font-medium mb-10 text-lg max-w-xs mx-auto">{txt.startTeachingMsg || "You can now start teaching."}</p>
                
                <button 
                    onClick={() => setStep('create_type')}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                    <Upload size={20} />
                    {txt.uploadNow}
                </button>
            </div>
        );
    }

    // SCREEN 7 (Part 1): CHOOSE CONTENT TYPE
    if (step === 'create_type') {
        return (
            <div className="px-4 pt-4">
                <h2 className="text-2xl font-black text-center mb-8 text-gray-900">{txt.chooseType}</h2>
                <div className="space-y-5">
                    <button onClick={() => { setCreateType('video'); setStep('create_details'); }} className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-5 hover:border-blue-500 transition-all text-left group">
                        <div className="bg-red-50 p-4 rounded-full text-red-600 group-hover:bg-red-100 transition-colors"><Video size={28} /></div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg mb-1">{txt.uploadVideo}</h3>
                            <p className="text-sm text-gray-500">MP4, WebM</p>
                        </div>
                        <ChevronRight className="ml-auto text-gray-300 group-hover:text-blue-500" />
                    </button>
                    <button onClick={() => { setCreateType('document'); setStep('create_details'); }} className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-5 hover:border-blue-500 transition-all text-left group">
                        <div className="bg-blue-50 p-4 rounded-full text-blue-600 group-hover:bg-blue-100 transition-colors"><FileText size={28} /></div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg mb-1">{txt.uploadDoc}</h3>
                            <p className="text-sm text-gray-500">PDF, JPG, PNG</p>
                        </div>
                        <ChevronRight className="ml-auto text-gray-300 group-hover:text-blue-500" />
                    </button>
                    <button onClick={() => { setCreateType('live'); setStep('create_details'); }} className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-5 hover:border-blue-500 transition-all text-left group">
                        <div className="bg-purple-50 p-4 rounded-full text-purple-600 group-hover:bg-purple-100 transition-colors"><Calendar size={28} /></div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg mb-1">{txt.scheduleLive}</h3>
                            <p className="text-sm text-gray-500">Zoom, Google Meet</p>
                        </div>
                        <ChevronRight className="ml-auto text-gray-300 group-hover:text-blue-500" />
                    </button>
                </div>
            </div>
        );
    }

    // SCREEN 7 (Part 2): UPLOAD FORM (REAL FIELDS)
    if (step === 'create_details') {
        return (
            <div className="px-4 pt-4 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setStep('create_type')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                            <ArrowRight className="rotate-180" size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900">{createType === 'live' ? txt.scheduleLive : txt.uploadVideo}</h2>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* File Upload (Visual Only) */}
                    {createType !== 'live' && (
                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-gray-50 cursor-pointer hover:bg-gray-100 hover:border-blue-400 transition-all group">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                <Upload className="text-gray-400 group-hover:text-blue-500" size={24} />
                            </div>
                            <p className="font-bold text-gray-700 text-sm mb-1">{txt.selectFile}</p>
                            <p className="text-xs text-gray-400">Max size: 100MB</p>
                        </div>
                    )}

                    {/* Fields */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">{createType === 'live' ? 'Class Title' : txt.videoTitle}</label>
                        <input 
                            type="text" 
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium"
                            placeholder="e.g., How to fix a leaking tap"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">{txt.skillCategory}</label>
                            <select 
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                                className="w-full p-4 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option>Construction</option>
                                <option>Plumbing</option>
                                <option>Electrical</option>
                                <option>Automotive</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">{txt.language}</label>
                            <select 
                                value={formData.language}
                                onChange={e => setFormData({...formData, language: e.target.value})}
                                className="w-full p-4 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option>English</option>
                                <option>Hindi</option>
                                <option>Bengali</option>
                            </select>
                        </div>
                    </div>

                    <div>
                         <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">{txt.estDuration} (mins)</label>
                         <input 
                            type="number" 
                            value={formData.duration}
                            onChange={e => setFormData({...formData, duration: e.target.value})}
                            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="15"
                        />
                    </div>

                    {/* Safety Disclaimer */}
                    <label className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-100 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={formData.safetyAgreed}
                            onChange={e => setFormData({...formData, safetyAgreed: e.target.checked})}
                            className="mt-1 w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                        />
                        <span className="text-sm font-medium text-yellow-800 leading-snug">{txt.safetyDisclaimer}</span>
                    </label>

                    <button 
                        onClick={handlePublish}
                        disabled={loading || !formData.safetyAgreed}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${!loading && formData.safetyAgreed ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                        {loading ? txt.processing : txt.publish}
                    </button>
                </div>
            </div>
        );
    }

    // SCREEN 8: MY TEACHING DASHBOARD
    if (step === 'dashboard') {
        // Ensure dashboardData is not null/undefined before accessing properties
        const safeData = dashboardData || {};
        const stats = safeData.stats || { total_students: 0, total_videos: 0, live_scheduled: 0, earnings: 0 };
        const videos = Array.isArray(safeData.videos) ? safeData.videos : [];
        const documents = Array.isArray(safeData.documents) ? safeData.documents : [];
        const liveClasses = Array.isArray(safeData.live_classes) ? safeData.live_classes : [];

        const voiceText = language === 'hi' 
            ? `आपके पास ${stats.total_students || 0} छात्र हैं और आपने ${stats.earnings || 0} रुपये कमाए हैं।`
            : `You have ${stats.total_students || 0} students and earned ${stats.earnings || 0} rupees.`;

        return (
            <div className="px-4 pb-20">
                 <div className="flex justify-between items-center pt-6 mb-6">
                    <h2 className="text-2xl font-black text-gray-900">My Teaching Dashboard</h2>
                    <InstructionSpeaker text={voiceText} language={language} />
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2 text-blue-600">
                            <Users size={20} />
                            <span className="text-xs font-bold uppercase tracking-wider">{txt.totalStudents}</span>
                        </div>
                        <span className="text-3xl font-black text-gray-900">{stats.total_students || 0}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2 text-green-600">
                            <Video size={20} />
                            <span className="text-xs font-bold uppercase tracking-wider">{txt.totalVideos}</span>
                        </div>
                        <span className="text-3xl font-black text-gray-900">{stats.total_videos || 0}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2 text-purple-600">
                            <Calendar size={20} />
                            <span className="text-xs font-bold uppercase tracking-wider">{txt.liveScheduled}</span>
                        </div>
                        <span className="text-3xl font-black text-gray-900">{stats.live_scheduled || 0}</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2 text-orange-600">
                            <DollarSign size={20} />
                            <span className="text-xs font-bold uppercase tracking-wider">{txt.earnings}</span>
                        </div>
                        <span className="text-3xl font-black text-gray-900">₹{stats.earnings || 0}</span>
                    </div>
                </div>

                {/* Teaching Content List */}
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-bold text-gray-900 text-lg">{txt.contentList}</h3>
                    <button onClick={() => setStep('create_type')} className="text-blue-600 text-sm font-bold hover:underline bg-blue-50 px-3 py-1 rounded-full">+ Add New</button>
                </div>

                <div className="space-y-4 mb-8">
                    {/* Videos */}
                    {videos.map((item, i) => (
                        <div key={`v-${i}`} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h4>
                                <div className="flex gap-4 text-xs text-gray-500 font-medium">
                                    <span className="flex items-center gap-1"><Users size={12} /> {item.views || 0} {txt.views}</span>
                                    <span className="flex items-center gap-1 text-yellow-600"><Users size={12} /> 4.8 {txt.ratings}</span>
                                </div>
                            </div>
                            <button className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">{txt.editRemove}</button>
                        </div>
                    ))}
                    
                    {/* Live Classes */}
                    {liveClasses.map((item, i) => (
                        <div key={`l-${i}`} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h4>
                                <div className="flex gap-4 text-xs text-gray-500 font-medium">
                                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(item.scheduled_at).toLocaleString([], {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                                    <span className="flex items-center gap-1 text-purple-600"><Users size={12} /> {item.attendees} Attended</span>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${new Date(item.scheduled_at) > new Date() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {new Date(item.scheduled_at) > new Date() ? 'Scheduled' : 'Done'}
                            </span>
                        </div>
                    ))}

                    {videos.length === 0 && liveClasses.length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-400 font-bold text-sm">No content uploaded yet.</p>
                            <button onClick={() => setStep('create_type')} className="mt-2 text-blue-600 text-xs font-bold">Start Teaching</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    return null; // Fallback
}
