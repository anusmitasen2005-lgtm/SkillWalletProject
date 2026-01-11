import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const MainLayout = ({ children, activeTab, onTabChange, userProfile, onLogout, language, setLanguage }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Top Bar */}
            <TopBar 
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                userProfile={userProfile}
                language={language}
                setLanguage={setLanguage}
            />

            {/* Sidebar (Desktop) */}
            <Sidebar 
                activeTab={activeTab} 
                onTabChange={onTabChange} 
                onLogout={onLogout} 
                hasUploaded={userProfile?.has_uploaded}
                language={language}
            />

            {/* Sidebar (Mobile Overlay) */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="absolute left-0 top-0 bottom-0 bg-white w-64 shadow-xl">
                        <Sidebar 
                            activeTab={activeTab} 
                            onTabChange={(tab) => { onTabChange(tab); setIsSidebarOpen(false); }} 
                            onLogout={onLogout} 
                            hasUploaded={userProfile?.has_uploaded}
                            language={language}
                        />
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="pt-16 md:pl-64 min-h-screen transition-all duration-300">
                <div className="p-4 sm:p-6 max-w-7xl mx-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
