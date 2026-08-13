export type Voice = {
  id: string;
  label: string;
  languages: string[];
};

export const VOICES: Voice[] = [
  { id: "aura-asteria-en", label: "Asteria", languages: ["en"] },
  { id: "aura-luna-en", label: "Luna", languages: ["en", "es"] },
  { id: "aura-stella-en", label: "Stella", languages: ["en"] },
  { id: "aura-athena-en", label: "Athena", languages: ["en", "es"] },
  { id: "aura-hera-en", label: "Hera", languages: ["en"] },
  { id: "aura-orion-en", label: "Orion", languages: ["en"] },
  { id: "aura-arcas-en", label: "Arcas", languages: ["en", "es"] },
  { id: "aura-perseus-en", label: "Perseus", languages: ["en"] },
  { id: "aura-angus-en", label: "Angus", languages: ["en", "es"] },
  { id: "aura-orpheus-en", label: "Orpheus", languages: ["en"] },
  { id: "aura-helios-en", label: "Helios", languages: ["en", "es"] },
  { id: "aura-zeus-en", label: "Zeus", languages: ["en"] },
];

export const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
];