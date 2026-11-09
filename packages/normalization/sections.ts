// Section detection (LLD §7.4). A convenience for locators and quality checks; content
// outside known headings is never discarded.

export const SECTION_ALIASES: Record<string, RegExp> = {
  summary: /^(professional\s+)?(summary|profile|objective|about( me)?|career objective|overview)$/i,
  experience: /^(work\s+|professional\s+|relevant\s+)?(experience|employment( history)?|work history|internships?)$/i,
  projects: /^(academic\s+|key\s+|personal\s+)?(projects?|research|deliverables|case studies)$/i,
  education: /^(education(al)?( background| qualifications?)?|academic (background|qualifications?)|qualifications?)$/i,
  skills: /^((technical|key|core|soft|hard)\s+)?(skills|competenc(ies|e)|expertise|skill set)$/i,
  tools: /^(tools|technologies|software|platforms|tech stack)( (&|and) (tools|technologies))?$/i,
  certifications: /^(certifications?|licen[cs]es?|courses|trainings?)( (&|and) [a-z ]+)?$/i,
  languages: /^languages?( known)?$/i,
  awards: /^(awards?|achievements?|honou?rs|publications?)( (&|and) [a-z ]+)?$/i,
};

/** Returns the canonical section name if `line` looks like a heading, else null. */
export function detectSection(line: string): string | null {
  const t = line.replace(/[:|•\-–—]+$/g, "").trim();
  if (t.length === 0 || t.length > 48) return null;
  for (const [name, re] of Object.entries(SECTION_ALIASES)) if (re.test(t)) return name;
  return null;
}
