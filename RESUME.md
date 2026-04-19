# RESUME.md — PlaceToPadel
## Contexte de continuité — À lire en début de session pour reprendre le projet

---

## 🎯 QUI JE SUIS

**Fanomezantsoa (Voary)** — développeur principal sur PlaceToPadel.
Je travaille avec Claude (architecte/consultant) et Claude Code (implémenteur).

---

## 📋 ÉTAT GLOBAL DU PROJET — MVP MOBILE + SYNC EMERGENT d5ac086 ✅

Au **19 avril 2026 fin de session**, la sync Emergent d5ac086 est quasi-complète (27 commits derrière notre réf 39b6544 absorbés), le matching global amical est livré bout en bout (swipe + mutual like + écran matches), le profil a 4 tabs avec upload photo, et 12 des 13 chantiers post-MVP sont fermés. Il reste le **Lot A Feed** (création post + invalidations) avant de pouvoir lancer la comparaison visuelle page-par-page.

### Backend Laravel — 100% COMPLET ✅
**400 tests PHPUnit verts, 1340 assertions. Tout sur `main`.**

| Module | Endpoints | Tests |
|--------|-----------|-------|
| Auth | 10 *(+ forgot/reset password)* | 46 |
| User/Profile | 6 | 45 |
| Club | 6 *(+ /clubs/claim)* | 30 |
| Tournament | 11 | 44 |
| Match Engine | 7 | 44 |
| Notifications | 6 | 17 |
| Matchmaking | 15 *(+ /matching/candidates|swipe|matches)* | 56 |
| Feed social | 9 | 24 |
| FriendlyMatch + ELO | 13 | 30 |
| GameProposal | 5 | 19 |
| Payment (Stripe) | 3 | 14 |
| Waitlist | 1 | 7 |
| **TOTAL** | **92** | **400** |

### Frontend Mobile — Sync Emergent d5ac086 + matching amical ✅
Branche : **`main`** (tout mergé).
Stack : React Native + Expo SDK 54 + NativeWind v4 + TanStack Query + Reanimated 4 + expo-image-picker.

---

## ✅ CE QUI EST FAIT — SESSION 19 AVRIL

### Backend (après le 16 avril)

- **Sync Emergent d5ac086** (commit `c077ada`) :
  - `POST /auth/forgot-password` + `POST /auth/reset-password` via Laravel Password Broker + email Resend (`ResetPasswordMail`)
  - `POST /waitlist` (auth optionnelle) — table `waitlist_entries`, 5 features enum
  - Role `club_owner` ajouté ENUM users + colonnes `clubs.owner_id/club_type/description/picture_url/indoor/claimed_at`
  - `POST /clubs/claim` — revendication club par role=club_owner|admin
  - `StoreRegisterRequest` étendu : position + padel_level (1-5) + bio + clubs array + availabilities tuples (commit `d4520b9`, 18 tests PhpUnit)
- **Fix contrat tokens register** (commit `46d3294`) — retour `{access_token, refresh_token}` aligné sur login/refresh (avant : `token` singleton → `setTokens(undefined, undefined)` crashait mobile)
- **Matching amical global** (commit `cf75413`, Phase 4.2 backend) :
  - Tables `swipes` (UNIQUE from+to) + `player_matches` (paire normalisée)
  - `MatchmakingService::globalCompatibility` — algo Emergent exact (pos 30/20/8/10 · level 30/22/15/8/3 · dispos 25/18/10/2/8 · géo 15/10/2)
  - `GET /matching/candidates` (auth optionnelle), `POST /matching/swipe`, `GET /matching/matches`
  - Event `MatchCreated` + listener `NotifyMatchCreated` → email Resend whitelisté type `match`
  - 26 nouveaux tests PhpUnit
- **Fix throttle** `/profile/photo` (commit `2817932`) : 10/min → 60/min (trop strict pour tests upload)

### Frontend Mobile (session 19 avril)

- **Sync Emergent d5ac086** (commit `c077ada`) :
  - Écrans `app/(auth)/forgot-password.tsx` + `reset-password.tsx` avec validation Zod + lien login
  - Waitlist dans popups `home.tsx` — input email (public) ou auto-email (auth) + toast confirmation ✅
  - 3e carte Register "Patron de club" + `ClubOwnerForm` dédié + auto-fill city au pick
  - `ClubsPage` : bouton "Revendiquer" si role=club_owner|admin + badge ⭐ "Patron inscrit"
  - `ClubDetailPage` : picture 16/9 + chips owner/club_type/indoor + description + section tournois
- **Register unifié** (commit `a71dad2`) : retrait Google OAuth UI + 3 cartes chipées identiques CockpitPreview (`AccountRoleCardsList` partagé)
- **Register fix persistence** (commit `d4520b9`) :
  - Availabilities migrées `number[]` → tuples `{day_of_week, period}` avec 10 SLOT_PRESETS
  - Niveau padel 1-10 → 1-5 aligné backend
  - ClubOwnerForm `bio` rendu (description club)
  - Joueur : clubs 2 & 3 via `SecondaryClubPicker` (autocomplete debounce 300ms)
  - Referee label "CLUB PRINCIPAL *" → "CLUB (OPTIONNEL)"
- **CockpitPreview non-auth** (commit `a71dad2`) : 3 cartes chipées aux tailles Pixel 7-friendly (Joueur/Juge arbitre/Patron)
- **Cockpit Player refonte** (commit `8ae690b`) :
  - Hero navy avec avatar cliquable + grille 4 stats (Points FFT / Rang / Victoires / Tournois)
  - Barre complétion profil 6 critères (photo, bio, availabilities, club, license, padel_points)
  - Bouton "+ Nouveau post" (⚠️ placeholder — redirige vers profil)
  - 8 ActionCards dans l'ordre exact demandé + Se déconnecter rouge (tone="danger")
- **Cockpit Referee parité** (commit `2bd6ab2`) : hero stats (Tournois / En cours / — / —) + Mon profil · Espace organisateur · Publier · Ma page club conditionnel club_owner · CTAs réordonnés
- **Onglet Match refonte** (commit `356e0ca`) : hero compact icône Swords + 3 stats intégrées navy, bouton "Commence la Partie" Play, card "Règles du match" bleu light + Modal 4 règles, rename section "Parties planifiées" → "Propose une partie"
- **Matching amical mobile** (commit `58bc070`, Phase 4.2 mobile) :
  - Hooks `useMatchingCandidates` / `useSwipeCandidate` / `useMatchingMatches`
  - `CandidateCard` : photo 1:1 + badge compat% emerald + overlay navy + bio + grille 7 jours dispos
  - `SwipeableCandidate` Reanimated : translateX + rotate ±15° + opacity fade (durée 250ms cubic)
  - Post-like mutual → toast `"Match avec [name] ! 🎾"` + navigate `/conversations/{uuid}`
  - Écran `/matching/matches` liste des matches + bouton "Discuter"
  - Mode amical désormais fonctionnel (retrait ComingSoonSheet), default du tab
- **Chat CTAs propositions** (commit `7f8ac32`) : 2 pills dans le header conversation :
  - "Proposer un tournoi" → `ProposeTournamentSheet` (liste tournois `status=open` + POST propose)
  - "Match amical" → `ProposeFriendlyMatchSheet` (interlocuteur pré-rempli comme adversaire 1 locked)
- **Safe area bulk fix** (commit `7f8ac32`) : 14 occurrences `edges={['top']}` → `edges={[]}` sur tous les écrans (scan.tsx conservé justifié)
- **Profil Wins/Losses** (commit `7f8ac32`) : stats Niveau/Position → Victoires (vert) / Défaites (rouge) depuis `useUserElo`
- **AppHeader sur auth pages** (commit `f24779e`) : RootShell retire le guard `HIDE_HEADER_PREFIXES` → AppHeader visible sur login/register/forgot-password/reset-password. CTA "Inscription gratuite" masqué sur /register via `usePathname`
- **Tournois filtres dates** (commit `1f3d837`) : `DateRangeFilter` avec 2 datepickers (date_from / date_to) + helper `dateToISO` format local. Fix empty space hero (`edges={['top']}` → `[]`)
- **CockpitPreview typo équilibrée** (commits `3917906` + `95194b7`) : 3 cartes compactes tiennent sur Pixel 7 sans scroll
- **Profil 4 tabs + upload photo** (commit `77a2e72`) :
  - Bouton Camera orange sur avatar (isSelf only) → expo-image-picker + `useUploadProfilePhoto` (POST /profile/photo FormData)
  - Tabs 2→4 : Infos / Posts / Tournois / Matchs
  - Tab Posts : `useProfilePosts(uuid)` paginé + like + commentaires (sync caches via invalidation `['profile-posts']`)
  - Tab Tournois (isSelf only) : 3 sections En cours / À venir / Passés via `useMyTournaments`

### Décisions produit actées (rappel)

- **BottomNav** : 5 onglets = Actu / Tournois / Cockpit (orange surélevé) / **Match** (Swords, remplace Clubs) / Partenaires
- **Clubs** : accessible via routes uniquement (hors navbar)
- **Multi-clubs** : pivot `user_clubs` avec priority 1..3, jusqu'à 3 clubs/joueur, autocomplete `/clubs/search`
- **Availabilities** : tuples `{day_of_week, period}` avec 10 slots préset (Lun-Ven soir / Sam-Dim matin & après-midi / Flexible)
- **Flexible généreux** : day null + period 'all' = exclusif, match tous les slots de l'autre (saturé à 3 dans le score dispos de MatchmakingService)
- **Stripe** : paiement par tournoi (on_site / online au choix organisateur), pas d'abonnement mensuel
- **ELO** : K=0.3, échelle 1-10, lock threshold = **10 matchs**
- **Club owner** : `role='club_owner'` dans ENUM users + pivot `user_clubs` + `clubs.owner_id` (FK) ; `/clubs/claim` revendique
- **Emergent référence** : commit **d5ac086** (dernière sync) · commit 39b6544 = baseline historique

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

### Priorité immédiate — Lot A Feed complet

Le bouton "Nouveau post" du Cockpit Player est un placeholder (navigate `/profil/{uuid}`) ; aucun point d'entrée de création de post n'existe côté mobile. En plus, 5 invalidations de cache manquent après les actions qui déclenchent un post système backend (upload photo, création/inscription tournoi, création/validation match amical). Voir [BACKLOG.md](BACKLOG.md) Lot A.

### Lots suivants

- **Lot B P1** — audit visuel home.tsx + actualites.tsx vs Emergent d5ac086
- **Lot C P2** — actions owner (DELETE post/comment) + compositeur annonces club (patron)
- **Game Proposal UI mobile** — endpoints G8 backend prêts, UI non livrée
- **Rename scheme** `place2padel` → `placetopadel://` (deep links post-Stripe + emails)

### Comparaison visuelle page-par-page (différée jusqu'au Lot A fermé)

```bash
# Terminal 1 — backend
cd ~/project/place2padel/backend && php artisan serve --host=0.0.0.0 --port=8000
# Terminal 2 — Horizon (pour les jobs async : emails, matchs)
cd ~/project/place2padel/backend && php artisan horizon
# Terminal 3 — mobile
cd ~/project/place2padel/frontend/mobile && npx expo start --clear
# Terminal 4 — web Emergent référence
cd ~/project/placeToPadel && git log --oneline -1  # vérifier HEAD d5ac086
cd ~/project/placeToPadel/frontend && yarn start
```

### Credentials externes en attente (non critiques MVP)

- **Google OAuth mobile** — GOOGLE_CLIENT_ID Android + iOS (UI masquée, backend Socialite intact)
- **Push notifications Expo** — EAS projectId + FCM key + APNs
- **Rename scheme** `place2padel` → `placetopadel://` (dans BACKLOG)

### Phases suivantes

- **Phase 7 — Web Next.js** : dashboard admin + landing SEO + tournois indexables Google + page retour Stripe
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

# Reset rate limiter après changement throttle
cd ~/project/place2padel/backend && php artisan cache:clear && php artisan config:cache
```

### Rebuild dev client requis si

- **expo-camera** (QR scan) → `npx expo run:android`
- **expo-image-picker** (upload avatar profil — nouveau 19/4) → `npx expo run:android` pour activer les permissions natives
- **@react-native-community/datetimepicker** (wizard création + filtres dates tournois) → dispo Expo Go sans rebuild
- **react-native-qrcode-svg** → dispo Expo Go

---

*Dernière mise à jour : 19 avril 2026 fin de session (sync Emergent d5ac086 + matching global + profil 4 tabs + upload photo — prêt pour Lot A Feed)*
*Vision & validation : Fanomezantsoa | Implémentation : Claude Code*
