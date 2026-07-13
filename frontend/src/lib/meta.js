// Shared domain metadata — labels, colours, and helpers used across the UI.

export const SEVERITY = {
  critical: { label: "Critical", color: "#e0574b", soft: "#fdecea" },
  high: { label: "High", color: "#ef9b3e", soft: "#fdf1e3" },
  medium: { label: "Medium", color: "#e7c33c", soft: "#fbf6e0" },
  low: { label: "Low", color: "#43bd8b", soft: "#e8f7ef" },
};

export const INCIDENT_TYPE = {
  wildfire: { label: "Wildfire", icon: "Flame", color: "#ea6a3a", anim: "ico-flame" },
  flood: { label: "Flood", icon: "Waves", color: "#2e86de", anim: "ico-wave" },
  earthquake: { label: "Earthquake", icon: "Activity", color: "#c98a3a", anim: "ico-quake" },
  weather: { label: "Severe weather", icon: "CloudLightning", color: "#6d77e6", anim: "ico-bolt" },
  road_closure: { label: "Road closure", icon: "TriangleAlert", color: "#ef9b3e", anim: "ico-pulse" },
  evacuation: { label: "Evacuation", icon: "Siren", color: "#e0574b", anim: "ico-pulse" },
  air_quality: { label: "Air quality", icon: "Wind", color: "#6e9e7a", anim: "ico-drift" },
  other: { label: "Other", icon: "CircleAlert", color: "#8a97a3", anim: "" },
};

export const REQUEST_TYPE = {
  medical: { label: "Medical", icon: "HeartPulse" },
  shelter: { label: "Shelter", icon: "House" },
  transportation: { label: "Transport", icon: "Car" },
  food: { label: "Food", icon: "Utensils" },
  water: { label: "Water", icon: "Droplets" },
  information: { label: "Information", icon: "Info" },
  other: { label: "Other", icon: "CircleHelp" },
};

// Request lifecycle (matches the DB CHECK constraint)
export const REQUEST_STATUS = {
  pending: { label: "Pending", tone: "slate" },
  reviewed: { label: "Reviewed", tone: "blue" },
  assigned: { label: "Assigned", tone: "amber" },
  in_progress: { label: "In progress", tone: "amber" },
  resolved: { label: "Resolved", tone: "green" },
  closed: { label: "Closed", tone: "slate" },
};

// AI triage priority bands (Week 9). Kept in sync with the backend rubric:
// critical >=85, urgent 60-84, standard 30-59, low <30.
export const PRIORITY = {
  critical: { label: "Critical", tone: "red", color: "#e0574b" },
  urgent: { label: "Urgent", tone: "amber", color: "#ef9b3e" },
  standard: { label: "Standard", tone: "blue", color: "#2e86de" },
  low: { label: "Low", tone: "slate", color: "#8a97a3" },
};

export function priorityBand(score) {
  if (score == null) return null;
  if (score >= 85) return "critical";
  if (score >= 60) return "urgent";
  if (score >= 30) return "standard";
  return "low";
}

export const ASSIGNMENT_STATUS = {
  assigned: { label: "Assigned", tone: "amber" },
  accepted: { label: "Accepted", tone: "blue" },
  in_progress: { label: "In progress", tone: "amber" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "slate" },
};

export const SHELTER_STATUS = {
  open: { label: "Open", tone: "green" },
  full: { label: "Full", tone: "amber" },
  closed: { label: "Closed", tone: "slate" },
};

export const SKILLS = {
  first_aid: "First aid",
  driving: "Driving",
  translation_fr: "Translation (FR)",
  search_rescue: "Search & rescue",
  logistics: "Logistics",
  counselling: "Counselling",
};

export function timeAgo(iso) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function titleCase(s) {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fullDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
