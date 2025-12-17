import React from 'react';
import ProfileFlow from './ProfileFlow';
import './index.css'; // Ensure global styles are applied

function App() {
    // The App component now acts as a simple wrapper for the ProfileFlow.
    // ProfileFlow handles its own authentication state (login screen vs dashboard)
    // and step persistence via localStorage.
    return (
        <div className="app-container">
            <ProfileFlow />
        </div>
    );
}

export default App;
