import React, { useState, useEffect } from 'react';
// Import the specific steps using the correct file paths
import StepIdentity from './StepIdentity.jsx';
import StepTiers from "./StepTiers.jsx"; 
import StepWork from "./StepWork.jsx"; 
import StepFinalSummary from './StepFinalSummary.jsx'; 
import StepCompleted from './StepCompleted.jsx'; 

// Define the component to manage the entire flow
function ProfileFlow() {
    // 1. Initialize state variables: Read directly from local storage if available
    const [currentStep, setCurrentStep] = useState(parseInt(localStorage.getItem('currentStep')) || 1);
    const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
    const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken') || null);
    
    // 2. CRITICAL FIX: Persist state to local storage whenever it changes
    useEffect(() => {
        if (userId) {
            localStorage.setItem('userId', userId);
            localStorage.setItem('accessToken', accessToken);
        }
        localStorage.setItem('currentStep', currentStep);
    }, [userId, accessToken, currentStep]);


    // Function to move to the next step
    const nextStep = () => setCurrentStep(prev => prev + 1);
    
    // Function to jump to any step number (used by the Dashboard)
    const jumpToStep = (step) => setCurrentStep(step);

    const renderStep = () => {
        // If the user is logged in and the current step is 1, we still render StepIdentity
        // but StepIdentity is now smart enough to check local storage and jump to profile_setup.
        
        switch (currentStep) {
            case 1:
                return <StepIdentity 
                            nextStep={nextStep} 
                            setUserId={setUserId}
                            setAccessToken={setAccessToken}
                            userId={userId ? parseInt(userId) : null}
                            accessToken={accessToken}
                        />;
            case 2:
                // Pass key props to Tier 2 (StepTiers)
                return <StepTiers userId={userId} accessToken={accessToken} nextStep={nextStep} />; 
            case 3:
                // Pass key props to Tier 3 (StepWork)
                return <StepWork userId={userId} accessToken={accessToken} nextStep={nextStep} />;
            case 4:
                // Pass key props to Portfolio (StepFinalSummary)
                return <StepFinalSummary userId={userId} accessToken={accessToken} nextStep={nextStep} />; 
            case 5:
                // CRITICAL FIX: Use key={userId} to force re-render when needed
                return (
                    <div key={userId}>
                         <StepCompleted 
                            nextStep={() => setCurrentStep(1)} 
                            jumpToStep={jumpToStep} 
                            userId={userId} 
                        />
                    </div>
                );
            default:
                return (
                    <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#e9f7ef', borderRadius: '10px' }}>
                        <h2 style={{ color: '#28a745' }}>Flow Finished!</h2>
                        <button onClick={() => setCurrentStep(1)} style={{marginTop: '20px', padding: '10px 20px'}}>
                            Start Setup Again
                        </button>
                    </div>
                );
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '900px', margin: '30px auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '15px', backgroundColor: '#fff' }}>
            
            <h1 style={{ textAlign: 'center', color: '#007bff' }}>
                Skill Wallet Setup: Step {currentStep} 
            </h1>
            <hr style={{ margin: '20px 0' }} />

            {/* START OVER BUTTON ONLY */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button 
                    onClick={() => {
                        // Clear session storage and reset state
                        localStorage.clear();
                        setUserId(null);
                        setAccessToken(null);
                        setCurrentStep(1);
                        window.location.reload(); // Force full app reset
                    }} 
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer' 
                    }}
                >
                    Start Over / Reset Flow
                </button>
            </div>
            
            {renderStep()}
        </div>
    );
}

export default ProfileFlow;