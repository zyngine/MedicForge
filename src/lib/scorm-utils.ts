/**
 * SCORM Utilities
 * Support for SCORM 1.2 and SCORM 2004 packages
 */

export interface ScormManifest {
  version: "scorm_1.2" | "scorm_2004";
  title: string;
  description?: string;
  entryPoint: string;
  organizations: ScormOrganization[];
  resources: ScormResource[];
}

export interface ScormOrganization {
  identifier: string;
  title: string;
  items: ScormItem[];
}

export interface ScormItem {
  identifier: string;
  title: string;
  resourceId?: string;
  children?: ScormItem[];
}

export interface ScormResource {
  identifier: string;
  type: string;
  href?: string;
  files: string[];
}

/**
 * Parse SCORM manifest XML
 */
export function parseManifest(xmlString: string): ScormManifest {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  // Check for parsing errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid manifest XML");
  }

  // Detect SCORM version
  const schemaVersion = doc.querySelector("schemaversion");
  const version: "scorm_1.2" | "scorm_2004" = schemaVersion?.textContent?.includes("2004")
    ? "scorm_2004"
    : "scorm_1.2";

  // Get manifest root
  const manifest = doc.querySelector("manifest");
  if (!manifest) {
    throw new Error("No manifest element found");
  }

  // Parse organizations
  const organizations: ScormOrganization[] = [];
  const defaultOrgId = doc.querySelector("organizations")?.getAttribute("default") || "";

  doc.querySelectorAll("organizations > organization").forEach((org) => {
    const orgId = org.getAttribute("identifier") || "";
    const orgTitle = org.querySelector("title")?.textContent || "Untitled";

    const items = parseItems(org);

    organizations.push({
      identifier: orgId,
      title: orgTitle,
      items,
    });
  });

  // Parse resources
  const resources: ScormResource[] = [];
  doc.querySelectorAll("resources > resource").forEach((res) => {
    const files: string[] = [];
    res.querySelectorAll("file").forEach((file) => {
      const href = file.getAttribute("href");
      if (href) files.push(href);
    });

    resources.push({
      identifier: res.getAttribute("identifier") || "",
      type: res.getAttribute("type") || "",
      href: res.getAttribute("href") || undefined,
      files,
    });
  });

  // Find entry point
  let entryPoint = "";
  const defaultOrg = organizations.find((o) => o.identifier === defaultOrgId) || organizations[0];
  if (defaultOrg?.items[0]?.resourceId) {
    const resource = resources.find((r) => r.identifier === defaultOrg.items[0].resourceId);
    entryPoint = resource?.href || "";
  }
  if (!entryPoint && resources[0]?.href) {
    entryPoint = resources[0].href;
  }

  // Get title from manifest or first organization
  const title =
    doc.querySelector("manifest > metadata > lom > general > title > langstring")?.textContent ||
    doc.querySelector("manifest > metadata > lom > general > title")?.textContent ||
    defaultOrg?.title ||
    "SCORM Package";

  const description =
    doc.querySelector("manifest > metadata > lom > general > description > langstring")?.textContent ||
    doc.querySelector("manifest > metadata > lom > general > description")?.textContent ||
    undefined;

  return {
    version,
    title,
    description,
    entryPoint,
    organizations,
    resources,
  };
}

function parseItems(parent: Element): ScormItem[] {
  const items: ScormItem[] = [];

  parent.querySelectorAll(":scope > item").forEach((item) => {
    items.push({
      identifier: item.getAttribute("identifier") || "",
      title: item.querySelector(":scope > title")?.textContent || "Untitled",
      resourceId: item.getAttribute("identifierref") || undefined,
      children: parseItems(item),
    });
  });

  return items;
}

/**
 * SCORM 1.2 CMI Data Model
 */
export interface Scorm12CMI {
  "cmi.core.student_id"?: string;
  "cmi.core.student_name"?: string;
  "cmi.core.lesson_location"?: string;
  "cmi.core.lesson_status"?: string;
  "cmi.core.entry"?: string;
  "cmi.core.score.raw"?: string;
  "cmi.core.score.min"?: string;
  "cmi.core.score.max"?: string;
  "cmi.core.total_time"?: string;
  "cmi.core.session_time"?: string;
  "cmi.core.exit"?: string;
  "cmi.suspend_data"?: string;
  "cmi.launch_data"?: string;
  "cmi.comments"?: string;
  [key: string]: string | undefined;
}

/**
 * SCORM 2004 CMI Data Model
 */
export interface Scorm2004CMI {
  "cmi.learner_id"?: string;
  "cmi.learner_name"?: string;
  "cmi.location"?: string;
  "cmi.completion_status"?: string;
  "cmi.success_status"?: string;
  "cmi.entry"?: string;
  "cmi.score.raw"?: string;
  "cmi.score.min"?: string;
  "cmi.score.max"?: string;
  "cmi.score.scaled"?: string;
  "cmi.total_time"?: string;
  "cmi.session_time"?: string;
  "cmi.exit"?: string;
  "cmi.suspend_data"?: string;
  "cmi.progress_measure"?: string;
  [key: string]: string | undefined;
}

/**
 * Convert SCORM time format to seconds
 */
export function parseScormTime(timeString: string): number {
  if (!timeString) return 0;

  // SCORM 1.2 format: HH:MM:SS.SS
  const scorm12Match = timeString.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);
  if (scorm12Match) {
    const hours = parseInt(scorm12Match[1], 10);
    const minutes = parseInt(scorm12Match[2], 10);
    const seconds = parseFloat(scorm12Match[3]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  // SCORM 2004 format: P[yY][mM][dD][T[hH][mM][sS]]
  const scorm2004Match = timeString.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i
  );
  if (scorm2004Match) {
    const hours = parseInt(scorm2004Match[1] || "0", 10);
    const minutes = parseInt(scorm2004Match[2] || "0", 10);
    const seconds = parseFloat(scorm2004Match[3] || "0");
    return hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}

/**
 * Convert seconds to SCORM time format
 */
export function formatScormTime(
  seconds: number,
  version: "scorm_1.2" | "scorm_2004"
): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round((seconds % 60) * 100) / 100;

  if (version === "scorm_2004") {
    let result = "PT";
    if (hours > 0) result += `${hours}H`;
    if (minutes > 0) result += `${minutes}M`;
    result += `${secs}S`;
    return result;
  }

  // SCORM 1.2
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(Math.floor(secs))}`;
}

/**
 * Get lesson status label
 */
export function getLessonStatusLabel(status: string | null | undefined): {
  label: string;
  color: string;
} {
  switch (status) {
    case "completed":
    case "passed":
      return { label: "Completed", color: "green" };
    case "incomplete":
      return { label: "In Progress", color: "yellow" };
    case "failed":
      return { label: "Failed", color: "red" };
    case "not attempted":
    default:
      return { label: "Not Started", color: "gray" };
  }
}

/**
 * Initialize CMI data for a new attempt
 */
export function initializeCMI(
  version: "scorm_1.2" | "scorm_2004",
  studentId: string,
  studentName: string,
  previousData?: Record<string, string>
): Record<string, string> {
  if (version === "scorm_2004") {
    return {
      "cmi.learner_id": studentId,
      "cmi.learner_name": studentName,
      "cmi.completion_status": "unknown",
      "cmi.success_status": "unknown",
      "cmi.entry": previousData ? "resume" : "ab-initio",
      "cmi.mode": "normal",
      "cmi.credit": "credit",
      ...previousData,
    };
  }

  // SCORM 1.2
  return {
    "cmi.core.student_id": studentId,
    "cmi.core.student_name": studentName,
    "cmi.core.lesson_status": "not attempted",
    "cmi.core.entry": previousData ? "resume" : "ab-initio",
    "cmi.core.lesson_mode": "normal",
    "cmi.core.credit": "credit",
    ...previousData,
  };
}
