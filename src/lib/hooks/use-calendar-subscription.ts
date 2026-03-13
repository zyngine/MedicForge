"use client";

import { useState, useEffect } from "react";

interface CalendarSubscription {
  token: string;
  subscriptionUrl: string;
  webcalUrl: string;
}

interface UseCalendarSubscriptionResult {
  subscription: CalendarSubscription | null;
  isLoading: boolean;
  error: string | null;
}

export function useCalendarSubscription(): UseCalendarSubscriptionResult {
  const [subscription, setSubscription] = useState<CalendarSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch("/api/calendar/subscribe", { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || "Failed to get calendar subscription");
          return;
        }
        const data = await res.json();
        setSubscription(data);
      } catch {
        setError("Failed to get calendar subscription");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  return { subscription, isLoading, error };
}
