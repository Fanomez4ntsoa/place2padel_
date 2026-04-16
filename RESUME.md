# RESUME.md — PlaceToPadel
## Contexte de continuité — À lire en début de session pour reprendre le projet

---

## 🎯 QUI JE SUIS

**Fanomezantsoa (Voary)** — développeur principal sur PlaceToPadel.
Je travaille avec Claude (architecte/consultant) et Claude Code (implémenteur).

---

## 📋 ÉTAT GLOBAL DU PROJET

### Backend Laravel — 100% COMPLET ✅
**309 tests PHPUnit verts, 1108 assertions. Tout sur `main`.**

| Module | Endpoints | Tests |
|--------|-----------|-------|
| Auth | 8 | 36 |
| User/Profile | 6 | 45 |
| Club | 5 | 20 |
| Tournament | 10 | 35 |
| Match Engine | 7 | 43 |
| Notifications | 6 | 17 |
| Matchmaking | 11 | 27 |
| Feed social | 9 | 24 |
| FriendlyMatch + ELO | 13 | 30 |
| GameProposal | 5 | 19 |
| Payment (Stripe) | 3 | 14 |
| **TOTAL** | **83** | **309** |

### Frontend Mobile — Phase 6.2 EN COURS (grand test)
Branche : **`main`** (tout mergé)
Stack : React Native + Expo SDK 54 + NativeWind v4 + TanStack Query

---

## ✅ CE QUI EST FAIT (phases complètes)

### Backend
- Phases 0 → 5.1 complètes (Auth, User, Club, Tournament, Match Engine, Notifications, Matchmaking, Feed)
- Phase 6.2 backend : FriendlyMatch + ELO (G7a), GameProposal (G8), Stripe (G9), Resend activé

### Frontend Mobile
- Phase 6.1 : vertical slice MVP
- Phase 6.1.5 : resync Emergent d541157 (7 groupes — Register, HomePage, AppHeader, Cockpit, Feed, Profile, Partenaires, Organisateurs, Matching)
- Phase 6.1.6 : Clubs (5ème onglet complet)
- Phase 6.2 G1→G9 : Score live, Seeking partner, Chat, QR Scanner, FriendlyMatch+ELO, GameProposal, Stripe, Resend

### Décisions produit actées
- **BottomNav** : Actu / Tournois / Cockpit / **Match** (Swords, remplace Clubs) / Partenaires
- **Clubs** : accessible via routes uniquement (hors navbar)
- **Stripe** : paiement par tournoi (on_site/online), pas d'abonnement mensuel
- **Google OAuth** : masqué visuellement, backend Socialite intact
- **ELO** : K=0.3, échelle 1-10, lock threshold = **10 matchs** (pas 5 comme la PRD Emergent — le code fait foi)
- **Emergent référence** : commit **39b6544** (mis à jour depuis d541157)

---

## 🧪 GRAND TEST EN COURS

### Données de test en base (BDD clean depuis migrate:fresh --seed)
```
Alice  → token: 7|xbDC4... | uuid: 019d9549-f00f-73c9-9824-b672acc57b8a  (joueur)
Thomas → token: 9|EYQT9... | uuid: 019d954a-331e-70d1-a488-ca7d769b5573  (joueur)
Sophie → token: 11|2npT... | uuid: 019d954a-6a29-7159-9a15-858ce6ca5c38  (joueur)
Lucas  → token: 13|MH9z... | uuid: 019d954a-92d6-70f8-abb2-cc185e90928c  (joueur)
Marc   → token: 15|AtRK... | uuid: 019d954a-c589-7171-8a5d-e5872cd32058  (referee/organisateur)
Emma   → token: 17|GQHJ... | uuid: 019d954a-fea2-7228-994c-e718e9c6c3b3  (joueur)
```

Tournoi 1 — "Open de Paris - Test"     uuid: 019d9553-b37a-7340-b470-e4686a5267c6
→ on_site, P100, mixte, status: IN_PROGRESS (lancé par Marc)
→ Alice+Thomas inscrits (Team 1), Sophie+Lucas inscrits (Team 2)
→ Emma en seeking partner
→ Matchs générés par Horizon ✅
Tournoi 2 — "Tournoi P100 Payant - Test" uuid: 019d9553-f0e5-7386-b7ac-c610048df04f
→ online, Stripe 15€, P100, mixte, status: OPEN
→ Alice inscrite via Stripe (paiement test validé ✅)
Club utilisé — 4Padel Paris 20  uuid: 019d9543-db2b-7255-8ae2-e81bdf89a193


### Étapes du grand test — état actuel
| # | Étape | Statut |
|---|-------|--------|
| 1 | Login Alice | ✅ OK |
| 2 | Navbar 5 onglets | ✅ OK |
| 3 | Liste tournois + badge prix | ✅ OK (fix badge prix appliqué) |
| 4 | Détail Tournoi 1 (tabs, équipes, seeking) | ✅ OK |
| 5 | Détail Tournoi 2 Stripe CTA | ✅ OK |
| 6 | Flow Stripe complet + auto-inscription | ✅ OK |
| 7 | Bouton Lancer tournoi (Marc) | ✅ OK (fix appliqué) |
| 8 | **Score live — MatchLive** | 🔴 EN COURS — 2 bugs |

---

## 🔴 BUGS EN COURS À CORRIGER

### Bug 1 — Badge LIVE absent dans MatchLive
**Fichier** : `app/matches/[id].tsx`
**Symptôme** : badge rouge pulsé "LIVE" absent même quand `match.status === 'in_progress'`
**Piste** : vérifier la condition d'affichage + si le statut retourné par l'API correspond bien à `'in_progress'`

### Bug 2 — Boutons +/− visibles pour Marc (non-participant)
**Fichier** : `app/matches/[id].tsx` — fonction `computePermissions`
**Symptôme** : Marc voit les boutons +/− alors qu'il n'est ni capitaine ni partenaire. Tap → erreur "Seuls capitaines et partenaires peuvent saisir le score"
**Fix attendu** : `canScore = false` pour les non-participants → boutons masqués (pas juste désactivés)
**Piste** : `computePermissions` croise `tournament.teams` avec les participants du match. Vérifier que `user.uuid` et `tournament` sont bien passés à l'écran MatchLive via les query params router.

---

## 📋 BACKLOG (fichier BACKLOG.md à la racine)

### 🟡 En attente
1. **Page retour post-paiement Stripe** : actuellement redirige vers `localhost:3000/tournois/{uuid}?session_id=...` (FRONTEND_URL inexistant). Créer endpoint Laravel `/payment/success` ou page Next.js Phase 7. Prérequis : deep link `placetopadel://` + rename scheme dans `app.json` (actuellement `place2padel`).

### ✅ Résolus
1. CTA "S'inscrire" masqué pour creator + referee (fix `7e901c3`)
2. Badge prix manquant sur TournamentCard (fix `982cffd`)
3. Bouton "Lancer le tournoi" manquant (fix `149a67a` — n'avait pas été mergé depuis feature branch)
4. G1 Score live non mergé sur main (fix `3f9e009` + `41a33f1`)
5. Rules of Hooks violation dans TournamentDetailScreen (fix `f632ea4`)
6. Tabs détail tournoi : 3 tabs strict selon status (fix `f44e77f`)

---

## 🔧 CONFIGURATION DEV

```bash
# Terminal 1 — Backend
cd ~/project/place2padel/backend
php artisan serve --host=0.0.0.0 --port=8000
php artisan horizon  # obligatoire pour les jobs (génération matchs, emails)

# Terminal 2 — Frontend mobile
cd ~/project/place2padel/frontend/mobile
npx expo start --clear  # puis 'a' pour émulateur Android
```

EXPO_PUBLIC_API_URL=http://172.29.240.228:8000/api/v1
IP = hostname -I depuis WSL si changée

---

## 🗓️ PROCHAINES ÉTAPES

### Continuer le grand test (après fix bugs MatchLive)
Reprendre à l'**Étape 8 — Score live** :
- [ ] Badge LIVE rouge pulsé visible (après fix Bug 1)
- [ ] Boutons +/− masqués pour Marc (après fix Bug 2)
- [ ] Connecter Alice → taper sur son match → score fonctionnel
- [ ] Tie-break 8-8 → modal
- [ ] Double validation capitaine → match completed
- [ ] ELO mis à jour

### Étapes restantes du grand test
- [ ] Étape 9 — Seeking partner (Emma dans Partenaires)
- [ ] Étape 10 — Propositions + Chat
- [ ] Étape 11 — Match amical (G7) — 4 comptes
- [ ] Étape 12 — QR code
- [ ] Étape 13 — Profil + onglet Matchs + ELO
- [ ] Régression globale finale
- [ ] `php artisan test` → 309 verts
- [ ] `npx tsc --noEmit` → clean

### Après le grand test
- [ ] G5 Google OAuth mobile (credentials en attente)
- [ ] G6 Push Expo (EAS configuration en cours)
- [ ] Phase 7 Web Next.js
- [ ] Phase 8 Publication stores

---

*Dernière mise à jour : 16 avril 2026*
*Vision & validation : Fanomezantsoa | Implémentation : Claude Code*