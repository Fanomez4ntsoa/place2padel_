# CLAUDE.md — Place2Padel
## Fichier de référence — À lire au début de chaque session Claude Code

---

## 🎯 CONTEXTE DU PROJET

**Place2Padel** est une plateforme mobile-first de gestion de tournois de padel.
Objectif : devenir le standard national d'organisation de tournois (remplacer Excel, WhatsApp, papier).

### Statut actuel
- Un prototype fonctionnel a été généré via **Emergent** (FastAPI + React + MongoDB)
- Ce prototype est une **validation UX/flows uniquement** — NON exploitable en production
- Mission : reconstruire proprement, sans dépendance Emergent

---

## 🚫 RÈGLE FONDAMENTALE

**NE JAMAIS :**
- Copier le code Emergent tel quel
- Reproduire une logique sans comprendre le besoin métier
- Dépendre de l'architecture FastAPI/MongoDB existante

**TOUJOURS :**
1. Comprendre le besoin métier d'abord
2. Extraire la logique utile du prototype
3. Reconstruire proprement dans la nouvelle architecture

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

## 🧪 TESTS

- **Feature tests** : tous les endpoints API
- **Unit tests** : MatchEngineService (logique compétition critique)
- **Factories** : pour chaque model
- Commande : `php artisan test`

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

## 📌 PIÈGES À ÉVITER

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

- [ ] Phase 0 : Setup (Laravel + MySQL + Redis + S3 + CI/CD)
- [ ] Phase 1 : Auth + User + Club + Tournament (CRUD)
- [ ] Phase 2 : Match Engine + Score live + Notifications
- [ ] Phase 3 : Matchmaking + Payment + Social
- [ ] Phase 4 : App mobile (React Native / Flutter)
- [ ] Phase 5 : Next.js web + SEO

---

*Dernière mise à jour : 13 avril 2026*
*Architecte : développeur principal + Claude Code*