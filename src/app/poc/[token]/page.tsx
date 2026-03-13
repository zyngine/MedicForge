"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface POCData {
  tokenId: string;
  alreadyActioned: boolean;
  actionTaken: string | null;
  booking: { id: string; status: string; request_notes: string | null };
  shift: { title: string; shift_date: string; start_time: string; end_time: string };
  site: { name: string; address: string; city: string; state: string };
  student: { name: string };
}

export default function POCResponsePage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<POCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "deny" | null>(null);
  const [denyNotes, setDenyNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"approved" | "denied" | null>(null);

  useEffect(() => {
    if (!token) return;

    // Check URL param for pre-selected action (from email button link)
    const url = new URL(window.location.href);
    const actionParam = url.searchParams.get("action");
    if (actionParam === "approve" || actionParam === "deny") {
      setAction(actionParam);
    }

    const fetchData = async () => {
      const res = await fetch(`/api/clinical/poc/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "This link is invalid or has expired.");
      } else {
        const json = await res.json();
        setData(json);
      }
      setLoading(false);
    };

    fetchData();
  }, [token]);

  const handleApprove = async () => {
    setSubmitting(true);
    const res = await fetch(`/api/clinical/poc/${token}/approve`, { method: "POST" });
    if (res.ok) {
      setDone("approved");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to approve. Please try again.");
    }
    setSubmitting(false);
  };

  const handleDeny = async () => {
    setSubmitting(true);
    const res = await fetch(`/api/clinical/poc/${token}/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: denyNotes || null }),
    });
    if (res.ok) {
      setDone("denied");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to submit. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#b91c1c", padding: "16px 24px", display: "flex", alignItems: "center" }}>
        <span style={{ color: "white", fontWeight: "bold", fontSize: "20px" }}>MedicForge</span>
        <span style={{ color: "#fca5a5", marginLeft: "8px", fontSize: "14px" }}>Clinical Scheduling</span>
      </div>

      <div style={{ maxWidth: "560px", margin: "40px auto", padding: "0 16px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
            Loading...
          </div>
        )}

        {!loading && error && (
          <div style={{ background: "white", borderRadius: "8px", padding: "32px", border: "1px solid #e5e7eb", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h2 style={{ color: "#111827", marginTop: 0 }}>Link Unavailable</h2>
            <p style={{ color: "#6b7280" }}>{error}</p>
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              If you need assistance, please contact the program coordinator directly.
            </p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Already actioned */}
            {data.alreadyActioned && !done && (
              <div style={{ background: "white", borderRadius: "8px", padding: "32px", border: "1px solid #e5e7eb", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                  {data.actionTaken === "approved" ? "✅" : "❌"}
                </div>
                <h2 style={{ color: "#111827", marginTop: 0 }}>Already Responded</h2>
                <p style={{ color: "#6b7280" }}>
                  You previously {data.actionTaken === "approved" ? "approved" : "denied"} this shift request.
                  No further action is needed.
                </p>
              </div>
            )}

            {/* Main response UI */}
            {!data.alreadyActioned && !done && (
              <div style={{ background: "white", borderRadius: "8px", padding: "32px", border: "1px solid #e5e7eb" }}>
                <h2 style={{ color: "#111827", marginTop: 0, marginBottom: "8px" }}>Clinical Shift Request</h2>
                <p style={{ color: "#6b7280", marginTop: 0 }}>
                  Please review the request below and approve or deny.
                </p>

                {/* Shift details */}
                <div style={{ background: "#f3f4f6", borderRadius: "6px", padding: "16px", marginBottom: "20px" }}>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Student:</strong> {data.student.name}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Site:</strong> {data.site.name}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Shift:</strong> {data.shift.title}</p>
                  <p style={{ margin: "0 0 8px 0" }}><strong>Date:</strong> {data.shift.shift_date}</p>
                  <p style={{ margin: 0 }}><strong>Time:</strong> {data.shift.start_time} – {data.shift.end_time}</p>
                </div>

                {data.booking.request_notes && (
                  <div style={{ background: "#eff6ff", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px", borderLeft: "3px solid #3b82f6" }}>
                    <p style={{ margin: "0 0 4px 0", fontWeight: "600", fontSize: "14px", color: "#1d4ed8" }}>Student's note:</p>
                    <p style={{ margin: 0, color: "#374151" }}>{data.booking.request_notes}</p>
                  </div>
                )}

                {/* Action selection */}
                {action === null && (
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => setAction("approve")}
                      style={{ flex: 1, padding: "12px", background: "#16a34a", color: "white", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setAction("deny")}
                      style={{ flex: 1, padding: "12px", background: "#dc2626", color: "white", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
                    >
                      Deny
                    </button>
                  </div>
                )}

                {/* Approve confirmation */}
                {action === "approve" && (
                  <div>
                    <p style={{ color: "#374151" }}>Confirm that you are approving this shift request for <strong>{data.student.name}</strong>.</p>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <button
                        onClick={handleApprove}
                        disabled={submitting}
                        style={{ flex: 1, padding: "12px", background: "#16a34a", color: "white", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "600", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
                      >
                        {submitting ? "Approving..." : "Confirm Approval"}
                      </button>
                      <button
                        onClick={() => setAction(null)}
                        disabled={submitting}
                        style={{ padding: "12px 16px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "6px", cursor: "pointer" }}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {/* Deny with notes */}
                {action === "deny" && (
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                      Reason for denial <span style={{ fontWeight: "normal", color: "#6b7280" }}>(optional)</span>
                    </label>
                    <textarea
                      value={denyNotes}
                      onChange={(e) => setDenyNotes(e.target.value)}
                      placeholder="Capacity full, scheduling conflict, etc."
                      rows={3}
                      style={{ width: "100%", padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", resize: "vertical", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                      <button
                        onClick={handleDeny}
                        disabled={submitting}
                        style={{ flex: 1, padding: "12px", background: "#dc2626", color: "white", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "600", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
                      >
                        {submitting ? "Submitting..." : "Submit Denial"}
                      </button>
                      <button
                        onClick={() => setAction(null)}
                        disabled={submitting}
                        style={{ padding: "12px 16px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "6px", cursor: "pointer" }}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <p style={{ color: "#dc2626", marginTop: "12px", fontSize: "14px" }}>{error}</p>
                )}
              </div>
            )}

            {/* Success states */}
            {done === "approved" && (
              <div style={{ background: "white", borderRadius: "8px", padding: "32px", border: "1px solid #e5e7eb", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
                <h2 style={{ color: "#16a34a", marginTop: 0 }}>Request Approved</h2>
                <p style={{ color: "#6b7280" }}>
                  {data.student.name} has been notified. They will receive an email confirmation with the shift details.
                </p>
              </div>
            )}

            {done === "denied" && (
              <div style={{ background: "white", borderRadius: "8px", padding: "32px", border: "1px solid #e5e7eb", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
                <h2 style={{ color: "#dc2626", marginTop: 0 }}>Request Denied</h2>
                <p style={{ color: "#6b7280" }}>
                  {data.student.name} has been notified and will look for an alternative shift.
                </p>
              </div>
            )}
          </>
        )}

        <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px", marginTop: "32px" }}>
          Powered by <strong>MedicForge</strong> — EMS Training Platform
        </p>
      </div>
    </div>
  );
}
