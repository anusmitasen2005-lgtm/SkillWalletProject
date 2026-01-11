import React from "react";

function Login({
  phoneNumber,
  setPhoneNumber,
  otpCode,
  setOtpCode,
  sendOtp,
  verifyOtp,
  loading,
  message
}) {
  return (
    <div className="min-h-screen bg-gray-100">

      {/* ===== Distinct Header Section ===== */}
      <header className="w-full bg-indigo-600 shadow-md px-6 py-4 mb-8">
        <h2 className="text-xl font-bold text-white tracking-wide">
          SkillWallet
        </h2>
      </header>

      {/* ===== Existing Login UI (UNCHANGED) ===== */}
      <div className="text-center mt-16">
        <h1 className="text-3xl font-bold text-gray-800">
          Skill Wallet Login (Tier 1)
        </h1>
        <p className="mt-2 text-gray-600">
          Enter 10-digit Indian Mobile Number
        </p>

        <div className="mt-4">
          <input
            type="tel"
            placeholder="Mobile Number (e.g., 9876543210)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            maxLength={10}
            className="px-3 py-2 w-56 border border-gray-400"
          />
          <button
            onClick={sendOtp}
            disabled={loading}
            className="ml-2 px-3 py-2 border border-gray-400"
          >
            Get OTP
          </button>
        </div>

        <div className="mt-3">
          <input
            type="text"
            placeholder="Enter OTP Code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            className="px-3 py-2 w-56 border border-gray-400"
          />
          <button
            onClick={verifyOtp}
            disabled={loading}
            className="ml-2 px-3 py-2 border border-gray-400"
          >
            Verify & Log In
          </button>
        </div>

        {message && <p className="mt-3">{message}</p>}
      </div>
    </div>
  );
}

export default Login;
