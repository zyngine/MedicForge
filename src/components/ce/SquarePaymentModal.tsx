"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useRef, useState } from "react";
import { X, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Square?: any;
  }
}

interface SquarePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  type: "course" | "subscription";
  courseId?: string;
  amount: number;
  title: string;
}

export function SquarePaymentModal({
  isOpen,
  onClose,
  onSuccess,
  type,
  courseId,
  amount,
  title,
}: SquarePaymentModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [card, setCard] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Square SDK once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Square) {
      setScriptLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.src =
      process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "sandbox"
        ? "https://sandbox.web.squarecdn.com/v1/square.js"
        : "https://web.squarecdn.com/v1/square.js";
    s.onload = () => setScriptLoaded(true);
    s.onerror = () => setError("Failed to load payment SDK. Please refresh.");
    document.head.appendChild(s);
  }, []);

  // Init/destroy card when modal opens or closes
  useEffect(() => {
    if (!isOpen || !scriptLoaded || !containerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cardInst: any;

    const init = async () => {
      try {
        const payments = window.Square!.payments(
          process.env.NEXT_PUBLIC_SQUARE_APP_ID!,
          process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!
        );
        cardInst = await payments.card();
        await cardInst.attach(containerRef.current);
        setCard(cardInst);
        setError(null);
      } catch (e) {
        console.error("Square init:", e);
        setError("Payment form failed to load. Please try again.");
      }
    };

    init();

    return () => {
      if (cardInst) cardInst.destroy().catch(() => {});
      setCard(null);
    };
  }, [isOpen, scriptLoaded]);

  const handlePay = async () => {
    if (!card) return;
    setProcessing(true);
    setError(null);

    try {
      const result = await card.tokenize();
      if (result.status !== "OK") {
        setError(result.errors?.[0]?.message || "Card declined. Please check your details.");
        setProcessing(false);
        return;
      }

      const res = await fetch("/api/ce/checkout/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, sourceId: result.token, courseId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Payment failed. Please try again.");
        setProcessing(false);
        return;
      }

      onSuccess(data.paymentId);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
          <div>
            <h2 className="font-semibold text-base">Complete Purchase</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <span className="text-sm text-muted-foreground">Total due today</span>
            <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div ref={containerRef} className="min-h-[100px]" />

          <Button
            onClick={handlePay}
            disabled={processing || !card}
            className="w-full"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {processing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
          </Button>

          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            Payments secured by Square
          </p>
        </div>
      </div>
    </div>
  );
}
