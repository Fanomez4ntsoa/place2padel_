# BACKLOG — Place2Padel

Items différés à traiter après les phases en cours. Format : priorité, contexte, proposition, dépendances.

---

## 🔴 Lot A — Feed complet (P0)

### A.1 — Création de post (entièrement manquant côté mobile)

**Contexte**
Le bouton **"+ Nouveau post"** du Cockpit Player ([cockpit.tsx:273-275](frontend/mobile/app/(tabs)/cockpit.tsx#L273-L275)) fait `router.push('/profil/{uuid}')` — placeholder. La tab Posts du profil affiche les posts existants et un empty state qui redirige vers `/actualites`, qui n'a **pas** de composer non plus. Cercle vicieux : aucun point d'entrée de création de post dans toute l'app.

**Endpoint backend disponible**
`POST /posts` ([CreatePostController](backend/app/Modules/Feed/Controllers/CreatePostController.php)) accepte `{ text?, image?, tournament_uuid? }` (multipart).

**Proposition**
1. Hook `useCreatePost` dans [src/features/feed/useFeed.ts](frontend/mobile/src/features/feed/useFeed.ts) — mutation FormData + invalidate `['feed']` + `['profile-posts']`
2. Composant `CreatePostSheet` dans `src/components/feed/CreatePostSheet.tsx` — bottom-sheet avec :
   - Textarea multiline (max 2000 chars)
   - Bouton "Ajouter une photo" → `expo-image-picker` (permissions déjà déclarées app.json)
   - Preview image 4/5 + bouton croix
   - Sélecteur optionnel tournoi (reuse pattern `ProposeTournamentSheet`)
   - Bouton "Publier" orange désactivé si ni text ni image
3. FAB orange bottom-right sur [actualites.tsx](frontend/mobile/app/(tabs)/actualites.tsx) → ouvre `CreatePostSheet`
4. Wire bouton "+ Nouveau post" Cockpit : `router.push('/(tabs)/actualites?compose=1')` avec query param auto-open, OU remonter `CreatePostSheet` state via un store léger
5. Dans `ProfilePostsTab` de [profil/[id].tsx](frontend/mobile/app/profil/[id].tsx) : si `isSelf`, CTA "Publier un post" en haut qui ouvre la même sheet

**Référence Emergent**
[ProfilePage.js:322-348](../placeToPadel/frontend/src/pages/ProfilePage.js#L322) — composer Textarea + file input image + bouton Publier, conditionné `isOwnProfile`.

**Priorité** 🔴 P0 — feature core MVP bloquée.

### A.2 — Fix 5 invalidations feed manquantes

**Contexte**
Après actions qui créent un post système backend (via listeners `CreateSystemPostOnTournamentCreated`, `CreateSystemPostOnTournamentCompleted`, etc.), le feed mobile ne rafraîchit pas → l'user voit des données périmées.

**Bugs identifiés**

| # | Hook | Fichier:ligne | Fix |
|---|---|---|---|
| 1 | `useUploadProfilePhoto` | [useProfile.ts:104](frontend/mobile/src/features/profile/useProfile.ts#L104) | `qc.invalidateQueries({ queryKey: ['feed'] })` — sinon anciennes photos sur les posts |
| 2 | `useCreateTournament` | [useTournament.ts:62](frontend/mobile/src/features/tournaments/useTournament.ts#L62) | Ajouter `['feed']` — post système `tournament_created` n'apparaît pas |
| 3 | `useRegisterTeam` | [useTournament.ts:90](frontend/mobile/src/features/tournaments/useTournament.ts#L90) | Ajouter `['feed']` |
| 4 | `useCreateFriendlyMatch` | [useFriendlyMatches.ts:55](frontend/mobile/src/features/friendly-matches/useFriendlyMatches.ts#L55) | Ajouter `['feed']` |
| 5 | `useValidateFriendlyMatch` | [useFriendlyMatches.ts:129](frontend/mobile/src/features/friendly-matches/useFriendlyMatches.ts#L129) | Ajouter `['feed']` — résultat final post système |

**Proposition**
Helper `invalidateFeedKeys(qc)` dans `src/lib/invalidations.ts` centralisant les invalidations `['feed']` + `['profile-posts']`. Chaque mutation appelle ce helper en `onSettled`.

**Priorité** 🔴 P0 — UX dégradée sur actions fréquentes.

**Statut** Lot A à livrer ensemble (A.1 + A.2) dans une même branche — test E2E après.

---

## 🟠 Lot B — Audit visuel pages non encore comparées (P1)

### B.1 — actualites.tsx

**Contexte**
Page feed jamais comparée à Emergent. État actuel : 100 lignes basiques avec `FeedFilterPills` + `FlatList` de `PostCard`. Aucun compositeur (fixé par Lot A).

**Proposition**
Comparaison structurée vs feed Emergent (section par section du composant web équivalent) : filtres sticky, ordre sections, empty state, pull-to-refresh, infinite scroll. Lister écarts P0/P1/P2.

**Priorité** 🟠 P1.

### B.2 — home.tsx

**Contexte**
Page restaurée depuis commit orphelin `28f25f1` (Phase 6.1.5 récupération) mais jamais auditée section par section post-restauration. Possibles dérives vs HomePage.js Emergent d5ac086.

**Proposition**
Audit grille 9 cases + hero navy + popup "bientôt" (déjà wiré waitlist) + footer marketing. Vérifier parité visuelle avec la version Emergent actuelle.

**Priorité** 🟠 P1.

---

## 🟡 Lot C — Actions owner + compositeur club (P2)

### C.1 — DELETE /posts/{post} + DELETE /comments/{comment}

**Contexte**
Endpoints backend livrés (Phase 5.1) mais aucune UI mobile pour supprimer ses propres posts ou commentaires.

**Proposition**
- `useDeletePost(postUuid)` + `useDeleteComment(commentUuid)` dans useFeed.ts
- Long-press sur `PostCard` (ou `ProfilePostCard`) → ActionSheet "Supprimer" si `post.author?.uuid === user?.uuid`
- Même pattern pour commentaires dans `CommentsSheet`
- Confirmation `Alert.alert` avant delete

**Priorité** 🟡 P2.

### C.2 — Compositeur d'annonces club (patron)

**Contexte**
La page `clubs/[id].tsx` affiche bien les infos + tournois du club, mais aucun point d'entrée pour le **patron** (`isOwner`) de poster une annonce sur la page de son club. Emergent `ClubDetailPage.js` a un composer dédié.

**Proposition**
Si `isOwner`, afficher une card "Publier une annonce" qui ouvre une sheet similaire à `CreatePostSheet` mais avec `club_uuid` pré-rempli (champ backend à ajouter sur `posts` si absent — à vérifier schéma). Affichage des posts du club dans un onglet dédié de la page club.

**Priorité** 🟡 P2 — dépend décision produit sur la feature club_owner mobile (backend déjà prêt depuis sync Emergent d5ac086).

---

## 🟡 Game Proposal — UI mobile manquante (Phase 6.2 G8)

**Contexte**
Les 5 endpoints backend Game Proposal sont prêts (`GET /game-proposals/my`, `POST`, `PUT respond`, `DELETE`, `POST start`) depuis la Phase 6.2 mais aucun hook/écran mobile ne les consomme. Dans Emergent, les game proposals apparaissent comme option dans le chat (planification différée d'une partie avec date/heure/club).

**Proposition**
- Hooks `useGameProposals` + mutations dans `src/features/game-proposals/useGameProposals.ts`
- Sheet `ProposeGameSheet` (depuis le chat, bouton à côté de "Match amical") avec champs date + heure + club + message
- Écran `/game-proposals/index.tsx` pour lister mes propositions (Reçues/Envoyées) avec actions Accept/Refuse/Cancel/Start

**Priorité** 🟡 P1.

---

## 🟡 Stripe — Page de retour post-paiement

**Contexte**
Après un paiement Stripe réussi, l'URL de success (`{FRONTEND_URL}/tournois/{uuid}?session_id=xxx`) pointe actuellement vers le frontend web. Aucune page web n'existe encore (Phase 7 Next.js non démarrée). Sur mobile, l'utilisateur paie via navigateur externe puis doit revenir manuellement dans l'app pour voir l'overlay de polling se finaliser — expérience sous-optimale.

**Proposition**
Créer une page de retour simple, deux options :

1. **Endpoint Laravel `/payment/success` (court terme)** — page HTML statique servie par le backend :
   - Affiche "Paiement confirmé ✅ — Retournez sur l'app PlaceToPadel"
   - Bouton CTA `<a href="placetopadel://tournois/{uuid}?session_id=xxx">Ouvrir l'app</a>`
   - Fallback texte pour ouverture manuelle si le deep link ne fonctionne pas
   - Style minimal aligné charte (orange `#E8650A`, navy `#1A2A4A`)

2. **Page Next.js (Phase 7)** — intégration propre dans le site web marketing :
   - Route `/tournois/{uuid}` avec détection `?session_id=xxx` → déclenche un polling côté client ou redirect deep link
   - Gestion des 3 cas : paid / pending / cancelled
   - Meta OpenGraph pour partage social ("J'ai rejoint le tournoi {name} !")

**Prérequis deep link**
- Configurer le scheme `placetopadel://` dans Expo (cf. issue "Rename scheme" ci-dessous)
- Tester les universal links iOS + App Links Android

**Dépendances**
- Décision : court terme endpoint Laravel simple OU attendre la Phase 7 Next.js
- Configuration du domaine de prod (pointer `success_url` vers la vraie URL)

**Priorité** 🟡 P1 — bloquant avant mise en prod Stripe.

---

## 🟡 Rename scheme `place2padel` → `placetopadel://`

**Contexte**
Le projet est rebrandé "PlaceToPadel" dans l'UI (majuscule T centrée) mais techniquement le scheme deep link + bundle identifiers restent `place2padel` / `com.place2padel.app`. Les emails (reset password, notifications) et success URLs Stripe utilisent déjà `placetopadel.com` domain, donc incohérence.

**Fichiers à mettre à jour**

| Fichier | Ligne | Avant | Après |
|---|---|---|---|
| [app.json](frontend/mobile/app.json) | scheme | `"place2padel"` | `"placetopadel"` |
| [app.json](frontend/mobile/app.json) | ios.bundleIdentifier | `"com.place2padel.app"` | `"com.placetopadel.app"` |
| [app.json](frontend/mobile/app.json) | android.package | `"com.place2padel.app"` | `"com.placetopadel.app"` |
| package.json | name | `"place2padel-mobile"` | `"placetopadel-mobile"` |

**Impact**
- Rebuild dev client requis côté Android et iOS (nouveau bundle ID)
- Deep links existants invalidés (aucun en prod, safe)
- Tests des liens email reset password + success Stripe à refaire

**Priorité** 🟡 P1 — préalable à la publication stores (Phase 8) + au flow Stripe en prod.

---

## ✅ [Résolu] CTA "S'inscrire" masqué pour creator + referee

**Contexte** — Bug identifié au test émulateur : le bouton "S'inscrire" s'affichait pour l'organisateur d'un tournoi (qui ne s'inscrit pas à son propre tournoi) et pour les utilisateurs avec `role=referee` (ne jouent pas, organisent uniquement).

**Fix** — Dans [app/(tabs)/tournois/[id].tsx](frontend/mobile/app/(tabs)/tournois/[id].tsx) : le bloc `<TournamentCta>` est wrappé par une condition :
```tsx
{tournament.creator?.uuid !== user?.uuid && user?.role !== 'referee' ? (
  <TournamentCta ... />
) : null}
```

**Impact** — Bouton "Lancer le tournoi" reste visible pour le creator (logique séparée, conditions distinctes). Bouton "S'inscrire / Se désinscrire" uniquement pour les joueurs non-créateurs.

**Statut** ✅ Résolu — commit à venir.

---

*Dernière mise à jour : 19 avril 2026 (ajout Lot A/B/C + Game Proposal + rename scheme après audit session complet)*
