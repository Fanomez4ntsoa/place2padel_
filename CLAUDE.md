# CLAUDE.md — Place2Padel
## Fichier de référence — À lire intégralement au début de chaque session Claude Code

---

## 🎯 CONTEXTE DU PROJET

**Place2Padel** est une plateforme mobile-first de gestion de tournois de padel.
Objectif : devenir le standard national d'organisation de tournois (remplacer Excel, WhatsApp, papier).

### Statut actuel
- Un prototype fonctionnel a été généré via **Emergent** (FastAPI + React + MongoDB)
- Ce prototype est une **validation UX/flows uniquement** — NON exploitable en production
- Mission : reconstruire proprement, sans dépendance Emergent

---

## 🧭 VISION & PROMESSE PRODUIT

### L'ambition
PlaceToPadel n'est pas une app de padel générique. C'est une **plateforme centrale** pour les joueurs licenciés, juges arbitres et clubs. Point de départ : le padel est massif mais ses outils d'organisation sont encore faibles (Excel, WhatsApp, papier).

### Promesse produit principale
> **"Créer un tournoi en 5 minutes, puis ne plus rien gérer"**

Cela implique : création rapide, inscriptions automatiques, tableau auto, notifications auto, score live, communication intégrée.

### Utilisateur cible
**Joueurs licenciés FFT** en priorité — pas le grand public. Profils sérieux, niveau vérifiable, points FFT disponibles. Meilleure qualité de matching, meilleure valeur pour les tournois.

### Feature différenciante — Matching tournoi
La feature la plus puissante n'est pas le swipe global. C'est :
> **"Je suis seul pour ce tournoi"**

Un joueur se déclare seul sur un tournoi précis → les autres joueurs seuls intéressés par ce même tournoi apparaissent → mise en relation dans un contexte concret → taux de conversion fort.

### Structure 5 onglets (navbar)
| Onglet | Rôle |
|--------|------|
| **Actu** | Fil actualité intelligent (tournois, résultats, clubs) — rétention |
| **Tournois** | Cœur business — trouver, créer, vivre un tournoi |
| **Cockpit** | Centre de contrôle personnel — signature UX orange surélevé |
| **Partenaires** | Matching partenaires lié au jeu réel |
| **Clubs** | Exploration locale — OS local du padel |

### Salon tournoi
Chaque tournoi génère son propre espace de communication (remplace les groupes WhatsApp) : annonces, horaires, échanges, suivi des matchs.

### Stratégie de lancement
**LANCER > PARFAIRE** — 10 joueurs → 50 → 100. Observer, corriger, accélérer.

### Monétisation
- Phase 1 : **Gratuit** (adoption + dépendance)
- Phase 2 : **1€/mois** (après validation usage réel)
- Stripe intégré en Phase 2 uniquement

### Expansion future
Espagne identifiée comme extension naturelle. **Construire dès maintenant avec i18n en tête** (Laravel `lang/`, colonnes `locale`, slugs multilingues).

---

## 🔴 INSTRUCTION CRITIQUE — PROJET EMERGENT (lire avant toute implémentation)

Le projet Emergent situé dans **`~/project/placeToPadel`** est une **référence fonctionnelle uniquement**.

### Ce que tu dois faire avec ce projet
1. **Analyser** le code pour comprendre les features, les flows utilisateurs et la logique métier
2. **Extraire** les concepts métier utiles (règles de compétition, workflows, structures de données)
3. **Comprendre** le besoin avant d'écrire la moindre ligne de code

### Ce que tu ne dois jamais faire
- ❌ Copier du code Emergent tel quel dans le projet Laravel
- ❌ Traduire mécaniquement du Python/FastAPI vers PHP/Laravel sans compréhension
- ❌ Reproduire les mauvais patterns (server.py monolithique de 3856 lignes, MongoDB non-relationnel)
- ❌ Garder une dépendance à l'architecture Emergent (Kubernetes, Google OAuth Emergent, stockage local)

### Processus obligatoire avant chaque implémentation
```
1. Lire le code Emergent correspondant à la feature
       ↓
2. Identifier le besoin métier réel (pas le code, le besoin)
       ↓
3. Proposer une architecture Laravel propre pour ce besoin
       ↓
4. Justifier les choix (pourquoi, avantages, limites)
       ↓
5. Implémenter proprement (Controller → Service → Model → Resource)
```

> Le prototype Emergent valide une **idée produit**.
> Le backend Laravel doit la **sécuriser, structurer et rendre scalable**.

---

## 🚫 RÈGLES FONDAMENTALES

**NE JAMAIS :**
- Copier le code Emergent tel quel
- Reproduire une logique sans comprendre le besoin métier
- Dépendre de l'architecture FastAPI/MongoDB existante
- Proposer une solution sans expliquer : pourquoi / avantages / limites

**TOUJOURS :**
1. Comprendre le besoin métier d'abord
2. Extraire la logique utile du prototype
3. Reconstruire proprement dans la nouvelle architecture
4. Adapter au contexte Laravel + API-first + mobile-first

---

## 🏗️ ARCHITECTURE CIBLE

### Backend — Laravel (API-first)
- **Framework** : Laravel (dernière version stable)
- **Base de données** : MySQL
- **Cache / Queues** : Redis + Laravel Horizon (CORE, pas optionnel)
- **Storage médias** : S3 (ou Cloudflare R2)
- **Auth** : Laravel Sanctum (JWT mobile + session web)
- **Email** : Resend (vraie clé API)
- **Paiement** : Stripe (Phase 2)

### Structure modulaire Laravel
```
app/
├── Modules/
│   ├── Auth/
│   │   ├── Controllers/
│   │   ├── Services/
│   │   ├── Requests/
│   │   └── Resources/
│   ├── User/
│   ├── Tournament/
│   ├── Match/
│   ├── Matchmaking/
│   ├── Notification/
│   ├── Club/
│   ├── Payment/        # Phase 2
│   ├── Social/         # Phase 2
│   └── Admin/
├── Models/
├── Jobs/               # Laravel Horizon / queues
├── Events/
└── Listeners/
```

### Frontend — Mobile-first
- **App mobile** : React Native + Expo (si équipe JS) ou Flutter
- **Web/Admin** : Next.js (SEO + dashboard admin)
- Consommation API Laravel uniquement

### Infrastructure
```
[React Native / Flutter]  [Next.js Web]
         |                      |
         └────── HTTPS ──────────┘
                    |
          [Laravel API — API-first]
                    |
    ┌───────────────┼───────────────┐
  [MySQL]        [Redis]          [S3/R2]
  (données)   (cache + queues)   (médias)

  [Laravel Horizon] → monitoring queues

  # Phase 2+
  [Chat service — Node.js + WebSocket]
  [Notification service]
```

---

## 📋 MODULES & PRIORITÉS MVP

### Phase 1 — Core (priorité absolue)
| # | Module | Description |
|---|--------|-------------|
| 1 | **Auth** | Register, login, refresh, Google OAuth, logout |
| 2 | **User / Profile** | Profil joueur, sync classement FFT, photo |
| 3 | **Club** | 86 clubs (seed MySQL), recherche |
| 4 | **Tournament** | CRUD tournoi, inscription équipe, QR code |

### Phase 2 — Moteur compétition
| # | Module | Description |
|---|--------|-------------|
| 5 | **Match Engine** | Poules, brackets, formats auto |
| 6 | **Match Live** | Score temps réel, validation double capitaine |
| 7 | **Notification** | In-app + push (via queues Redis) |

### Phase 3 — Social & Paiement
| # | Module | Description |
|---|--------|-------------|
| 8 | **Matchmaking** | Partenaires (Tinder-like), compatibilité |
| 9 | **Payment** | Stripe — inscription payante |
| 10 | **Feed social** | Posts, likes, commentaires (simplifié) |

---

## 🗄️ SCHÉMA DE BASE DE DONNÉES (MySQL)

### ✅ Migrations créées et validées (Phase 0-1)

**clubs** — uuid(v7), slug, name, address, city, postal_code(nullable), region, country(def:FR), latitude(10,8), longitude(11,8), phone, email, website, courts_count, is_active(def:true), softDeletes
- Index : (latitude, longitude), slug, uuid
- Pas de FK owner pour l'instant (Phase 2)

**users** — uuid(v7), email, password(nullable si Google), auth_type ENUM(local,google), role ENUM(player,organizer,referee,admin), first_name, last_name, name(dénormalisé FFT), picture_url(S3), city, club_id(FK nullOnDelete), remember_token, softDeletes
- Index : email, role, club_id, uuid

**user_profiles** — user_id(FK 1-1 cascadeOnDelete), bio, position ENUM(left,right,both), padel_level(TINYINT 1-5), license_number, padel_points, ranking, tenup_synced_at, tenup_name, region, latitude(10,8), longitude(11,8), max_radius_km(def:30), max_radius_training_km(def:15)
- Index : license_number, ranking, padel_points, (latitude,longitude)
- Note : padel_level = niveau réel joueur / preferred_levels = catégories tournois FFT (P25..P2000)

**user_preferred_levels** — user_id(FK cascade), level VARCHAR(10) [P25,P50,P100,P250,P500,P1000,P2000]
- UNIQUE(user_id, level) + index sur level
- VARCHAR vs ENUM → flexible si FFT introduit nouveaux niveaux, validation côté Request

**user_availabilities** — user_id(FK cascade), day_of_week TINYINT (ISO 8601 : 1=lundi, 7=dimanche)
- UNIQUE(user_id, day_of_week)

### Tables Phase 2 (à créer)
```
tournaments, tournament_teams, matches, team_states, pools
```

### Tables Phase 3 (à créer)
```
partners, swipes, proposals, conversations, messages,
posts, post_likes, post_comments, notifications, push_subscriptions
```

### Décisions techniques actées
- **UUID v7** sur toutes les tables (triable, exposé API, pas de fuite d'IDs séquentiels)
- **Soft deletes** sur : users, clubs, tournaments, posts
- **Anti brute-force** : RateLimiter Laravel natif (pas de table login_attempts)
- **Sessions Google** : Sanctum gère nativement, pas de table user_sessions
- **Rôles** : ENUM MVP (Spatie permissions → Phase 2 si besoin)
- **Migrations** : toujours une migration par table, nommage `create_{table}_table`

### Tables principales à créer
```sql
-- Phase 1
users               -- id, email, name, role, license_number, padel_points, ranking...
clubs               -- id, name, address, city, postal_code (86 clubs à seeder)
user_profiles       -- id, user_id, bio, city, max_radius_km, preferred_levels...
player_availabilities
player_zones        -- 2 zones: tournois + entraînements

-- Phase 2
tournaments         -- id, name, club_id, location, type, level, date, status...
tournament_teams    -- inscription equipes
matches             -- id, tournament_id, phase, round, team1_id, team2_id, score...
team_states         -- classement dynamique par tournoi
pools               -- groupes de poules

-- Phase 3
partners            -- matching partenaires
swipes
proposals           -- propositions match/tournoi
conversations
messages
posts
post_likes
post_comments
notifications
push_subscriptions
```

### Migrations
- Toujours une migration par table
- Nommage : `create_{table}_table`
- Soft deletes sur : users, tournaments, posts

---

## 🔐 AUTH & SÉCURITÉ

- **Laravel Sanctum** : tokens pour mobile, sessions pour web
- **Google OAuth** : indépendant (pas via Emergent) — utiliser `socialite/google`
- **Rate limiting** : sur tous les endpoints auth (déjà prévu dans Laravel)
- **Licence FFT** : validation à l'inscription, auto-sync classement (141 351 licenciés en base)
- **Rôles** : `player`, `organizer`, `referee`, `admin`

---

## ⚡ QUEUES & JOBS (Redis + Horizon)

Jobs à créer :
```
SendEmailJob            -- notifications email (Resend)
SendPushNotificationJob -- web push VAPID
CloseRegistrationJob    -- clôture auto inscriptions
SendReminderJob         -- rappels 24h / 1h avant tournoi
ImportFFTRankingsJob    -- import mensuel (1er mardi du mois)
GenerateFeedJob         -- génération automatique fil d'actualité
```

Queues :
- `high`    : notifications urgentes
- `default` : emails, jobs standards
- `low`     : import FFT, feed génération

---

## 🎯 LOGIQUE MÉTIER CLÉS (à reconstruire proprement)

### Moteur de compétition
- Formats : élimination directe / poules / poules+classement / poules+tableau
- Sélection auto du format selon nombre d'équipes
- Distribution serpentin des têtes de série
- **Reclassement dynamique** (pas de bracket figé)
- Chaque équipe joue minimum 3-4 matchs
- Score : 9 jeux, tie-break à 8-8, double validation capitaines

### Diffusion intelligente tournoi
- Lors de la création : notifier joueurs dans rayon géographique + niveaux correspondants
- Bouton "Lancer" = 1 clic → fermer inscriptions + générer matchs + planifier + convoquer + rappels

### Sync FFT
- 141 351 licenciés en base (`tenup_rankings`)
- Auto-sync à l'inscription (match par licence FFT + nom)
- Import mensuel depuis PDFs FFT (PyMuPDF → à recréer différemment en PHP/Laravel)

---

## 🎨 CHARTE GRAPHIQUE

```
Orange CTA   : #E8650A  | hover: #C75508 | clair: #FFF0E6
Navy         : #1A2A4A  | clair: #2A4A6A
Fond         : #FFF8F4
Bordures     : #F0EBE8
Titres       : Plus Jakarta Sans (800)
Texte        : DM Sans
Cards        : rounded-3xl
Boutons      : rounded-2xl
Icônes       : Lucide React
Navbar       : navy #1A2A4A + Cockpit orange surélevé
```

---

## 🌐 API CONVENTIONS (Laravel)

### Standards
- **Versioning** : `/api/v1/`
- **Format** : JSON, snake_case
- **Auth header** : `Authorization: Bearer {token}`
- **Pagination** : `?page=1&per_page=15`
- **Filtres** : query params (`?status=open&level=P25`)

### Structure réponse
```json
{
  "data": {},
  "meta": { "pagination": {} },
  "message": "Success"
}
```

### Codes HTTP
- `200` OK, `201` Created, `204` No Content
- `400` Bad Request, `401` Unauthorized, `403` Forbidden
- `404` Not Found, `422` Validation Error, `429` Rate Limited
- `500` Server Error

---

## 📱 ENDPOINTS MVP (à créer en Phase 1)

### Auth
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/refresh
GET  /api/v1/auth/google/redirect
GET  /api/v1/auth/google/callback
```

### User / Profile
```
GET  /api/v1/profile/{id}
PUT  /api/v1/profile
POST /api/v1/profile/photo
GET  /api/v1/users/search
POST /api/v1/tenup/sync-profile
GET  /api/v1/tenup/search
```

### Clubs
```
GET /api/v1/clubs/search
GET /api/v1/clubs/{id}
```

### Tournaments
```
POST   /api/v1/tournaments
GET    /api/v1/tournaments
GET    /api/v1/tournaments/for-me
GET    /api/v1/tournaments/{id}
PUT    /api/v1/tournaments/{id}
DELETE /api/v1/tournaments/{id}
POST   /api/v1/tournaments/{id}/register
DELETE /api/v1/tournaments/{id}/register
POST   /api/v1/tournaments/{id}/launch
GET    /api/v1/tournaments/{id}/qrcode
```

---

## 🔑 DÉPENDANCES EXTERNES — À CONFIGURER AVANT MISE EN PROD

| Service | Variables | Où obtenir | Priorité |
|---------|-----------|------------|----------|
| **Google OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google Cloud Console → Credentials → OAuth 2.0 Client ID | 🔴 Phase 1 |
| **IONOS S3** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_BUCKET`, `AWS_ENDPOINT`, `AWS_USE_PATH_STYLE_ENDPOINT=true` | Compte IONOS → Object Storage | 🔴 Phase 1 |
| **Resend (email)** | `RESEND_API_KEY`, `SENDER_EMAIL` | resend.com → API Keys | 🔴 Phase 1 |
| **VAPID (Web Push)** | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `php artisan webpush:vapid` | 🟡 Phase 2 |
| **Stripe (paiement)** | `STRIPE_KEY`, `STRIPE_SECRET` | stripe.com → Dashboard | 🟡 Phase 2 |

> ⚠️ Sans ces credentials, les features correspondantes crasheront en prod.
> Les tests PHPUnit utilisent des mocks — ils passent sans ces clés.

---

## 🔧 ENVIRONNEMENT

### Variables .env Laravel (à configurer)
```env
APP_NAME=Place2Padel
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=place2padel
DB_USERNAME=root
DB_PASSWORD=

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=resend
RESEND_API_KEY=                    # À configurer

AWS_ACCESS_KEY_ID=                 # S3 ou R2
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=
AWS_BUCKET=

GOOGLE_CLIENT_ID=                  # OAuth indépendant
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

VAPID_PUBLIC_KEY=                  # Web Push
VAPID_PRIVATE_KEY=

STRIPE_KEY=                        # Phase 2
STRIPE_SECRET=                     # Phase 2

FRONTEND_URL=http://localhost:3000
```

---

## ✅ STANDARDS DE CODE

### Laravel — Conventions obligatoires
- **Controllers** : thin controllers, logique dans les Services
- **Services** : `TournamentService`, `MatchEngineService`, `FFTSyncService`...
- **Form Requests** : validation dans des Request classes dédiées
- **Resources** : toujours des API Resources pour les réponses
- **Events / Listeners** : pour les notifications, feed, etc.
- **Policies** : autorisation via Policies Laravel
- **Tests** : PHPUnit — Feature tests pour les endpoints, Unit tests pour Services

### Naming
```php
// Controllers : singular, Resource
TournamentController
AuthController

// Services : singular + Service
TournamentService
MatchEngineService

// Jobs : verb + noun
SendEmailJob
CloseRegistrationJob

// Events : past tense
TournamentCreated
MatchScoreUpdated
PlayerRegistered
```

---

## 🌿 Git Workflow — Règles obligatoires

### Branche principale
- `main` est la branche de production — on n'y pousse **jamais** directement

### Nomenclature des branches
| Type | Préfixe | Exemple |
|------|---------|---------|
| Nouvelle fonctionnalité | `feature/` | `feature/auth-module` |
| Correction de bug | `fix/` | `fix/tournament-registration` |
| Refactoring | `refactor/` | `refactor/match-engine-service` |
| Configuration / maintenance | `chore/` | `chore/update-env-example` |
| Documentation | `docs/` | `docs/update-claude-md` |

### Cycle de vie d'une branche
```bash
# 1. Toujours partir de main à jour
git checkout main && git pull

# 2. Créer la branche
git checkout -b feature/nom-du-module

# 3. Développer + committer au fil de l'eau
git commit -m "[FEAT]: description claire"

# 4. Tests Insomnia validés sur la branche
# 5. Tests PHPUnit passants
# 6. Soumettre pour validation (Fanomezantsoa valide)
# 7. Merge vers main uniquement après accord
# 8. Retests sur main après merge
```

### Gestion des conflits
- Claude **ne résout jamais un conflit seul**
- En cas de conflit : **signaler + expliquer + proposer la résolution**
- **Fanomezantsoa valide** la résolution avant que Claude applique quoi que ce soit

---

## 🧪 Testing — Règles obligatoires

### Principe
Deux niveaux de tests **obligatoires** avant tout merge vers `main` :
1. **Tests manuels Insomnia** — valider la logique métier endpoint par endpoint
2. **Tests automatisés PHPUnit** — valider que rien n'est cassé dans le code

Un tableau vide `[]` sur un GET ne suffit pas — il faut valider la logique métier.
Un test PHPUnit vert ne suffit pas — il faut aussi valider le comportement réel sur Insomnia.

### Checklist Insomnia — minimum par module
- [ ] CREATE → l'enregistrement est bien créé avec les bons champs
- [ ] READ (liste + détail) → les données retournées sont correctes
- [ ] UPDATE → la modification est bien appliquée
- [ ] DELETE → la suppression fonctionne
- [ ] Actions métier → (ex: register, launch, score, validate...) testées une par une
- [ ] Cas d'erreur → mauvais statut, ID inexistant, champs manquants, token expiré

### Setup Insomnia — Place2Padel
```
Base URL     : http://localhost:8000
Header       : Accept: application/json
Header auth  : Authorization: Bearer <token>
Obtenir token: POST http://localhost:8000/api/v1/auth/login
```

### Tests PHPUnit automatisés
- **Feature tests** : chaque endpoint API (happy path + cas d'erreur)
- **Unit tests** : `MatchEngineService` (logique compétition — critique)
- **Factories** : créer une Factory par Model
- Commande : `php artisan test`
- Les tests doivent passer **avant** de soumettre le merge

### Ordre obligatoire avant merge
```
1. php artisan test → tous verts
       ↓
2. Tests Insomnia → checklist complète validée
       ↓
3. Fanomezantsoa valide
       ↓
4. Merge vers main
```

---

## 🚀 COMMANDES UTILES

```bash
# Installation
composer install
php artisan key:generate
php artisan migrate --seed
php artisan db:seed --class=ClubsSeeder        # 86 clubs
php artisan db:seed --class=FFTRankingsSeeder  # 141 351 licenciés

# Développement
php artisan serve
php artisan queue:work
php artisan horizon                            # Dashboard queues

# Tests
php artisan test
php artisan test --filter=TournamentTest

# Génération
php artisan make:controller Api/V1/TournamentController --api
php artisan make:service TournamentService
php artisan make:request StoreTournamentRequest
php artisan make:resource TournamentResource
php artisan make:job CloseRegistrationJob
php artisan make:event TournamentCreated
```

---

*Dernière mise à jour : 13 avril 2026*
*Vision & validation : Fanomezantsoa | Implémentation : Claude Code*

1. **Sur-architecture** : pas de microservices d'emblée — Laravel monolithe modulaire d'abord
2. **100% reproduction** : ne pas tout migrer, MVP d'abord
3. **Copier le server.py** : 3856 lignes de code Emergent = référence métier uniquement
4. **MongoDB → MySQL** : repenser les relations, pas juste traduire les collections
5. **Pas de tests** : chaque endpoint doit avoir un feature test
6. **Redis optionnel** : Redis est CORE — queues synchrones = app lente

---

## 📚 PROTOTYPE DE RÉFÉRENCE (lecture seule)

Le prototype Emergent documente :
- **89 endpoints** → comprendre le besoin, reconstruire en Laravel
- **24 collections MongoDB** → adapter en tables MySQL relationnelles
- **Flows UX** → reproduire l'expérience, pas le code
- **Logique compétition** → MatchEngineService à reconstruire proprement

URL Preview Emergent : https://match-bracket-live.preview.emergentagent.com
URL Prod actuelle : https://www.placetopadel.com

---

## 🗓️ PROGRESSION

### Phase 0 — Setup ✅ COMPLÈTE
- [x] Laravel 12 installé dans `backend/`
- [x] Structure modulaire `app/Modules/` créée (10 modules)
- [x] `.env.example` configuré
- [x] Migrations créées et validées : clubs, users, user_profiles, user_preferred_levels, user_availabilities, tenup_rankings
- [x] `php artisan migrate` exécuté
- [x] ClubsSeeder → 85 clubs seedés (scrape API Emergent + mapping département/région)
- [x] FFTRankingsSeeder → 145 821 licenciés FFT seedés (LOAD DATA INFILE en 3.3s)
- [x] Laravel Sanctum installé (`php artisan install:api`)
- [x] Laravel Horizon configuré (3 supervisors Redis : high / default / low)

### Phase 1 — Core (en cours)
- [x] Models Eloquent : User, UserProfile, Club, UserPreferredLevel, UserAvailability
- [x] Module Auth complet : Register, Login, Refresh, Google OAuth, Logout, Logout-all, Me
- [x] 32 tests PHPUnit verts (149 assertions)
- [ ] ⚠️ Test Insomnia Google OAuth → en attente credentials Google client
- [ ] Module User / Profile
- [ ] Module Club (search, détail)
- [ ] Module Tournament (CRUD + inscription)

### Phase 2 — Moteur compétition
- [ ] Match Engine (poules, brackets, formats auto)
- [ ] Match Live (score, double validation)
- [ ] Notifications (queues Redis)

### Phase 3 — Social & Paiement
- [ ] Matchmaking partenaires + feature "Je suis seul pour ce tournoi"
- [ ] Payment Stripe (1€/mois)
- [ ] Feed social simplifié

### Phase 4+
- [ ] App mobile (React Native / Flutter)
- [ ] Next.js web + SEO
- [ ] i18n Espagne

---

## 📌 DÉCISIONS TECHNIQUES ACTÉES (mis à jour)

### Auth
- 2 tokens Sanctum : access (60min) + refresh (7j) avec rotation
- Refresh rotation stricte : `$token->delete()` avant d'émettre la nouvelle paire
- `RequireAccessToken` middleware custom : rejette les refresh tokens sur /me, /logout, /logout-all
- Google OAuth : Socialite direct (pas proxy Emergent), `stateless()`
- Email linking : refus strict si `auth_type='local'` existe avec même email (Phase 2 : liaison explicite)
- `email_verified_at = now()` automatique sur compte Google
- `FFTSyncJob` dispatché async après inscription (local + Google)

### Clubs
- 85 clubs (vs 86 estimé initialement — écart acceptable)
- Colonne `department` CHAR(3) ajoutée (métropole 2 chars + DOM-TOM 3 chars)
- Slug format : `slug-{postal_code}` (unique par construction)
- `latitude/longitude` NULL pour l'instant → `GeocodeClubsJob` Phase 2
- Commande Artisan `clubs:scrape-from-emergent` pour rafraîchir les données

### FFT Rankings
- 145 821 licenciés (avril 2026, vs 141 351 estimé — PadelSpeak a étendu la couverture)
- Source : PadelSpeak PDFs mensuels (H + F), parsés via PyMuPDF
- Import : LOAD DATA LOCAL INFILE MySQL (~3.3s pour 145k rows)
- Script : `backend/scripts/extract_fft_rankings.py` (one-shot, à relancer mensuellement)
- `ImportFFTRankingsJob` mensuel automatique → Phase 2
- ⚠️ CSV (16 MB) dans le repo → Phase 2 : Git LFS ou génération runtime

### Commandes utiles ajoutées
```bash
# Scrape clubs depuis API Emergent
cd ~/project/place2padel/backend && php artisan clubs:scrape-from-emergent

# Regénérer CSV FFT (18min, PDFs PadelSpeak)
cd ~/project/place2padel/backend && python3 scripts/extract_fft_rankings.py

# Lancer Horizon (monitoring queues)
cd ~/project/place2padel/backend && php artisan horizon

# Règle obligatoire — toujours préfixer avec :
cd ~/project/place2padel/backend && [commande]
```