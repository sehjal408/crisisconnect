// Shared domain metadata — labels, colours, and helpers used across the UI.

export const SEVERITY = {
  critical: { label: "Critical", color: "#e0574b", soft: "#fdecea" },
  high: { label: "High", color: "#ef9b3e", soft: "#fdf1e3" },
  medium: { label: "Medium", color: "#e7c33c", soft: "#fbf6e0" },
  low: { label: "Low", color: "#43bd8b", soft: "#e8f7ef" },
};

export const INCIDENT_TYPE = {
  wildfire: { label: "Wildfire", icon: "Flame" },
  flood: { label: "Flood", icon: "Waves" },
  earthquake: { label: "Earthquake", icon: "Activity" },
  weather: { label: "Severe weather", icon: "CloudLightning" },
  road_closure: { label: "Road closure", icon: "TriangleAlert" },
  evacuation: { label: "Evacuation", icon: "Siren" },
  air_quality: { label: "Air quality", icon: "Wind" },
  other: { label: "Other", icon: "CircleAlert" },
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
