import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = async () => (await createClient()) as any;

interface IntegrityEvent {
  event_type: string;
  event_data: Record<string, unknown>;
  question_id?: string;
  question_number?: number;
  timestamp: string;
}

interface RequestBody {
  attemptId: string;
  tenantId: string;
  userId: string;
  events: IntegrityEvent[];
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate the requesting user
    const supabase = await getDb();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: RequestBody = await req.json();
    const { attemptId, tenantId, userId, events } = body;

    if (!attemptId || !tenantId || !userId || !events?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure the authenticated user matches the userId in the request
    if (authUser.id !== userId) {
      return NextResponse.json(
        { error: "Forbidden - user mismatch" },
        { status: 403 }
      );
    }

    // Process each event
    const results = await Promise.all(
      events.map(async (event) => {
        const { data, error } = await supabase.rpc("record_integrity_event", {
          p_attempt_id: attemptId,
          p_tenant_id: tenantId,
          p_user_id: userId,
          p_event_type: event.event_type,
          p_event_data: event.event_data || {},
          p_question_id: event.question_id || null,
          p_question_number: event.question_number || null,
        });

        if (error) {
          console.error("Error recording integrity event:", error);
          return { success: false, error: error.message };
        }

        return data;
      })
    );

    // Check if any event triggered a flag
    const flagged = results.some((r) => r?.flagged);

    return NextResponse.json({
      success: true,
      processed: events.length,
      flagged,
    });
  } catch (error) {
    console.error("Error processing integrity events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
