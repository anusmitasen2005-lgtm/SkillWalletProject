import React from 'react';
import StepFinalSummary from './StepFinalSummary';

const PreviewStepFinalSummary = () => {
    // Dummy props for preview
    const dummyUserId = 123;
    const dummyAccessToken = "DEBUG_ACCESS_TOKEN_for_123"; // Matches the backend's expected format if needed
    const dummyNextStep = () => {
        alert("Next step triggered! (Preview Mode)");
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Preview Mode: StepFinalSummary</h1>
            <StepFinalSummary 
                userId={dummyUserId} 
                accessToken={dummyAccessToken} 
                nextStep={dummyNextStep} 
            />
        </div>
    );
};

export default PreviewStepFinalSummary;
