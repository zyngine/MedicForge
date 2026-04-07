import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "MedicForge CE — Continuing Education for EMS",
    template: "%s | MedicForge CE",
  },
  description:
    "Quality continuing education for EMS providers. Built to CAPCE standards. Accepted in Pennsylvania and states that recognize approved providers.",
};

export default function CELayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-card text-foreground">
      {children}
    </div>
  );
}
