import React, { useState } from 'react';
import axios from 'axios';
import { Camera, Video, UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// RECEIVE userId AS PROP
const WorkJourney = ({ userId }) => {
  
  // State to track upload status for each type
  const [uploadStatus, setUploadStatus] = useState({
    daily_task_photo: 'idle', // idle, uploading, success, error
    work_video: 'idle'
  });

  const handleFileUpload = async (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    // Safety check: Ensure user is logged in
    if (!userId) {
        alert("User ID missing. Please log in again.");
        return;
    }

    // 1. Set status to uploading
    setUploadStatus(prev => ({ ...prev, [fileType]: 'uploading' }));

    // 2. Prepare Form Data
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 3. Call the REAL Backend API using the dynamic userId prop
      const response = await axios.post(
        `http://127.0.0.1:8000/api/v1/identity/tier2/upload/${userId}?file_type=${fileType}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log("Upload success:", response.data);
      setUploadStatus(prev => ({ ...prev, [fileType]: 'success' }));

    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus(prev => ({ ...prev, [fileType]: 'error' }));
    }
  };

  // Helper component to render the status icon
  const StatusIcon = ({ status }) => {
    if (status === 'uploading') return <Loader2 className="animate-spin text-blue-500" size={20} />;
    if (status === 'success') return <CheckCircle className="text-green-500" size={20} />;
    if (status === 'error') return <AlertCircle className="text-red-500" size={20} />;
    return <UploadCloud className="text-gray-400" size={20} />;
  };

  return (
    <div className="container px-4">
      <header className="mb-6 mt-4">
        <h1 className="text-2xl font-bold mb-1 text-gray-800">My Work Journey</h1>
        <p className="text-gray-500 text-sm">Save your work memories. Show, don't just tell.</p>
      </header>

      <div className="grid gap-4 pb-20">
        {/* Card 1: Daily Task Photo */}
        <div className="card border border-gray-100 p-4 rounded-xl shadow-sm bg-white">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <Camera size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Daily Task Photo</h3>
                <p className="text-xs text-gray-500">Capture what you did today</p>
              </div>
            </div>
            <StatusIcon status={uploadStatus.daily_task_photo} />
          </div>

          {/* Hidden File Input + Custom Label Button */}
          <label className="btn-primary flex items-center justify-center gap-2 w-full text-center py-3 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors bg-blue-600 text-white">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => handleFileUpload(e, 'daily_task_photo')}
            />
            {uploadStatus.daily_task_photo === 'success' ? 'Photo Saved!' : 'Take Photo'}
          </label>
          
          {uploadStatus.daily_task_photo === 'error' && (
            <p className="text-xs text-red-500 mt-2 text-center">❌ Failed to save. Check backend.</p>
          )}
        </div>

        {/* Card 2: Work Video */}
        <div className="card border border-gray-100 p-4 rounded-xl shadow-sm bg-white">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                <Video size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Work Video</h3>
                <p className="text-xs text-gray-500">Record 30s of your skill</p>
              </div>
            </div>
            <StatusIcon status={uploadStatus.work_video} />
          </div>

          <label className="btn-primary flex items-center justify-center gap-2 w-full text-center py-3 rounded-lg cursor-pointer transition-colors text-white" style={{backgroundColor: '#7C3AED'}}>
            <input 
              type="file" 
              accept="video/*" 
              className="hidden" 
              onChange={(e) => handleFileUpload(e, 'work_video')}
            />
            {uploadStatus.work_video === 'success' ? 'Video Saved!' : 'Record Video'}
          </label>

          {uploadStatus.work_video === 'error' && (
            <p className="text-xs text-red-500 mt-2 text-center">❌ Failed to save. Check backend.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkJourney;