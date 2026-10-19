import { SearchForm, ManualForm } from "@/components/SearchForm";

export default function Recherche() {
  return (
    <>
      <h1>Trouver des prospects</h1>
      <p className="muted">SO cherche des entreprises sur Google Maps, analyse leur site, choisit l'offre ZEMA la plus pertinente et calcule un score. 5 à 10 par jour suffisent.</p>
      <h2>Recherche automatique</h2>
      <SearchForm />
      <h2>Ajouter une entreprise à la main</h2>
      <p className="muted">Pour un contact trouvé sur LinkedIn, dans un annuaire ou par recommandation.</p>
      <ManualForm />
    </>
  );
}
