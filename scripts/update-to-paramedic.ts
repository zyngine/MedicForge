import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateToParamedic() {
  console.log("Updating all NREMT questions to Paramedic level...\n");

  // Update all questions from the NREMT Practice Bank to Paramedic
  const { error: updateError } = await supabase
    .from("question_bank")
    .update({ certification_level: "Paramedic" })
    .eq("source", "NREMT Practice Bank");

  if (updateError) {
    console.error("Update error:", updateError.message);
    return;
  }

  // Verify the update
  const { data, error } = await supabase
    .from("question_bank")
    .select("certification_level")
    .eq("source", "NREMT Practice Bank");

  if (error) {
    console.error("Verify error:", error.message);
    return;
  }

  const paramedic = data?.filter(q => q.certification_level === "Paramedic").length || 0;
  const other = data?.filter(q => q.certification_level !== "Paramedic").length || 0;

  console.log("Update complete!");
  console.log(`  Paramedic level: ${paramedic}`);
  console.log(`  Other levels: ${other}`);
}

updateToParamedic();
