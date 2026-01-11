
import { useState } from "react";
import StepIdentity from "./StepIdentity";
import StepTiers from "./StepTiers";
import StepWork from "./StepWork";
import StepCompleted from "./StepCompleted";

export default function ProfileFlow({ language, setLanguage }) {
  const [step, setStep] = useState(localStorage.getItem('profileCompleted') === 'true' ? 4 : 1);
  const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken') || null);

  const updateStep = (newStep) => {
      setStep(newStep);
      if (newStep === 4) {
          localStorage.setItem('profileCompleted', 'true');
      }
  };

  const handleLoginSuccess = (uid, token) => {
    setUserId(uid);
    setAccessToken(token);
    localStorage.setItem('userId', uid);
    localStorage.setItem('accessToken', token);
    // Stay on Step 1 but switch view inside StepIdentity or move to next if profile is done?
    // For now, let's assume StepIdentity handles both Auth and Profile Setup.
    // If Auth is done, StepIdentity shows Profile Setup.
  };

  const resetFlow = () => {
    setStep(1);
    localStorage.removeItem('userId');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('profileCompleted');
    setUserId(null);
    setAccessToken(null);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepIdentity 
                  nextStep={() => updateStep(2)} 
                  userId={userId} 
                  onLogin={handleLoginSuccess}
               />;
      case 2:
        return <StepTiers 
                  nextStep={() => updateStep(3)} 
                  userId={userId} 
               />;
      case 3:
        return <StepWork 
                  nextStep={() => updateStep(4)} 
                  userId={userId} 
               />;
      case 4:
        return <StepCompleted 
                  jumpToStep={(s) => { if(s===1) resetFlow(); else updateStep(s); }}
                  userId={userId} 
               />;
      default:
        return (
          <div className="text-center text-gray-500">
            Flow completed.
          </div>
        );
    }
  };

  // When on Dashboard (Step 4), let it take full screen control
  if (step === 4) {
      return <StepCompleted 
                jumpToStep={(s) => { if(s===1) resetFlow(); else updateStep(s); }} 
                userId={userId} 
                language={language}
                setLanguage={setLanguage}
             />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center font-sans">
      {/* GLOBAL HEADER: My Skill Identity */}
      <header className="w-full bg-blue-700 text-white py-4 shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-wide">My Skill Identity</h1>
            <div className="text-sm opacity-80">Building a lifelong identity based on work</div>
        </div>
      </header>

      <div className="w-full max-w-2xl mt-8 px-4 mb-20">
        {/* Step Indicator */}
        <div className="flex justify-between mb-8 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            <span className={step >= 1 ? "text-blue-600" : ""}>1. Who I Am</span>
            <span className={step >= 2 ? "text-blue-600" : ""}>2. My Trust Records</span>
            <span className={step >= 3 ? "text-blue-600" : ""}>3. My Work Journey</span>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
          {renderStep()}
        </div>
        
        {/* Reset (Dev only) */}
        <div className="mt-8 text-center">
            <button onClick={resetFlow} className="text-gray-300 text-xs hover:text-red-400">
                Reset Flow (Dev)
            </button>
        </div>
      </div>
    </div>
  );
}
