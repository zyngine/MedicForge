"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { CheckCircle } from "lucide-react";

const TOPICS = [
  "Technical issue with a course",
  "Certificate or transcript question",
  "Account or login problem",
  "NREMT reporting question",
  "Agency / group enrollment",
  "Billing or subscription",
  "Other",
];

export default function CEContactPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const response = await fetch("/api/ce/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        setError("Failed to send message. Please email us directly at ce@medicforge.net.");
        return;
      }
      setSent(true);
    } catch {
      setError("Failed to send message. Please email us directly at ce@medicforge.net.");
    }
    setSending(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Contact Us</h1>
        <p className="text-muted-foreground text-sm mt-1">We typically respond within one business day.</p>
      </div>

      {sent ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Message sent</p>
            <p className="text-sm text-green-700 mt-1">
              Thanks for reaching out. We&apos;ll reply to <strong>{form.email}</strong> within one business day.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
              <Input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Topic</label>
              <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm">
                <option value="">Select a topic...</option>
                {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Message <span className="text-red-500">*</span></label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm resize-none"
                rows={5}
                placeholder="Describe your question or issue in detail..."
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={submit} disabled={sending}>
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-card border rounded-lg p-4">
          <p className="font-semibold mb-1">Email</p>
          <a href="mailto:ce@medicforge.net" className="text-blue-700 hover:underline">ce@medicforge.net</a>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="font-semibold mb-1">Response Time</p>
          <p className="text-muted-foreground">1 business day</p>
        </div>
        <div className="bg-card border rounded-lg p-4 col-span-2">
          <p className="font-semibold mb-1">Before contacting us</p>
          <p className="text-muted-foreground text-xs">
            Check the <a href="/ce/help" className="text-blue-700 hover:underline">Help & FAQ</a> — most common questions are answered there, including NREMT ID setup, certificates, and reporting.
          </p>
        </div>
      </div>
    </div>
  );
}
