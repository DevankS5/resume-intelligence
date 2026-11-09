// Canonical tool/skill alias registry (LLD §9.1). Distinct tools stay distinct:
// GaBi, SimaPro and OpenLCA never collapse into one another. Unknown names pass through.

interface Alias { canonical: string; category: string; pattern: RegExp }

const REGISTRY: Alias[] = [
  { canonical: "GaBi", category: "LCA software", pattern: /^(sphera\s+)?ga\s*bi( software| ts)?$/i },
  { canonical: "SimaPro", category: "LCA software", pattern: /^sima\s*-?\s*pro( software)?$/i },
  { canonical: "OpenLCA", category: "LCA software", pattern: /^open\s*-?\s*lca( software)?$/i },
  { canonical: "Ecoinvent", category: "LCA database", pattern: /^eco\s*-?\s*invent( database)?$/i },
  { canonical: "Figma", category: "Design software", pattern: /^figma$/i },
  { canonical: "Adobe XD", category: "Design software", pattern: /^(adobe\s+)?xd$/i },
  { canonical: "Sketch", category: "Design software", pattern: /^sketch$/i },
  { canonical: "Framer", category: "Design software", pattern: /^framer$/i },
  { canonical: "Canva", category: "Design software", pattern: /^canva$/i },
  { canonical: "Power BI", category: "Analytics software", pattern: /^power\s*bi$/i },
  { canonical: "Tableau", category: "Analytics software", pattern: /^tableau$/i },
  { canonical: "Python", category: "Programming", pattern: /^python( 3)?$/i },
  { canonical: "SQL", category: "Programming", pattern: /^(sql|mysql|postgresql|postgres)$/i },
  { canonical: "MS Excel", category: "Office software", pattern: /^(ms |microsoft )?excel$/i },
];

export function canonicalTool(raw: string): { canonical: string; category: string | null } {
  const t = raw.trim().replace(/\s+/g, " ");
  for (const a of REGISTRY) if (a.pattern.test(t)) return { canonical: a.canonical, category: a.category };
  return { canonical: t, category: null };
}

export const GABI_SIMAPRO = /\b(ga\s*bi|sima\s*-?\s*pro)\b/i;
export const OPENLCA = /\bopen\s*-?\s*lca\b/i;
