# BACKLOG — Place2Padel

Items différés à traiter. Les entrées résolues restent archivées en bas pour
la traçabilité.

---

## 🟡 En attente — Game Proposal UI mobile (Phase 6.2 G8)

**Contexte**
Les 5 endpoints backend Game Proposal sont prêts (`GET /game-proposals/my`,
`POST`, `PUT respond`, `DELETE`, `POST start`) depuis la Phase 6.2 mais
aucun hook/écran mobile ne les consomme. Dans Emergent, les game proposals
apparaissent comme option dans le chat (planification différée d'une partie
avec date/heure/club).

**Proposition**
- Hooks `useGameProposals` + mutations dans `src/features/game-proposals/useGameProposals.ts`
- Sheet `ProposeGameSheet` (depuis le chat, bouton à côté de "Match amical")
  avec champs date + heure + club + message
- Écran `/game-proposals/index.tsx` pour lister mes propositions (Reçues/Envoyées)
  avec actions Accept/Refuse/Cancel/Start

**Priorité** 🟡 P1.

---

## 🟡 En attente — Stripe page de retour post-paiement

**Contexte**
Après un paiement Stripe réussi, l'URL de success
(`{FRONTEND_URL}/tournois/{uuid}?session_id=xxx`) pointe actuellement vers le
frontend web. Aucune page web n'existe encore (Phase 7 Next.js non démarrée).
Sur mobile, l'utilisateur paie via navigateur externe puis doit revenir
manuellement dans l'app pour voir l'overlay de polling se finaliser.

**Proposition** (deux options)

1. **Endpoint Laravel `/payment/success`** (court terme) — page HTML statique
   servie par le backend :
   - "Paiement confirmé ✅ — Retournez sur l'app PlaceToPadel"
   - Bouton CTA `<a href="placetopadel://tournois/{uuid}?session_id=xxx">Ouvrir l'app</a>`
   - Fallback texte pour ouverture manuelle si deep link échoue
   - Style minimal aligné charte (orange `#E8650A`, navy `#1A2A4A`)

2. **Page Next.js** (Phase 7) — intégration dans le site web marketing :
   - Route `/tournois/{uuid}?session_id=xxx` avec polling + redirect deep link
   - Gestion 3 cas : paid / pending / cancelled
   - Meta OpenGraph pour partage social

**Prérequis deep link** : rename scheme `placetopadel://` (item ci-dessous).

**Priorité** 🟡 P1 — bloquant avant mise en prod Stripe.

---

## 🟡 En attente — Rename scheme `place2padel` → `placetopadel://`

**Contexte**
Le projet est rebrandé "PlaceToPadel" dans l'UI mais les bundle identifiers +
scheme deep link restent `place2padel` / `com.place2padel.app`. Les emails
(reset password) et success URLs Stripe utilisent déjà `placetopadel.com`
comme domaine — incohérence.

**Fichiers**

| Fichier | Avant | Après |
|---|---|---|
| [app.json](frontend/mobile/app.json) scheme | `"place2padel"` | `"placetopadel"` |
| [app.json](frontend/mobile/app.json) ios.bundleIdentifier | `"com.place2padel.app"` | `"com.placetopadel.app"` |
| [app.json](frontend/mobile/app.json) android.package | `"com.place2padel.app"` | `"com.placetopadel.app"` |
| package.json name | `"place2padel-mobile"` | `"placetopadel-mobile"` |

**Impact**
- Rebuild dev client requis Android + iOS (nouveau bundle ID)
- Deep links existants invalidés (aucun en prod, safe)
- Tests liens email reset password + success Stripe à refaire

**Priorité** 🟡 P1 — préalable à publication stores (Phase 8) + Stripe prod.

---

## 🟡 En attente — Credentials externes

### Google OAuth mobile
- `GOOGLE_CLIENT_ID` Android + iOS requis
- UI masquée actuellement côté mobile, backend Socialite intact
- À activer dès obtention des credentials (pas de code supplémentaire nécessaire)

### Push notifications Expo
- `EAS projectId` + FCM key (Android) + APNs (iOS)
- Backend a les endpoints stubs `/push/vapid-key` / `/push/subscribe` / `/push/unsubscribe`
  depuis la Phase 3, prêts à être connectés

**Priorité** 🟡 P2 — non critique MVP, activable progressivement.

---

## 🟡 En attente — Lot C Actions owner (P2)

### C.1 — DELETE /posts/{post} + DELETE /comments/{comment}
Endpoints backend livrés (Phase 5.1) mais aucune UI mobile pour supprimer ses
propres posts ou commentaires. Long-press → ActionSheet si author = viewer.

### C.2 — Compositeur d'annonces club (patron)
`clubs/[id].tsx` affiche le feed posts du patron (refonte 20/4 ✅) mais ne
permet pas au patron de poster. Ajouter card "Publier une annonce" avec sheet
préremplie `club_uuid` si `isOwner`.

**Priorité** 🟡 P2.

---

# ✅ Résolu — session 20 avril 2026

## ✅ Lot A — Feed complet (P0) — merge `261847b`
- Hook `useCreatePost` + `CreatePostSheet` bottom-sheet (textarea + image
  picker + sélecteur tournoi optionnel + bouton Publier)
- FAB orange dans `/actualites` + composer card dans tab Posts du profil
- Wire bouton "+ Nouveau post" du Cockpit Player
- Helper `invalidateFeedKeys(qc)` centralisé, appelé dans les 5 mutations
  (upload photo, create tournament, register team, create/validate friendly match)
- Backend : `POST /posts` accepte multipart `image` en plus de `image_url`

## ✅ Feed system posts — merge `261847b`
- Migration `post_type` VARCHAR + `metadata` JSON + `post_aspect` ENUM
- 3 listeners : `CreateWelcomePostOnUserRegistered`,
  `CreateSystemPostOnFriendlyMatchValidated`,
  `CreateTournamentClubPostOnTournamentCreated`
- `referee_announcement` via `POST /posts` (whitelist referee/admin)
- `ProfileService::updatePhoto` backfill image_url du welcome post
- Mobile PostCard + ProfilePostCard : aspectRatio piloté par post_aspect

## ✅ Match hero non-auth refonte — merge `32c5b7d`
Port Emergent d5ac086 FriendlyMatchPage.js : hero centré Swords 72×72 +
CTA "Commencer la partie" + disclaimer + couleurs 4 étapes (orange/vert/bleu/violet)
+ bloc CTA final "Prêt à jouer ?" avec lien "Déjà inscrit ? Se connecter".

## ✅ Club detail refonte — merge `64ae19e`
Port Emergent ClubDetailPage.js : header navy compact avec toggle Suivre/Suivi
+ grille 3 stats (Joueurs/Tournois/Terrains) + adresse cliquable Google Maps
+ feed posts du patron via `useProfilePosts(owner.uuid)` + 3 cards services
statiques (Boutique/Réservation/Restauration).

## ✅ Tournament detail complete — merge `3782f8f`
12 features port Emergent TournamentDetailPage.js :
- P0 : Partner picker à l'inscription, prix visible Info card, bouton Partager
  (Share native), onglet Salon tournoi (polling 5s)
- P1 : Delete tournoi owner, actions directes MatchRow (Score live/Forfait),
  onglet Tableau (BracketView SVG RN)
- P2 : Subscribe club depuis Info card, waitlist amber, TS1-TS4 badges + team_points,
  groupement matchs par pool/bracket, format+phase badges dérivés

## ✅ Match live improvements — merge `bfaca04`
- Migration `matches.started_at` + timer mm:ss + polling 5s conditionnel
- LivePulseBadge Reanimated (opacity 1↔0.4, 800ms)
- CompletedBlock match amical : card vert/rouge contextuelle + Trophy doré
  + ELO delta inline (`Niveau X.X → Y.Y + delta`) + upload photo result +
  footer Retour/Mes stats
- `canScore` étendu à owner + admin (backend + mobile)
- Noms des joueurs complets sous team_name
- "Valider" → "Partie terminée" + bouton "Démarrer" vert `#16A34A`

## ✅ Throttle checkout + rate-limiter leak — commit `ce72a6b`
- `POST /payments/checkout/create` : `throttle:10,1` → `throttle:60,1`
- Fix rate-limiter state leak entre tests PHPUnit :
  - `tests/bootstrap.php` custom force env vars avant Laravel boot
  - `.env.testing` (CACHE=array, QUEUE=sync, MAIL=array)
  - `TestCase::setUp` appelle `Cache::flush()` + `RateLimiter::clear('')`
- Résultat : `php artisan test` passe de **73 failed → 0 failed** (+73 verts)

## ✅ Safe area bulk fix + chat CTAs + profil Wins/Losses — merge `77a2e72`
- 14 occurrences `edges={['top']}` → `edges={[]}` sur tous les écrans
- 2 pills dans header conversation : "Proposer un tournoi" + "Match amical"
- Stats profil Niveau/Position → Victoires (vert) / Défaites (rouge)

## ✅ [Résolu session 19/4] CTA S'inscrire masqué pour creator + referee
Bouton "S'inscrire" masqué pour l'organisateur et pour role=referee (fix
`7e901c3`). Le bouton "Lancer le tournoi" reste visible pour le creator.

---

*Dernière mise à jour : 20 avril 2026 — session comparaison Emergent quasi-complète + tests 0 failed*
