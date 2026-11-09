// Structured operational log (Security §11.1): ids, codes and versions only.
// Never pass resume text, model output, signed URLs or keys here.
type Fields = Record<string, string | number | boolean | null | undefined>;

export function logEvent(event: string, fields: Fields = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}
