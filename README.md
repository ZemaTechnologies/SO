# SO by ZEMA TECHNOLOGIES — AI Growth Agent

Version 1, semaine 1 : prospection.

## Ce que fait SO

1. **Trouver** : recherche d'entreprises par secteur et commune (Google Maps).
2. **Analyser** : site web (HTTPS, mobile, vitesse, WhatsApp, formulaire, CTA, SEO, réseaux), opportunité ZEMA, score sur 100.
3. **Préparer** : page d'aperçu personnalisée + premier e-mail rédigé par l'IA, à valider.
4. **Envoyer** : depuis la boîte OVH, 10 nouveaux contacts par jour maximum, relances J+3 et J+7 automatiques.
5. **Lire les réponses** : classement par l'IA, arrêt de la séquence, alerte e-mail si lead chaud, rappels datés.
6. **Suivre** : pipeline, historique, tableau de bord.

## Installation (une seule fois)

1. Installer les dépendances : `npm install`
2. Copier `.env.example` en `.env.local` et remplir chaque valeur (vous-même, jamais dans un chat).
3. Dans Supabase : SQL Editor > New query > coller `supabase/001_prospection.sql` > Run.
4. Lancer : `npm run dev`, puis ouvrir http://localhost:3000

## Mise en ligne

Relier le dépôt GitHub à Vercel, copier les variables de `.env.local` dans Vercel (Settings > Environment Variables) et mettre `APP_URL` sur l'adresse de production. La tâche planifiée (`vercel.json`) envoie les messages et lit les réponses chaque jour à 8 h ; le bouton « Envoyer et lire les réponses » du tableau de bord le fait à la demande.
