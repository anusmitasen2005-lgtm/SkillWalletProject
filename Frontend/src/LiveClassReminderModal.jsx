import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, Smartphone, CheckCircle, ChevronLeft, ChevronRight, Mic, Volume2, Edit2, ArrowRight, Plus, Minus } from 'lucide-react';
import axios from 'axios';

const LiveClassReminderModal = ({ userId, session, onClose, onSuccess, language = 'en' }) => {
    const [step, setStep] = useState(1); // 1: Date, 2: Time, 3: Phone, 4: Summary, 5: Success
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState({ hour: 3, minute: 0, period: 'PM' });
    const [phone, setPhone] = useState('+91 ');
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    // Translation
    const t = {
        en: {
            selectDate: "Select Date",
            selectTime: "Select Time",
            getSms: "Get SMS Reminder",
            details: "Reminder Details",
            success: "Success!",
            chooseDate: "Choose the date when the live class will happen.",
            chooseTime: "Choose the time for your reminder.",
            enterMobile: "Enter the mobile number to receive reminder message.",
            checkDetails: "Please check your reminder details.",
            reminderSet: "Reminder set successfully. SMS reminder will be sent to your mobile number.",
            nextTime: "Next: Select Time",
            nextPhone: "Next: Phone Number",
            confirm: "Confirm Reminder",
            back: "Back",
            mobileLabel: "Mobile Number",
            date: "Date",
            time: "Time",
            smsNumber: "SMS Number",
            info: "You will receive an SMS reminder 30 minutes before the class starts.",
            edit: "Edit",
            setReminder: "Set Reminder",
            done: "Done",
            invalidPhone: "Please enter a valid mobile number",
            voiceNotSupported: "Voice input not supported in this browser.",
            timeHelper: "This is the time when the class will start.",
            phoneHelper: "We will send a reminder message to this number.",
            hour: "HOUR",
            min: "MIN"
        },
        hi: {
            selectDate: "दिनांक चुनें",
            selectTime: "समय चुनें",
            getSms: "SMS रिमाइंडर प्राप्त करें",
            details: "रिमाइंडर विवरण",
            success: "सफल!",
            chooseDate: "वह तारीख चुनें जब लाइव क्लास होगी।",
            chooseTime: "अपने रिमाइंडर के लिए समय चुनें।",
            enterMobile: "रिमाइंडर संदेश प्राप्त करने के लिए मोबाइल नंबर दर्ज करें।",
            checkDetails: "कृपया अपने रिमाइंडर विवरण की जाँच करें।",
            reminderSet: "रिमाइंडर सफलतापूर्वक सेट हो गया। आपके मोबाइल नंबर पर SMS रिमाइंडर भेजा जाएगा।",
            nextTime: "अगला: समय चुनें",
            nextPhone: "अगला: फोन नंबर",
            confirm: "रिमाइंडर की पुष्टि करें",
            back: "वापस",
            mobileLabel: "मोबाइल नंबर",
            date: "दिनांक",
            time: "समय",
            smsNumber: "SMS नंबर",
            info: "कक्षा शुरू होने से 30 मिनट पहले आपको एक SMS रिमाइंडर प्राप्त होगा।",
            edit: "संपादित करें",
            setReminder: "रिमाइंडर सेट करें",
            done: "हो गया",
            invalidPhone: "कृपया एक मान्य मोबाइल नंबर दर्ज करें",
            voiceNotSupported: "इस ब्राउज़र में वॉयस इनपुट समर्थित नहीं है।",
            timeHelper: "यह वह समय है जब कक्षा शुरू होगी।",
            phoneHelper: "हम इस नंबर पर रिमाइंडर संदेश भेजेंगे।",
            hour: "घंटा",
            min: "मिनट"
        }
    };

    const txt = t[language] || t.en;

    // Voice Helper
    const speak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            if (language === 'hi') utterance.lang = 'hi-IN';
            utterance.onend = () => setIsSpeaking(false);
            setIsSpeaking(true);
            window.speechSynthesis.speak(utterance);
        }
    };

    useEffect(() => {
        // Step-based voice prompts
        if (step === 1) speak(txt.chooseDate);
        if (step === 2) speak(txt.chooseTime);
        if (step === 3) speak(txt.enterMobile);
        if (step === 4) speak(txt.checkDetails);
        if (step === 5) {
            speak(txt.reminderSet);
            if (navigator.vibrate) navigator.vibrate(200); // Haptic feedback
        }
    }, [step, language]);

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleConfirm = async () => {
        try {
            // Format time string
            const timeStr = `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')} ${time.period}`;
            const dateStr = date.toISOString().split('T')[0];
            
            await axios.post(`http://localhost:8000/api/v1/skillbank/reminders/${userId}`, {
                session_id: session.id,
                phone_number: phone,
                date: dateStr,
                time: timeStr
            });
            
            handleNext(); // Go to success
        } catch (err) {
            console.error(err);
            alert("Failed to set reminder. Please try again.");
        }
    };

    // Step 1: Date Selection
    const renderDateStep = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const currentMonth = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        // Simple calendar logic
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const startDay = startOfMonth.getDay();
        const daysInMonth = endOfMonth.getDate();
        
        const calendarDays = [];
        for (let i = 0; i < startDay; i++) calendarDays.push(null);
        for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">{txt.selectDate}</h3>
                    <Volume2 size={20} className={isSpeaking ? "text-blue-600 animate-pulse" : "text-gray-400"} />
                </div>
                
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <button className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} /></button>
                        <span className="font-bold text-gray-700">{currentMonth}</span>
                        <button className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={20} /></button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2 text-center mb-2">
                        {days.map(d => <span key={d} className="text-xs font-bold text-gray-400">{d}</span>)}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((d, i) => {
                            const isPast = d && new Date(date.getFullYear(), date.getMonth(), d) < new Date().setHours(0,0,0,0);
                            return (
                                <button 
                                    key={i} 
                                    disabled={!d || isPast}
                                    onClick={() => d && setDate(new Date(date.getFullYear(), date.getMonth(), d))}
                                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                        !d ? 'invisible' :
                                        isPast ? 'text-gray-300 cursor-not-allowed' :
                                        d === date.getDate() 
                                        ? 'bg-blue-600 text-white shadow-md transform scale-110' 
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    {d}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                <p className="text-sm text-gray-500 text-center bg-gray-50 p-3 rounded-xl">
                    {txt.chooseDate}
                </p>
                
                <button 
                    onClick={handleNext}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors"
                >
                    {txt.nextTime}
                </button>
            </div>
        );
    };

    // Step 2: Time Selection
    const renderTimeStep = () => {
        const adjustTime = (type, amount) => {
            if (type === 'hour') {
                let newHour = time.hour + amount;
                if (newHour > 12) newHour = 1;
                if (newHour < 1) newHour = 12;
                setTime({ ...time, hour: newHour });
            } else {
                let newMin = time.minute + amount;
                if (newMin >= 60) newMin = 0;
                if (newMin < 0) newMin = 45; // 15 min steps
                setTime({ ...time, minute: newMin });
            }
        };

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">{txt.selectTime}</h3>
                    <Volume2 size={20} className={isSpeaking ? "text-blue-600 animate-pulse" : "text-gray-400"} />
                </div>
                
                <div className="flex justify-center gap-4 items-center py-8">
                    {/* Hour */}
                    <div className="flex flex-col items-center gap-2">
                        <button onClick={() => adjustTime('hour', 1)} className="p-4 bg-gray-100 rounded-full hover:bg-gray-200 active:scale-95 transition-transform"><Plus size={32} /></button>
                        <div className="bg-white border-2 border-blue-100 w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black text-gray-800 shadow-sm">
                            {time.hour.toString().padStart(2, '0')}
                        </div>
                        <button onClick={() => adjustTime('hour', -1)} className="p-4 bg-gray-100 rounded-full hover:bg-gray-200 active:scale-95 transition-transform"><Minus size={32} /></button>
                        <span className="text-sm font-bold text-gray-400">{txt.hour}</span>
                    </div>
                    
                    <span className="text-3xl font-black text-gray-300">:</span>
                    
                    {/* Minute */}
                    <div className="flex flex-col items-center gap-2">
                        <button onClick={() => adjustTime('minute', 15)} className="p-4 bg-gray-100 rounded-full hover:bg-gray-200 active:scale-95 transition-transform"><Plus size={32} /></button>
                        <div className="bg-white border-2 border-blue-100 w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black text-gray-800 shadow-sm">
                            {time.minute.toString().padStart(2, '0')}
                        </div>
                        <button onClick={() => adjustTime('minute', -15)} className="p-4 bg-gray-100 rounded-full hover:bg-gray-200 active:scale-95 transition-transform"><Minus size={32} /></button>
                        <span className="text-sm font-bold text-gray-400">{txt.min}</span>
                    </div>
                    
                    {/* AM/PM */}
                    <div className="flex flex-col gap-2 ml-4">
                        <button 
                            onClick={() => setTime({ ...time, period: 'AM' })}
                            className={`w-16 py-3 rounded-xl font-bold text-sm transition-all ${time.period === 'AM' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
                        >
                            AM
                        </button>
                        <button 
                            onClick={() => setTime({ ...time, period: 'PM' })}
                            className={`w-16 py-3 rounded-xl font-bold text-sm transition-all ${time.period === 'PM' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
                        >
                            PM
                        </button>
                    </div>
                </div>
                
                <p className="text-sm text-gray-500 text-center bg-gray-50 p-3 rounded-xl">
                    {txt.timeHelper}
                </p>
                
                <div className="flex gap-4">
                    <button onClick={handleBack} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold">{txt.back}</button>
                    <button onClick={handleNext} className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700">{txt.nextPhone}</button>
                </div>
            </div>
        );
    };

    // Step 3: Phone Number
    const renderPhoneStep = () => {
        const startListening = () => {
            if ('webkitSpeechRecognition' in window) {
                const recognition = new window.webkitSpeechRecognition();
                recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    // Extract numbers
                    const numbers = transcript.replace(/\D/g, '');
                    if (numbers) setPhone(`+91 ${numbers}`);
                };
                recognition.start();
            } else {
                alert(txt.voiceNotSupported);
            }
        };

        const isValid = phone.replace(/\D/g, '').length >= 10;

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">{txt.getSms}</h3>
                    <Volume2 size={20} className={isSpeaking ? "text-blue-600 animate-pulse" : "text-gray-400"} />
                </div>
                
                <div className="relative">
                    <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">{txt.mobileLabel}</label>
                    <div className={`flex items-center bg-white border-2 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500 ${!isValid && phone.length > 4 ? 'border-red-300' : 'border-gray-200'}`}>
                        <Smartphone className="text-gray-400 ml-2" size={20} />
                        <input 
                            type="text" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full p-3 bg-transparent outline-none font-bold text-lg text-gray-800 placeholder-gray-300"
                            placeholder="+91 00000 00000"
                        />
                        <button 
                            onClick={startListening}
                            className="p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            <Mic size={20} />
                        </button>
                    </div>
                    {!isValid && phone.length > 12 && (
                        <p className="text-red-500 text-xs mt-2 font-medium">{txt.invalidPhone}</p>
                    )}
                </div>
                
                <p className="text-sm text-gray-500 text-center bg-gray-50 p-3 rounded-xl">
                    {txt.phoneHelper}
                </p>
                
                <div className="flex gap-4">
                    <button onClick={handleBack} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold">{txt.back}</button>
                    <button 
                        onClick={handleNext} 
                        disabled={!isValid}
                        className={`flex-[2] py-4 rounded-xl font-bold shadow-lg transition-all ${isValid ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                        {txt.confirm}
                    </button>
                </div>
            </div>
        );
    };

    // Step 4: Summary
    const renderSummaryStep = () => {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">Reminder Details</h3>
                    <Volume2 size={20} className={isSpeaking ? "text-blue-600 animate-pulse" : "text-gray-400"} />
                </div>
                
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Date</p>
                            <p className="font-bold text-gray-800 text-lg">
                                {date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Time</p>
                            <p className="font-bold text-gray-800 text-lg">
                                {time.hour.toString().padStart(2, '0')}:{time.minute.toString().padStart(2, '0')} {time.period}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">SMS Number</p>
                            <p className="font-bold text-gray-800 text-lg">{phone}</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                    <div className="mt-1"><CheckCircle size={16} className="text-blue-600" /></div>
                    <p className="text-sm text-blue-800 font-medium">
                        You will receive an SMS reminder 30 minutes before the class starts.
                    </p>
                </div>
                
                <div className="flex gap-4">
                    <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                        <Edit2 size={16} /> Edit
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700"
                    >
                        Set Reminder
                    </button>
                </div>
            </div>
        );
    };

    // Step 5: Success
    const renderSuccessStep = () => {
        return (
            <div className="text-center py-10">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <CheckCircle size={48} className="text-green-600" />
                </div>
                
                <h2 className="text-2xl font-black text-gray-900 mb-2">Reminder Set Successfully</h2>
                <p className="text-gray-500 mb-8 max-w-xs mx-auto">
                    SMS reminder will be sent to your mobile number.
                </p>
                
                <button 
                    onClick={() => { onSuccess(); onClose(); }}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700"
                >
                    Done
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm transition-opacity">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-10 fade-in duration-300">
                {step < 5 && (
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500"
                    >
                        <X size={20} />
                    </button>
                )}
                
                {step === 1 && renderDateStep()}
                {step === 2 && renderTimeStep()}
                {step === 3 && renderPhoneStep()}
                {step === 4 && renderSummaryStep()}
                {step === 5 && renderSuccessStep()}
            </div>
        </div>
    );
};

export default LiveClassReminderModal;