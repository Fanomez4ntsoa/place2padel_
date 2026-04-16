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

### Structure 5 onglets (navbar) — mise à jour post-Emergent 39b6544
| Onglet | Rôle |
|--------|------|
| **Actu** | Fil actualité intelligent (tournois, résultats, clubs) — rétention |
| **Tournois** | Cœur business — trouver, créer, vivre un tournoi |
| **Cockpit** | Centre de contrôle personnel — signature UX orange surélevé |
| **Match** | Matchs amicaux + ELO (icône Swords) — remplace Clubs dans la navbar |
| **Partenaires** | Matching partenaires lié au jeu réel |

> **Clubs** reste accessible via routes (`/clubs`, `/clubs/[id]`) mais n'est plus onglet navbar — décision Emergent 39b6544 suivie.

### Salon tournoi
Chaque tournoi génère son propre espace de communication (remplace les groupes WhatsApp) : annonces, horaires, échanges, suivi des matchs.

### Stratégie de lancement
**LANCER > PARFAIRE** — 10 joueurs → 50 → 100. Observer, corriger, accélérer.

### Monétisation — modèle aligné Emergent 39b6544
- **Paiement par tournoi** : l'organisateur choisit à la création du tournoi entre `on_site` (défaut, inscription directe) ou `online` (Stripe Checkout requis avant inscription)
- Prix parsé depuis un champ texte libre (ex : `"15€"` → `15.0`)
- Frais plateforme éventuels à définir (pas dans MVP)
- Stripe SDK natif (`laravel/cashier`) — **PAS** d'emergentintegrations proxy
- Resend activé avec vraie clé API (à configurer dans `.env`)

> Le modèle "1€/mois abonnement" initialement envisagé est abandonné au profit du modèle organisateur-choisit d'Emergent — meilleure UX pour les joueurs et monétisation par volume tournoi plutôt que récurrence.

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
│   ├── Match/              # Match engine (tournoi) — Phase 2
│   ├── FriendlyMatch/      # Match amical + ELO — Phase 6.2 G7
│   ├── Matchmaking/
│   ├── GameProposal/       # Propositions match amical post-like — Phase 6.2 G8
│   ├── Notification/
│   ├── Club/
│   ├── Payment/            # Stripe par tournoi — Phase 6.2 (post-G7/G8)
│   ├── Social/             # Feed Phase 5.1 ✅
│   └── Admin/
├── Models/
├── Jobs/                   # Laravel Horizon / queues
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

# 3. ⚠️ VÉRIFIER qu'on est sur la bonne branche avant tout
git branch --show-current  # doit afficher feature/nom-du-module
# Si pas sur la bonne branche → STOP, ne pas coder

# 4. Développer + committer au fil de l'eau
git commit -m "[FEAT]: description claire"

# 5. Tests Insomnia validés sur la branche
# 6. Tests PHPUnit passants
# 7. Soumettre pour validation (Fanomezantsoa valide)
# 8. Merge vers main uniquement après accord
# 9. Retests sur main après merge
```

> ⚠️ **Règle absolue** : Claude Code doit toujours exécuter `git branch --show-current` 
> et confirmer le nom de la branche avant d'écrire la moindre ligne de code.
> Si la branche n'existe pas ou si on est sur `main` → STOP et signaler immédiatement.

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

*Dernière mise à jour : 16 avril 2026 fin de session (Phase 6.2 clôturée + tous les gaps audit fermés + MVP mobile complet)*
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

### Phase 1 — Core ✅ COMPLÈTE
- [x] Models Eloquent : User, UserProfile, Club, UserPreferredLevel, UserAvailability, ClubSubscription, Tournament, TournamentTeam
- [x] Module Auth : Register, Login, Refresh, Google OAuth, Logout, Logout-all, Me (6 endpoints + 2 OAuth)
- [x] Module User / Profile : show (3 niveaux), update, search, photo S3, FFT sync/search (6 endpoints)
- [x] Module Club : search, détail, subscribe/unsubscribe, liste abonnements (5 endpoints)
- [x] Module Tournament : CRUD, inscription/désinscription, waitlist auto, launch minimal, QR code (10 endpoints)
- [x] 132 tests PHPUnit verts (488 assertions)
- [x] Insomnia validé sur tous les modules
- [ ] ⚠️ Test Insomnia Google OAuth → en attente credentials Google
- [ ] ⚠️ Test Insomnia Photo upload → en attente credentials IONOS S3

### Récap Phase 1 — endpoints
| Module | Endpoints | Tests |
|--------|-----------|-------|
| Auth | 8 | 32 |
| User/Profile | 6 | 45 |
| Club | 5 | 20 |
| Tournament | 10 | 35 |
| **TOTAL** | **31** | **132** |

### Phase 2 — Moteur compétition ✅ COMPLÈTE
- [x] MatchEngineService complet :
  - `recommendFormat()` — 4 formats auto selon nb équipes
  - `generateInitial()` — orchestrateur seeding + pools/bracket
  - `generateBracket()` — élimination directe + BYEs
  - `generatePoules()` — round-robin complet + distribution serpentin
  - `reclassifyAfterMatch()` — reclassement dynamique transactionnel
  - `generateDynamicMatches()` — appariement anti-rematch
  - `calculatePoolStandings()` — standings live depuis matchs
- [x] GenerateMatchesJob (queue high, tries=3)
- [x] Migrations : matches, pools, team_states
- [x] Models : TournamentMatch, Pool, TeamState
- [x] Endpoints lecture :
  - GET /tournaments/{uuid}/matches (filtres status/phase/bloc)
  - GET /tournaments/{uuid}/pools (standings live)
  - GET /tournaments/{uuid}/ranking (dynamique ou final)
  - GET /tournaments/{uuid}/team-states (debug/admin)
- [x] Endpoints action :
  - PUT /matches/{uuid}/score (captain+partner, tie-break 8-8)
  - PUT /matches/{uuid}/validate (captain seul, double validation)
  - POST /matches/{uuid}/forfeit (owner+admin, score 9-0)
- [x] 175 tests PHPUnit verts (732 assertions)
- [x] Insomnia validé

### Récap global
| Module | Endpoints | Tests |
|--------|-----------|-------|
| Auth | 8 | 32 |
| User/Profile | 6 | 45 |
| Club | 5 | 20 |
| Tournament | 10 | 35 |
| Match Engine | 7 | 43 |
| **TOTAL** | **36** | **175** |

### Phase 3 — Notifications ✅ COMPLÈTE
- [x] NotificationService (create + dispatch email si whitelisté)
- [x] SendEmailJob (Resend, queue default, tries=3, backoff progressif)
- [x] FanoutNotificationJob (queue high, targets vs delivered)
- [x] SendConvocationsJob (queue high, message générique MVP)
- [x] SendReminderJob (delayed dispatch 24h/1h, skip si délai négatif)
- [x] 5 listeners : TeamRegistered, TeamPromotedFromWaitlist, TournamentCreated, TournamentLaunched, TournamentCompleted
- [x] Anti-doublon milestones via whereJsonContains
- [x] Migrations : notifications, push_subscriptions
- [x] Models : Notification, PushSubscription
- [x] 6 endpoints :
  - GET /notifications (paginé, filtre unread)
  - PUT /notifications/{uuid}/read
  - PUT /notifications/read-all
  - GET /push/vapid-key (stub Phase 4)
  - POST /push/subscribe (stub Phase 4)
  - DELETE /push/unsubscribe (stub Phase 4)
- [x] 192 tests PHPUnit verts (771 assertions)
- [x] Insomnia validé

### Récap global
| Module | Endpoints | Tests |
|--------|-----------|-------|
| Auth | 8 | 32 |
| User/Profile | 6 | 45 |
| Club | 5 | 20 |
| Tournament | 10 | 35 |
| Match Engine | 7 | 43 |
| Notifications | 6 | 17 |
| **TOTAL** | **42** | **192** |

### Phase 4 — Matchmaking partenaires ✅ COMPLÈTE (Phase 4.1)
- [x] Feature "Je suis seul pour ce tournoi"
  - POST /tournaments/{uuid}/seeking-partner
  - DELETE /tournaments/{uuid}/seeking-partner
  - GET /tournaments/{uuid}/seeking-partners (public=count, auth=scores compat)
  - GET /seeking-partner/my
- [x] Proposals tournament_partner
  - POST /tournaments/{uuid}/propose-to-partner
  - GET /proposals (filtres direction + status)
  - PUT /proposals/{uuid}/respond (accept/refuse)
  - DELETE /proposals/{uuid} (annulation pending)
- [x] Conversations & messages
  - GET /conversations (other_user + unread_count)
  - GET /conversations/{uuid}/messages (ordre chronologique)
  - POST /conversations/{uuid}/messages
- [x] MatchmakingService (algo compat contextuel 0-100)
  - scorePosition (30) / scoreLevel (30) / scoreAvailabilities (25) / scoreClub (15)
- [x] ConversationService (postMessage + MessageSent event)
- [x] Migrations : tournament_interests, proposals, conversations, private_messages
- [x] 219 tests PHPUnit verts (831 assertions)
- [x] Insomnia validé

### Phase 4.2 — Matching global (reportée)
- [ ] Swipe global Tinder (swipes, player_matches)
- [ ] GET /matching/candidates
- [ ] POST /matching/swipe
- [ ] GET /matching/matches
- [ ] Proposals match_amical + tournament

### Récap global
| Module | Endpoints | Tests |
|--------|-----------|-------|
| Auth | 8 | 32 |
| User/Profile | 6 | 45 |
| Club | 5 | 20 |
| Tournament | 10 | 35 |
| Match Engine | 7 | 43 |
| Notifications | 6 | 17 |
| Matchmaking | 11 | 27 |
| **TOTAL** | **53** | **219** |

### Phase 5 — Social & Paiement ✅ PARTIELLE (5.1 complète)

#### Phase 5.1 — Feed social ✅ COMPLÈTE
- [x] FeedService (4 filtres : all, my-tournaments, my-partners, my-clubs)
- [x] Génération auto posts système (TournamentCreated, TournamentCompleted)
- [x] Toggle like avec compteur dénormalisé transactionnel
- [x] Commentaires avec fix bug Emergent (comments_count)
- [x] Permissions salon tournoi (organisateur + admin + participants)
- [x] Migrations : posts, post_likes, post_comments
- [x] 9 endpoints :
  - GET /feed (filtres + liked_by_viewer)
  - POST /posts
  - DELETE /posts/{uuid}
  - POST /posts/{uuid}/like (toggle)
  - POST /posts/{uuid}/comments
  - GET /posts/{uuid}/comments
  - DELETE /comments/{uuid}
  - GET /tournaments/{uuid}/posts (salon)
  - GET /profile/{uuid}/posts
- [x] 243 tests PHPUnit verts (892 assertions)
- [x] Insomnia validé

#### Phase 5.2 — Stripe par tournoi (Phase 6.2 post-G8)
Modèle : **paiement par tournoi** (l'organisateur choisit à la création entre `on_site` et `online`). Aligné Emergent 39b6544.
- [ ] Migration `payment_transactions` (session_id unique, status, amount, user_id+tournament_id)
- [ ] Colonne `payment_method` ENUM(on_site, online) sur `tournaments` (default on_site)
- [ ] Module `Payment` : `StripeService` natif (laravel/cashier), `CreateCheckoutSessionController`, `GetCheckoutStatusController`, `StripeWebhookController`
- [ ] 3 endpoints :
  - POST /payments/checkout/create (valide éligibilité, crée session Stripe, renvoie checkout_url)
  - GET /payments/checkout/status/{session_id} (status paid → auto-inscription + notification)
  - POST /webhook/stripe (handler non-bloquant)
- [ ] Mobile : détail tournoi → WebView ou in-app browser pour checkout Stripe, polling status au retour
- [ ] Prix parsé depuis champ texte libre (helper `parsePrice` : `"15€"` → `15.0`)

### Récap global backend (post-Phase 6.2 + fixes grand test)
13 modules Laravel : `Admin`, `Auth`, `Club`, `Feed`, `FriendlyMatch`, `GameProposal`, `Match`, `Matchmaking`, `Notification`, `Payment`, `Social`, `Tournament`, `User`.

| Module | Endpoints | Tests |
|--------|-----------|-------|
| Auth | 8 | 36 |
| User/Profile | 6 | 45 *(+ schéma multi-clubs + availabilities period)* |
| Club | 5 | 20 |
| Tournament | 11 | 44 *(+ GET /tournaments/mine + 9 tests MyTournamentsTest)* |
| Match Engine | 7 | 44 |
| Notifications | 6 | 17 |
| Matchmaking | 12 | 30 *(+ PUT /conversations/{uuid}/read + 3 tests mark-read)* |
| Feed social | 9 | 24 |
| FriendlyMatch + ELO | 13 | 30 |
| GameProposal | 5 | 19 |
| Payment (Stripe) | 3 | 14 |
| **TOTAL** | **85** | **329** *(1165 assertions)* |

### Phase 6 — App mobile React Native + Expo
Branche active : **`main`** (toutes les phases 6.1 → 6.2 mergées au 2026-04-16)
Stack : React Native + Expo SDK 54, Expo Router, NativeWind v4, TanStack Query, Reanimated 4

#### Référence visuelle définitive
Projet Emergent commit **39b6544** — `~/project/placeToPadel/frontend/` (resync post-d541157 : Stripe + Matchs amicaux + ELO + Match tab en navbar).
⚠️ Nom officiel : **"PlaceToPadel"** (pas "Place2Padel" — rename UI complet, reste `place2padel` uniquement dans `package.json` / `app.json` bundle identifiers + scheme, à aligner Phase 7).

#### Phase 6.1 — Vertical slice MVP ✅ COMPLÈTE
- [x] Bootstrap Expo + NativeWind + TypeScript strict
- [x] Design system : couleurs, fonts, tokens, composants atomiques
- [x] API client axios + intercepteurs Bearer + rotation tokens Sanctum
- [x] AuthContext + TanStack Query + expo-secure-store
- [x] Structure Expo Router + BottomTabs 5 onglets + Cockpit surélevé
- [x] Login fonctionnel (connecté au backend Laravel)
- [x] Register basique (à refondre en 6.1.5)
- [x] Liste Tournois (infinite scroll, filtres ville+rayon+niveau)
- [x] Détail tournoi + inscription (tabs Infos/Équipes/Seeking, CTA conditionnel)
- [x] Cockpit dual (joueur + arbitre)
- [x] Profil (affichage + édition bio/ville)
- [x] Logout + toast erreur réseau + skeletons loading
- [x] Stubs Actu / Partenaires / Clubs *(remplacés par écrans complets en 6.1.5/6.1.6)*

#### Phase 6.1.5 — Resynchronisation Emergent 39b6544 ✅ COMPLÈTE
- [x] Rename UI "PlaceToPadel" (AppHeader, écrans, copywriting) — bundle identifiers restent `place2padel` (Phase 7)
- [x] Register refonte complète (accountType Joueur/Juge, position, niveau, disponibilités, bio, photo — 723 lignes)
- [x] HomePage (redirect auth-aware via `app/index.tsx` — la landing marketing Emergent n'est pas portée mobile, remplacée par l'écran Actu Feed)
- [x] AppHeader (logo PlaceToPadel, badges unread Messages+Notifs, CTA inscription si non-auth)
- [x] Cockpit (mode vacances : `VacationCard` avec modal ville)
- [x] Feed (filtres sticky all/mes-tournois/mes-partenaires/mes-clubs, images 4/5, CommentsSheet)
- [x] Profile (header simplifié sans cover, onglet Matchs + ELO)
- [x] Partenaires (3 modes : amical / tournoi / rencontre — 218 lignes)
- [x] Nouvelles pages : MatchingPage + OrganisateursPage (marketing statique)
- [x] Tournaments (header global délégué à AppHeader via `(tabs)/_layout.tsx`)

#### Phase 6.2 — Fonctionnalités avancées ✅ COMPLÈTE + tous les gaps audit fermés (tout sur `main`)
Référence : Emergent **39b6544** (resync post-d541157 avec Stripe + Matchs amicaux + ELO + Match tab en navbar).

Backend post-Phase 6.2 + audit gap-closing : **329 tests PHPUnit verts** (1165 assertions). TSC mobile clean.

**Groupes livrés et mergés** :
- [x] **G1 — Score live** : MatchLivePage + Pools + Ranking, tie-break 8-8, double validation capitaine, forfait owner/admin, badge LIVE pulsé (Reanimated), polling 10s. Tabs conditionnels status-based (open/full → infos/teams/seeking, in_progress/completed → matches/pools/ranking, max 3 tabs).
- [x] **G2 — Seeking partner complet + Proposals inbox** :
  - Bottom-sheet message optionnel (max 500 chars) sur déclaration seeking
  - `useMySeekingTournaments` via `/seeking-partner/my` (source de vérité car `/seeking-partners` exclut le viewer)
  - Bloc Cockpit "Je suis seul (N)" cliquable avec liste tournois
  - Écran `/proposals` pills Reçues/Envoyées, `ProposalCard` avec CTAs conditionnels (Accepter/Refuser reçues · Annuler envoyées)
  - ActionCard "Propositions partenaires" Cockpit avec badge unread + subtitle dynamique
- [x] **G3 — Chat / Conversations** : liste `/conversations`, détail `/conversations/[id]` avec FlatList + 3 types de bulles (me / autre / system / proposal), composer multi-ligne max 5000, polling 10s (pas de websocket MVP), MessagesActionCard Cockpit avec badge unread, AppHeader icône Messages cliquable.
- [x] **G4 — QR scanner** : `expo-camera@~17.0.10` (CameraView) + parsing UUID v7 depuis share_link, debounce 1s, permission handling complet. `TournamentQrModal` avec `react-native-qrcode-svg` + metadata tournoi. Bouton QR header détail tournoi + ActionCard "Scanner un QR" Cockpit. ⚠️ Rebuild dev client requis (module natif, pas dispo Expo Go).
- [x] **G7 — Matchs amicaux + ELO** : module Laravel FriendlyMatch + UserElo (K=0.3, échelle 1-10, **lock threshold = 10 matchs** — code Emergent fait foi vs PRD qui disait 5), 13 endpoints, 30 tests. Mobile : 2 écrans /match, onglet Matchs dans Profile, BottomNav refonte (Clubs sort, Match entre Cockpit et Partenaires, icône Swords).
- [x] **G8 — Game proposals** (dépend G7) : module GameProposal, 5 endpoints, 19 tests. Mobile : GameProposalCard intégrée dans tab Match, flow accept/refuse/start bypass pending.
- [x] **G9 — Stripe par tournoi** : modèle on_site/online au choix organisateur, stripe/stripe-php natif (pas emergentintegrations), PriceParser ("15€" → 15.0), 3 endpoints, 14 tests. Mobile : CheckoutPollingOverlay + CTA dynamique "S'inscrire — 15€".
- [x] **Resend activé** : `MAIL_MAILER=resend`, clé API présente (domaine placetopadel.com à vérifier dashboard pour prod).
- [x] **Bonus : bouton "Lancer un tournoi"** owner-only avec conditions (min 2 équipes, status open/full)
- [x] Fix backend : whitelist `role` register (player|referee, admin/organizer refusés 422)
- [x] Hide Google OAuth UI (backend Socialite intact)
- [x] Rename scheme : `place2padel` → à aligner avec `placetopadel://` pour deep links (BACKLOG.md)

**Groupes bloqués par credentials externes (non critiques MVP)** :
- [ ] **G5 — Google OAuth mobile** : credentials GOOGLE_CLIENT_ID Android + iOS requis
- [ ] **G6 — Push notifications Expo** : EAS projectId + FCM key + APNs requis. Configuration en cours.

**Bugs résiduels notés au grand test émulateur** (tous avec fix commits) :
- Badge prix absent sur TournamentCard → fix `982cffd` ✅
- CTA "S'inscrire" visible pour creator/referee → fix `7e901c3` ✅
- Bouton "Lancer" manquant sur main → fix `149a67a` ✅
- G1 Score live non mergé sur main → fix `3f9e009` + cleanup `41a33f1` ✅
- Rules of Hooks violation → fix `f632ea4` ✅
- Tabs limitées à 3 max → fix `f44e77f` ✅
- Badge LIVE non pulsé + boutons +/- owner non-participant → fix `bcded00` ✅
- Pool standings contract cassé (backend ne renvoyait pas team_name/seed, frontend lisait `wins`/`losses`/`team_points` inexistants) → fix `0b2fd5c` + test de non-régression ✅
- `isSeeking` toujours false (la liste `/seeking-partners` exclut le viewer) → fix via `useMySeekingTournaments` + bottom-sheet message + bloc Cockpit → commit `cdf4ea2` ✅
- Gap G2 : aucune UI proposals (backend prêt depuis Phase 4.1 mais rien côté mobile) → fix `d39b4dd` (types + hooks + écran + ActionCard Cockpit) ✅
- Gap G3/G4 : aucune UI conversations + aucun QR scanner (deps natives manquantes) → fix `3a36d94` (installe expo-camera + react-native-qrcode-svg, 6 nouveaux fichiers écrans + modal + hooks) ✅
- Latence 30s du badge Messages post-accept proposition (invalidation `['counters', 'messages']` manquante) → fix `3a36d94` ✅

**Grand test émulateur (flow complet Étapes 1→13)** : ✅ validé, traçé dans [RESUME.md](RESUME.md). Données seed (UUIDs Alice/Thomas/Sophie/Lucas/Marc/Emma + 2 tournois + matchs amicaux).

#### Gaps audit 16 avril — tous fermés ✅

L'audit du 16 avril avait identifié 4 bloquants 🔴 + 5 importants 🟡. Tous les implémentables ont été fermés entre le 16 et la clôture :

| # | Gap | Fix | Commit |
|---|---|---|---|
| 🔴 1 | Création tournoi StubScreen | Wizard 3 étapes complet + useCreateTournament | `11d74cc` → merge `86ab3b2` |
| 🔴 2 | Cockpit Referee bouton "Créer" fake Alert | Route wizard | `11d74cc` |
| 🔴 3 | Cockpit Referee Messages disabled | MessagesActionCard partagé | `6e5b432` |
| 🔴 4 | "Mes tournois" pointe liste publique | Nouveau `GET /tournaments/mine` + écran pills 3 filtres (En cours / À venir / Passés) | `3a20ee6` → merge `a737a6e` |
| 🟡 5 | Écran Notifications inexistant | `/notifications` paginé + 15 types mappés + NotificationsActionCard | `5be0ff4` |
| 🟡 6 | Cockpit Player Partenaires disabled | Lien activé → `/(tabs)/partenaires` | `3a20ee6` |
| 🟡 7 | Édition profil étendue | Form édition complet : 3 clubs autocomplete + 10 slot dispos + position (pivot `user_clubs` + `period` ENUM + règle Flexible généreux) | `ec2ae4d` |
| 🟡 8 | Google OAuth mobile | ⏸ credentials externes |  |
| 🟡 9 | Rename scheme placetopadel | ⏸ backlog Phase 7 bundle identifiers |  |

#### Chantiers additionnels livrés (hors audit initial)

- **HomePage marketing orpheline récupérée** (`28f25f1`) — le fichier avait été créé en `2bfae93` sur `feature/mobile-phase-6-2` mais jamais mergé. Cherry-pick + `app/index.tsx` redirige non-auth → `/(tabs)/home` au lieu de `/login`
- **AppHeader complet port Emergent 39b6544** (`d362536`) — DrawerMenu 280px (Reanimated) + UniversalSearchOverlay (3 requêtes parallèles /tournaments /clubs /users, debounce 300ms) + Bell icône → /notifications + layout 3-zone stable (fix `bf8b326`)
- **PUT /conversations/{conversation}/read** backend (`7d8b332`) — mark-read conversation atomique, fix badge Messages qui restait après ouverture

### Décisions produit actées
- **BottomNav** : 5 onglets = Actu / Tournois / Cockpit / **Match** (remplace Clubs) / Partenaires
- **Clubs** : reste accessible via routes, hors navbar
- **Profil multi-clubs** : pivot `user_clubs (user_id, club_id, priority 1..3)` — jusqu'à 3 clubs/joueur, autocomplete sur `/clubs/search`
- **Availabilities** : tuples `{day_of_week: int|null, period: morning|afternoon|evening|all}` — 10 slots préset (Lun-Ven soir + Sam/Dim matin/après-midi + Flexible). Slot Flexible = day null + period 'all' (exclusif, match tout côté matchmaking — "généreux")
- **scoreClub matchmaking** : binaire ≥1 club commun = 15 pts (array_intersect sur `clubs.club_id`)
- **Stripe** : modèle "paiement par tournoi" (on_site / online au choix organisateur), pas d'abonnement mensuel
- **Google OAuth mobile** : masqué UI jusqu'à credentials, backend Socialite intact
- **Expo Push** : configuration EAS en cours, pas de blocage des autres groupes

### Phase 7 — Web Next.js
- [ ] Dashboard admin
- [ ] Landing page SEO
- [ ] Tournois indexables Google

### Phase 8 — Publication
- [ ] Build APK Android
- [ ] Build IPA iOS
- [ ] App Store + Google Play

---

## 📱 CONFIGURATION DÉVELOPPEMENT MOBILE

### Lancer le projet
```bash
# Terminal 1 — Backend (obligatoire --host=0.0.0.0 pour émulateur)
cd ~/project/place2padel/backend
php artisan serve --host=0.0.0.0 --port=8000

# Terminal 2 — Frontend mobile
cd ~/project/place2padel/frontend/mobile
npx expo start --clear
# Appuie sur 'a' pour ouvrir sur l'émulateur Android
```

### Variables d'environnement mobile
```
# frontend/mobile/.env (ne pas committer)
EXPO_PUBLIC_API_URL=http://172.29.240.228:8000/api/v1
# Remplace l'IP par : hostname -I (depuis WSL)
```

### ADB WSL → Windows (si perdu)
```bash
sudo rm /usr/local/bin/adb
echo '#!/bin/bash' | sudo tee /usr/local/bin/adb
echo '/mnt/c/Users/voary/AppData/Local/Android/Sdk/platform-tools/adb.exe "$@"' | sudo tee -a /usr/local/bin/adb
sudo chmod +x /usr/local/bin/adb
```

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