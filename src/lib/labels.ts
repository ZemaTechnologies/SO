export const STAGES: Record<string, string> = {
  identifie: "Identifié", analyse: "Analysé", qualifie: "Qualifié", contacte: "Contacté",
  relance_1: "Relance 1", relance_2: "Relance 2", reponse: "Réponse", lead_qualifie: "Lead qualifié",
  rdv: "RDV", proposition: "Proposition", negociation: "Négociation", gagne: "Gagné", perdu: "Perdu",
};
export const REPLIES: Record<string, string> = {
  interesse: "🟢 Intéressé", a_relancer: "🟡 À relancer", demande_infos: "🔵 Demande d'infos",
  pas_maintenant: "🟠 Pas maintenant", refus: "🔴 Refus", ne_plus_contacter: "⚫ Ne plus contacter",
};
export const SECTORS: Record<string, string> = {
  immobilier: "Immobilier / promotion", btp: "BTP / construction / technique", services_pro: "Services professionnels",
};
export const DISTRICTS = ["Cocody", "Marcory", "Plateau", "Treichville", "Yopougon", "Bingerville"];
export function scoreClass(s: number | null) { return s == null ? "low" : s >= 70 ? "high" : s >= 50 ? "mid" : "low"; }
export function fmtDate(d: string | null) { return d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"; }
