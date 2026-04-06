"use client";

import { useState } from "react";

const FAQS = [
  {
    category: "Getting Started",
    items: [
      {
        q: "How do I create an account?",
        a: "Click 'Register' on the login page. Choose Individual Provider if you're enrolling on your own, or Agency Employee if your agency has provided an invite code. Complete your profile and accept the Terms of Service to access courses.",
      },
      {
        q: "I forgot my password. How do I reset it?",
        a: "On the login page, click 'Forgot password?' and enter your email address. You'll receive a reset link within a few minutes. Check your spam folder if you don't see it.",
      },
      {
        q: "What is an NREMT ID and why do I need it?",
        a: "Your NREMT ID (e.g., E-123456) is issued by the National Registry of Emergency Medical Technicians. It's required for CAPCE-accredited course completions to be reported to NREMT. Add it in your Account Settings.",
      },
    ],
  },
  {
    category: "Courses & CEH",
    items: [
      {
        q: "What is a CEH hour?",
        a: "CEH stands for Continuing Education Hour — the unit NREMT uses to track your continuing education. Each course lists how many CEH it awards. Requirements vary by certification level: EMR (24h), EMT (36h), AEMT (48h), Paramedic (72h) per 2-year cycle.",
      },
      {
        q: "What does CAPCE accreditation mean?",
        a: "CAPCE (Commission on Accreditation for Pre-Hospital Continuing Education) accredits CE programs to meet NREMT standards. Completing a CAPCE-accredited course means those hours count toward your NREMT recertification.",
      },
      {
        q: "How do I enroll in a course?",
        a: "Browse the Course Catalog, click on a course to view details, then click 'Enroll.' Your progress is saved automatically so you can pick up where you left off.",
      },
      {
        q: "What passing score is required?",
        a: "CAPCE-accredited courses require a minimum passing score of 70%. Your score will be shown immediately after you complete the final assessment.",
      },
      {
        q: "Can I retake a course quiz?",
        a: "Yes. If you don't pass, you can retake the assessment. Review the course content before retrying. Some courses may limit the number of attempts — check the course details page.",
      },
    ],
  },
  {
    category: "Transcripts & Certificates",
    items: [
      {
        q: "How do I get my certificate?",
        a: "Certificates are automatically generated when you complete a course and pass the assessment. Go to My Training or Transcript and click 'Download Certificate' next to the completed course.",
      },
      {
        q: "How do I view my full CE transcript?",
        a: "Go to Transcript in the navigation menu. You can see all completed courses, CEH earned, and download a printable transcript. Use the date filter to generate a transcript for a specific recertification period.",
      },
      {
        q: "Will my completions be reported to NREMT automatically?",
        a: "Reporting to NREMT is done by the CE Program Administrator on a quarterly basis. Ensure your NREMT ID is added to your profile so your completions can be included in the report.",
      },
    ],
  },
  {
    category: "Account & Privacy",
    items: [
      {
        q: "How do I update my certification level or state?",
        a: "Go to Account Settings (click your name in the navigation). Update your certification level, state, NREMT ID, or name and click Save.",
      },
      {
        q: "Who can see my training records?",
        a: "If you enrolled through an agency, your agency administrator can see your completion records. MedicForge CE program administrators can also access records for CAPCE reporting. Your data is not shared with third parties beyond NREMT reporting.",
      },
      {
        q: "How do I delete my account?",
        a: "Contact us at ce@medicforge.net to request account deletion. Note that completion records may be retained for CAPCE audit purposes for up to 7 years.",
      },
    ],
  },
];

export default function CEHelpPage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Help & FAQ</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Common questions about MedicForge CE. Can&apos;t find your answer?{" "}
          <a href="/ce/contact" className="text-blue-700 hover:underline">Contact us.</a>
        </p>
      </div>

      {FAQS.map((section) => (
        <div key={section.category}>
          <h2 className="text-base font-semibold mb-3 text-gray-800">{section.category}</h2>
          <div className="bg-white border rounded-lg divide-y">
            {section.items.map((item) => {
              const id = `${section.category}-${item.q}`;
              const isOpen = open === id;
              return (
                <div key={item.q}>
                  <button
                    onClick={() => setOpen(isOpen ? null : id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium pr-4">{item.q}</span>
                    <span className="text-muted-foreground text-lg shrink-0 leading-none">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t pt-3 bg-gray-50">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-sm">
        <p className="font-semibold text-blue-900 mb-1">Still need help?</p>
        <p className="text-blue-800">
          Email us at{" "}
          <a href="mailto:ce@medicforge.net" className="text-blue-700 underline">ce@medicforge.net</a>
          {" "}or visit the{" "}
          <a href="/ce/contact" className="text-blue-700 underline">Contact page</a>.
          We typically respond within one business day.
        </p>
      </div>
    </div>
  );
}
