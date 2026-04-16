# RESUME.md — PlaceToPadel
## Contexte de continuité — À lire en début de session pour reprendre le projet

---

## 🎯 QUI JE SUIS

**Fanomezantsoa (Voary)** — développeur principal sur PlaceToPadel.
Je travaille avec Claude (architecte/consultant) et Claude Code (implémenteur).

---

## 📋 ÉTAT GLOBAL DU PROJET — MVP MOBILE COMPLET ✅

Au **16 avril 2026 fin de session**, toute la Phase 6.2 est clôturée et tous les gaps de l'audit du 16 avril sont fermés. Le MVP mobile est prêt pour comparaison visuelle page-par-page avec Emergent 39b6544.

### Backend Laravel — 100% COMPLET ✅
**329 tests PHPUnit verts, 1165 assertions. Tout sur `main`.**

| Module | Endpoints | Tests |
|--------|-----------|-------|
| Auth | 8 | 36 |
| User/Profile | 6 | 45 |
| Club | 5 | 20 |
| Tournament | 11 *(+ /tournaments/mine)* | 44 |
| Match Engine | 7 | 44 |
| Notifications | 6 | 17 |
| Matchmaking | 12 *(+ mark-read conversation)* | 30 |
| Feed social | 9 | 24 |
| FriendlyMatch + ELO | 13 | 30 |
| GameProposal | 5 | 19 |
| Payment (Stripe) | 3 | 14 |
| **TOTAL** | **85** | **329** |

### Frontend Mobile — Phase 6.2 + audit gaps ✅
Branche : **`main`** (tout mergé, MVP complet).
Stack : React Native + Expo SDK 54 + NativeWind v4 + TanStack Query + Reanimated 4.

---

## ✅ CE QUI EST FAIT

### Backend
- Phases 0 → 5.1 complètes (Auth, User, Club, Tournament, Match Engine, Notifications, Matchmaking, Feed)
- Phase 6.2 backend : FriendlyMatch + ELO (G7), GameProposal (G8), Stripe (G9), Resend activé
- Audit gap-closing : pivot `user_clubs` multi-clubs + `period` ENUM availabilities, `GET /tournaments/mine`, `PUT /conversations/{uuid}/read`

### Frontend Mobile
- **Phase 6.1** : vertical slice MVP (auth, tournois, cockpit, profil)
- **Phase 6.1.5** : resync Emergent 39b6544 (Register refondu, AppHeader, HomePage restaurée, Cockpit vacances, Feed, Profile, Partenaires 3 modes, Matching/Organisateurs)
- **Phase 6.1.6** : Clubs (écran complet hors navbar)
- **Phase 6.2 G1→G9** : Score live, Seeking partner + Proposals inbox, Chat, QR Scanner, FriendlyMatch+ELO, GameProposal, Stripe, Resend
- **Audit gaps fermés (16 avril)** :
  - 🔴 Wizard création tournoi 3 étapes (port Emergent) + CTA Cockpit Referee + ActionCard conditionnelle role
  - 🔴 Cockpit Referee Messages branché
  - 🔴 Écran `/mes-tournois` avec 3 pills (En cours / À venir / Passés) via `/tournaments/mine`
  - 🟡 Écran `/notifications` paginé + 15 types mappés + badge Cockpit
  - 🟡 Partenaires ActionCard activée
  - 🟡 Édition profil étendue (3 clubs autocomplete + 10 slot dispos + position + padel_level)
- **Chantiers additionnels** :
  - AppHeader complet : DrawerMenu 280px + Universal Search overlay (3 requêtes parallèles, debounce 300ms) + Bell → /notifications
  - HomePage marketing restaurée (orpheline sur une branche non mergée)

### Décisions produit actées
- **BottomNav** : 5 onglets = Actu / Tournois / Cockpit (orange surélevé) / **Match** (Swords, remplace Clubs) / Partenaires
- **Clubs** : accessible via routes uniquement (hors navbar)
- **Multi-clubs** : pivot `user_clubs` avec priority 1..3, jusqu'à 3 clubs/joueur, autocomplete `/clubs/search`
- **Availabilities** : tuples `{day_of_week, period}` avec 10 slots préset (Lun-Ven soir / Sam-Dim matin & après-midi / Flexible)
- **Flexible généreux** : day null + period 'all' = exclusif, match tous les slots de l'autre (saturé à 3 dans le score dispos de MatchmakingService)
- **Stripe** : paiement par tournoi (on_site / online au choix organisateur), pas d'abonnement mensuel
- **ELO** : K=0.3, échelle 1-10, lock threshold = **10 matchs** (code Emergent fait foi vs PRD qui disait 5)
- **Emergent référence** : commit **39b6544**

---

## 🗃️ DONNÉES DE TEST EN BASE (migrate:fresh --seed)

```
Users (tokens valides sur session en cours — re-mint via tinker après migrate:fresh) :
Alice  → uuid: 019d9549-f00f-73c9-9824-b672acc57b8a  (joueur)
Thomas → uuid: 019d954a-331e-70d1-a488-ca7d769b5573  (joueur)
Sophie → uuid: 019d954a-6a29-7159-9a15-858ce6ca5c38  (joueur)
Lucas  → uuid: 019d954a-92d6-70f8-abb2-cc185e90928c  (joueur)
Marc   → uuid: 019d954a-c589-7171-8a5d-e5872cd32058  (referee/organisateur)
Emma   → uuid: 019d954a-fea2-7228-994c-e718e9c6c3b3  (joueur)
```

Tournoi 1 — "Open de Paris - Test"     uuid: `019d9553-b37a-7340-b470-e4686a5267c6`
→ on_site, P100, mixte, status: **in_progress** (lancé par Marc)
→ Alice+Thomas inscrits (Team 1), Sophie+Lucas inscrits (Team 2)
→ Emma seeking partner
→ Matchs générés par Horizon (1 match), score déjà saisi (7-9) + validation team1 partielle

Tournoi 2 — "Tournoi P100 Payant - Test" uuid: `019d9553-f0e5-7386-b7ac-c610048df04f`
→ online, Stripe 15€, P100, mixte, status: **open**
→ Alice inscrite via Stripe (paiement test validé)
→ Emma seeking partner
→ Proposal pending Alice → Emma (uuid: `019d95cd-b626-726a-a81a-c9f471cc74bf`)

Club utilisé : **4Padel Paris 20**  uuid: `019d9543-db2b-7255-8ae2-e81bdf89a193`

Commande re-seed :
```bash
cd ~/project/place2padel/backend && php artisan migrate:fresh --seed
```

---

## 🗓️ PROCHAINES ÉTAPES

### 1. Comparaison visuelle page-par-page (prochaine session)
Lancer mobile + web Emergent en parallèle et comparer chaque écran :
```bash
# Terminal 1 — backend
cd ~/project/place2padel/backend && php artisan serve --host=0.0.0.0 --port=8000

# Terminal 2 — Horizon (pour les jobs async : emails, matchs)
cd ~/project/place2padel/backend && php artisan horizon

# Terminal 3 — mobile
cd ~/project/place2padel/frontend/mobile && npx expo start --clear

# Terminal 4 — web Emergent référence
cd ~/project/placeToPadel/frontend && git checkout 39b6544 && yarn start
```

Pages à comparer dans l'ordre : HomePage marketing · Login/Register · Cockpit Player · Cockpit Referee · Tournois liste · Tournoi détail (3 statuts : open, in_progress, completed) · Mes tournois (3 pills) · Wizard création · Partenaires · MatchLive tournoi · Match amical + ELO · Conversations · Chat · Proposals · Profile · Notifications · Clubs · Matching · Organisateurs · HomePage grille.

Objectif : identifier les écarts visuels résiduels, layout, typos, couleurs, spacing et les corriger branche par branche.

### 2. Credentials externes en attente (non critiques MVP)
- **G5 Google OAuth mobile** — GOOGLE_CLIENT_ID Android + iOS (CLI Cloud Console)
- **G6 Push notifications Expo** — EAS projectId + FCM key + APNs
- **Rename scheme `place2padel` → `placetopadel://`** — bundle identifiers package.json + app.json (deep links post-Stripe, emails)

### 3. Phases suivantes
- **Phase 7 — Web Next.js** : dashboard admin + landing SEO + tournois indexables Google
- **Phase 8 — Publication** : build APK Android + IPA iOS + soumission stores

---

## 🔧 CONFIGURATION DEV

```bash
# Terminal 1 — Backend (obligatoire --host=0.0.0.0 pour émulateur)
cd ~/project/place2padel/backend
php artisan serve --host=0.0.0.0 --port=8000
php artisan horizon  # jobs async (emails, matchs, milestones)

# Terminal 2 — Frontend mobile
cd ~/project/place2padel/frontend/mobile
npx expo start --clear  # puis 'a' pour émulateur Android, 'i' iOS
```

### Variables .env mobile
```
# frontend/mobile/.env (ne pas committer)
EXPO_PUBLIC_API_URL=http://172.29.240.228:8000/api/v1
# Remplace l'IP par : hostname -I depuis WSL si changée
```

### Commandes utiles
```bash
# Re-seed complet (6 users + 2 tournois + matchs amicaux + pool/ranking)
cd ~/project/place2padel/backend && php artisan migrate:fresh --seed

# Tests backend
cd ~/project/place2padel/backend && php artisan test

# TSC mobile
cd ~/project/place2padel/frontend/mobile && npx tsc --noEmit

# Mint token debug (remplacer Alice par User ciblé)
cd ~/project/place2padel/backend && php artisan tinker --execute="use App\Models\User; echo User::where('first_name', 'Alice')->first()->createToken('debug', ['*'])->plainTextToken;"
```

### Rebuild dev client requis si
- **expo-camera** (G4 QR scan) → `npx expo run:android`
- **@react-native-community/datetimepicker** (wizard création) → dispo Expo Go sans rebuild
- **react-native-qrcode-svg** → dispo Expo Go

---

*Dernière mise à jour : 16 avril 2026 fin de session (MVP mobile complet, prêt pour comparaison visuelle Emergent 39b6544)*
*Vision & validation : Fanomezantsoa | Implémentation : Claude Code*
