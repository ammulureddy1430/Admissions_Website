import { EvidenceItem, NpcDefinition } from "./Types";

export const MISSING_TROPHY_CASE = {
  id: "missing-innovation-trophy",
  title: "Where Did the Trophy Go?",
  evidence: [
    { id: "camera", label: "Camera video", icon: "📹", x: 704, y: 116, action: "Observe", quality: "relevant", relatedEvidence: ["tracks", "keycard"], description: "The video clearly shows Ms. Reed moving the trophy on a trolley toward Storage." },
    { id: "tracks", label: "Trolley marks", icon: "〰️", x: 514, y: 330, action: "Inspect", quality: "relevant", relatedEvidence: ["camera", "keycard"], description: "The trolley marks go directly from the empty display to the Storage door." },
    { id: "keycard", label: "Storage record", icon: "🔑", x: 665, y: 420, action: "Examine", quality: "relevant", relatedEvidence: ["camera", "tracks"], description: "The door record says Ms. Reed opened Storage after moving the trophy." },
    { id: "lunchbox", label: "Lunch box", icon: "🥪", x: 174, y: 450, action: "Open", quality: "irrelevant", relatedEvidence: [], description: "This belongs to Maya. It has been here since lunchtime." },
  ] satisfies EvidenceItem[],
  npcs: [
    { id: "caretaker", name: "Ms. Reed", color: "#fb923c", speed: 30, path: [{ x: 590, y: 455 }, { x: 705, y: 455 }, { x: 705, y: 330 }, { x: 590, y: 455 }], contradiction: true, dialogue: ["I moved some things after school.", "I moved the trophy to Storage so the display case could be cleaned." ] },
  ] satisfies NpcDefinition[],
};
