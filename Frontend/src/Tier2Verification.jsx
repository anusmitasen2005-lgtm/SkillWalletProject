
import React, { useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api/v1";

function Tier2Verification() {
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [message, setMessage] = useState("");

  const handleTier2Submit = async () => {
    const token = localStorage.getItem("skillWalletToken");

    if (!token) {
      setMessage("No token found. Please login first.");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/identity/tier2`,
        {
          aadhaar_number: aadhaar,
          pan_card: pan,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // IMPORTANT
          },
        }
      );

      setMessage("Tier 2 verification successful!");
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.detail || "Failed. Try again.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Tier 2 Identity Verification</h1>

      <input
        type="text"
        placeholder="Aadhaar Number"
        value={aadhaar}
        onChange={(e) => setAadhaar(e.target.value)}
      />
      <br />
      <input
        type="text"
        placeholder="PAN Card Number"
        value={pan}
        onChange={(e) => setPan(e.target.value)}
      />
      <br />
      <button onClick={handleTier2Submit}>Submit Tier 2</button>

      <p>{message}</p>
    </div>
  );
}

export default Tier2Verification;