import React from "react";

export default function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ display: "block", color: "#94a3b8", fontSize: "11px", fontWeight: 700, marginBottom: "4px", textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
