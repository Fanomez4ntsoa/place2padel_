# RESUME.md — PlaceToPadel
## Contexte de continuité — À lire en début de session pour reprendre le projet

---

## 🎯 QUI JE SUIS

**Fanomezantsoa (Voary)** — développeur principal sur PlaceToPadel.
Je travaille avec Claude (architecte/consultant) et Claude Code (implémenteur).

---

## 📋 ÉTAT GLOBAL — SESSION 20 AVRIL 2026 — COMPARAISON EMERGENT QUASI-COMPLÈTE ✅

Au **20 avril 2026 fin de session**, la comparaison visuelle page-par-page vs
Emergent d5ac086 est **quasi-terminée**. Toutes les pages principales de l'app
mobile ont été auditées et mises au niveau de la référence web (certaines
dépassant Emergent sur des aspects mobiles comme le modal tie-break, les
actions owner inline, et la bracket view SVG RN).

**Backend : 100% complet — 417 tests PHPUnit verts, 0 failed, 1398 assertions.**

### Backend Laravel — récap modules

| Module | Endpoints | Tests |
|--------|-----------|-------|
| Auth *(+ forgot/reset password)* | 10 | 46 |
| User/Profile *(+ multi-clubs + availabilities period)* | 6 | 45 |
| Club *(+ /clubs/claim + subscribers_count)* | 6 | 30 |
| Tournament *(+ /tournaments/mine + delete policy)* | 11 | 44 |
| Match Engine *(+ started_at capture)* | 7 | 44 *(+3)* |
| Notifications | 6 | 17 |
| Matchmaking *(+ /matching/candidates\|swipe\|matches)* | 15 | 56 |
| Feed social *(+ post_type/metadata/post_aspect)* | 9 | 36 *(+12 SystemPostsTest)* |
| FriendlyMatch + ELO *(+ /result-photo)* | 13 | 30 |
| GameProposal | 5 | 19 |
| Payment (Stripe) | 3 | 14 |
| Waitlist | 1 | 7 |
| **TOTAL** | **92** | **417** *(1398 assertions)* |

### Frontend Mobile — sur `main` ✅

Stack : React Native + Expo SDK 54 + NativeWind v4 + TanStack Query +
Reanimated 4 + expo-image-picker + expo-camera + react-native-svg.

---

## ✅ CE QUI EST FAIT — SESSION 20 AVRIL

### Features livrées (7 merges successifs)

1. **Lot A Feed complet** (`261847b`) — composer post (FAB actualites + card
   tab Posts profil + wire Cockpit) + invalidations centralisées 5 mutations
2. **Feed posts système** (`261847b`) — migration post_type/metadata/post_aspect
   + 3 listeners (welcome post, match_result, tournament_club) + referee_announcement
   whitelist + backfill welcome post photo
3. **Match hero non-auth** (`32c5b7d`) — port FriendlyMatchPage.js hero centré
   Swords 72×72 + CTA "Commencer la partie" + couleurs 4 étapes Emergent
   (orange/vert/bleu/violet) + bloc CTA final "Prêt à jouer ?"
4. **Club detail refonte** (`64ae19e`) — header navy compact + toggle Suivre/Suivi
   + grille 3 stats + adresse Google Maps + feed posts du patron + 3 services
5. **Tournament detail complete** (`3782f8f`) — 12 features port Emergent :
   partner picker, prix Info card, Share native, Salon polling 5s, Delete
   owner, MatchRow actions, BracketView SVG, subscribe club, waitlist, TS
   badges, groupement matchs, format+phase badges
6. **Match live improvements** (`bfaca04`) — timer mm:ss + LivePulseBadge
   Reanimated + ELO delta + photo share post-match + canScore owner + player
   names + "Partie terminée" + bouton Démarrer vert
7. **Fix tests + throttle** (`ce72a6b`) — `73 failed → 0 failed` via
   bootstrap.php + .env.testing + TestCase::setUp Cache::flush. Throttle
   `/payments/checkout/create` 10→60 req/min.

### Pages auditées ✅ conformes Emergent d5ac086

| Écran | Status | Notes |
|---|---|---|
| HomePage *(marketing non-auth)* | ✅ | grille 9 cases + popups waitlist |
| Notifications | ✅ | paginé + 15 types mappés |
| Conversations (liste + détail) | ✅ | polling 10s + CTAs propositions |
| Mes tournois | ✅ | 3 pills En cours/À venir/Passés |
| Clubs détail | ✅ | refonte 20/4 (header navy + feed patron) |
| Tournois liste | ✅ | filtres dates + tags |
| Tournois création (wizard 3 étapes) | ✅ | 6 écarts cosmétiques mineurs |
| Tournois détail | ✅ | refonte 20/4 (12 features) |
| Score live tournoi | ✅ | refonte 20/4 (timer + canScore owner) |
| Match amical live | ✅ | refonte 20/4 (timer + ELO + photo) |
| Match tab non-auth | ✅ | refonte 20/4 (hero Swords + CTAs) |
| Match tab auth | ✅ | refonte session 19/4 |
| Partenaires | ✅ | swipe Tinder amical mergé 19/4 |
| Cockpit Player | ✅ | refonte 19/4 (hero stats + 8 ActionCards) |
| Cockpit Referee | ✅ | parité 19/4 |
| Register (3 cartes) | ✅ | sync d5ac086 19/4 |
| Login | ✅ | + forgot/reset password 19/4 |
| Profil (4 tabs) | ✅ | upload photo + Infos/Posts/Tournois/Matchs |
| Feed /actualites | ✅ | composer FAB + 5 invalidations |

### Écrans restants à vérifier (bas enjeu)

- **PostCard feed** — vérification finale styling vs Emergent (ratios, badges
  post_type, comportement post image vs text-only)

### Backend — changements 20 avril

- **Migration matches.started_at** — capture du démarrage au 1er score entré
- **Migration posts.post_type + metadata JSON + post_aspect ENUM** — taxonomie
  Emergent compatible
- **UpdateMatchScoreController** — owner + admin peuvent saisir le score
  (plus seulement captain/partner)
- **3 nouveaux listeners Feed** : welcome post, match_result, tournament_club
- **FriendlyMatchCompleted event** (hors transaction) — déclenche le post
  système match_result
- **ShowClubController** — expose `subscribers_count` + eager-load owner

---

## 🗃️ DONNÉES DE TEST EN BASE (`migrate:fresh --seed`)

```
Users (tokens à re-mint via tinker après migrate:fresh) :
Alice  → uuid: 019d9549-f00f-73c9-9824-b672acc57b8a  (joueur)
Thomas → uuid: 019d954a-331e-70d1-a488-ca7d769b5573  (joueur)
Sophie → uuid: 019d954a-6a29-7159-9a15-858ce6ca5c38  (joueur)
Lucas  → uuid: 019d954a-92d6-70f8-abb2-cc185e90928c  (joueur)
Marc   → uuid: 019d954a-c589-7171-8a5d-e5872cd32058  (referee/organisateur)
Emma   → uuid: 019d954a-fea2-7228-994c-e718e9c6c3b3  (joueur)
```

**Tournoi 1** — "Open de Paris - Test" (on_site, P100, mixte, status `in_progress`)
**Tournoi 2** — "Tournoi P100 Payant - Test" (online Stripe 15€, status `open`)

Club utilisé : **4Padel Paris 20** `019d9543-db2b-7255-8ae2-e81bdf89a193`

```bash
cd ~/project/place2padel/backend && php artisan migrate:fresh --seed
```

---

## 🗓️ PROCHAINES ÉTAPES

### Priorité immédiate

1. **Vérification finale PostCard feed** — dernier écran non audité formellement
2. **Game Proposal UI mobile** — endpoints G8 backend prêts, UI non livrée
   (cf. [BACKLOG.md](BACKLOG.md))

### Bloqué par credentials externes (non critique MVP)

- **Google OAuth mobile** — GOOGLE_CLIENT_ID Android + iOS
- **Push notifications Expo** — EAS projectId + FCM key + APNs

### À traiter avant publication stores

- **Rename scheme** `place2padel` → `placetopadel://` (cf. BACKLOG)
- **Page de retour Stripe** post-paiement (endpoint Laravel simple ou Phase 7 Next.js)

### Phases suivantes

- **Phase 7 — Web Next.js** : dashboard admin + landing SEO + page retour Stripe
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
# Re-seed complet
cd ~/project/place2padel/backend && php artisan migrate:fresh --seed

# Tests backend (doit passer 417 verts / 0 failed)
cd ~/project/place2padel/backend && php artisan test

# ⚠️ Si échecs surprise en tests — config cachée persistante
cd ~/project/place2padel/backend && php artisan config:clear

# TSC mobile
cd ~/project/place2padel/frontend/mobile && npx tsc --noEmit

# Mint token debug
cd ~/project/place2padel/backend && php artisan tinker --execute="use App\Models\User; echo User::where('first_name', 'Alice')->first()->createToken('debug', ['*'])->plainTextToken;"
```

### Rebuild dev client requis si

- **expo-camera** (QR scan) → `npx expo run:android`
- **expo-image-picker** (upload avatar + upload photo match result) → `npx expo run:android`
- **react-native-svg** (BracketView) → dispo via react-native-qrcode-svg déjà installé

---

*Dernière mise à jour : 20 avril 2026 fin de session (comparaison Emergent d5ac086 quasi-complète + backend 417 tests verts 0 failed)*
*Vision & validation : Fanomezantsoa | Implémentation : Claude Code*
