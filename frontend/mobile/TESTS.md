# Plan de tests — Phase 6.2 mobile

Tests manuels émulateur à exécuter avant merge de `feature/mobile-phase-6-2` vers `main`.
Chaque groupe couvre happy path + cas limites + cas d'erreur.

---

## G1 — Score live

### Navigation & accès
- [ ] Depuis un tournoi `status=open` → tabs visibles : Infos / Équipes / Seeking (pas de Matches)
- [ ] Depuis un tournoi `status=in_progress` → tabs Infos / Équipes / Matchs / Poules / Classement (pas de Seeking)
- [ ] Depuis un tournoi `status=completed` → mêmes tabs que in_progress (matches figés)
- [ ] Tab Matchs affiche la liste ordonnée phase / round / match_number
- [ ] Tap sur une ligne match → ouvre `/matches/[id]?tournament=<uuid>` avec le match sélectionné

### MatchLive — score input
- [ ] **Capitaine / partenaire** d'une des deux équipes : boutons + / − visibles et réactifs
- [ ] **Non-membre** du match : boutons + / − cachés, score en lecture seule
- [ ] Plafond de +1 à 9 jeux (pas de 10)
- [ ] Plancher de −1 à 0 (pas de négatif)
- [ ] Match initialement `pending` passe en `in_progress` à la première saisie
- [ ] Badge LIVE rouge pulsé s'affiche quand `in_progress`
- [ ] Surbrillance emerald sur la team vainqueur dès qu'un score dépasse l'autre

### Tie-break 8-8
- [ ] Passer à 8-8 ouvre automatiquement le modal tie-break
- [ ] Modal refuse `tb1=tb2` (écart < 2)
- [ ] Modal refuse écart = 1 (par ex. 10-9)
- [ ] Modal accepte écart ≥ 2 (par ex. 10-8, 12-10)
- [ ] Après validation tie-break : badge "Tie-break !" + affichage des points (ex : 10-8)

### Double validation capitaine
- [ ] Bloc Validation apparaît quand `in_progress` et games ≥ 5
- [ ] Capitaine team1 voit "Valider" actif, partenaire team1 voit "En attente"
- [ ] Après validation team1 → badge emerald "Validé"
- [ ] Même logique team2
- [ ] Double validation → match passe en `completed`, bloc emerald "Match terminé"
- [ ] Reclassement : ranking live se met à jour immédiatement (V/D, position)
- [ ] Standings pool correspondante : 1er rang passe en highlight orange
- [ ] **Bug à vérifier** : modifier le score après une validation unilatérale → le flag validated_by_teamX est remis à false (les 2 doivent re-valider)

### Forfait
- [ ] Bouton "Déclarer forfait" visible uniquement pour l'organisateur (creator)
- [ ] Dialog 3 choix : Annuler / team1 forfait / team2 forfait
- [ ] Sélection team1 forfait → winner = team2, score 9-0, status=forfeit
- [ ] Bloc amber "Match forfait" avec nom vainqueur
- [ ] Pas de boutons validation ni +/- après forfait

### Pools & Ranking
- [ ] Tab Poules affiche les N poules avec classement live (V/D/Pts)
- [ ] Highlight orange sur le 1er de chaque poule
- [ ] Tab Classement : podium 1-3 avec highlight orange
- [ ] Label "Classement live" pendant le tournoi, "Classement final" après completion

---

## G2 — Seeking partner complet

### Déclaration seeking avec message
- [ ] Tab Seeking d'un tournoi `open/full` : bouton "Je suis seul sur ce tournoi" (non-seeking)
- [ ] Tap → modal bottom-sheet avec TextInput multiline
- [ ] Saisie max 500 caractères (limite backend)
- [ ] Validation vide : message optionnel, accepte envoi sans texte
- [ ] Validation avec message → POST `/seeking-partner` avec body `{ message }`
- [ ] Bouton devient "Retirer ma déclaration" en variant ghost
- [ ] Tap retrait → DELETE direct (pas de modal)

### Cockpit — Je suis seul
- [ ] Bloc "Je suis seul (N)" visible uniquement si mySeekings.length > 0
- [ ] Affiche les 3 premières déclarations (même si 5+)
- [ ] Tap ligne → détail tournoi
- [ ] Nom tournoi + club/level affichés
- [ ] Bloc disparaît quand on retire toutes les déclarations

### Inbox propositions
- [ ] ActionCard "Propositions partenaires" visible dans Cockpit Player
- [ ] Subtitle dynamique : "N en attente" si pending, sinon "Reçues et envoyées"
- [ ] Tap → écran `/proposals` avec pills Reçues / Envoyées (Reçues par défaut)
- [ ] Switch Envoyées → liste des propositions envoyées

### Carte proposition — Reçues pending
- [ ] Affiche avatar initiale + nom + tournoi + message "entre guillemets"
- [ ] Badge "En attente" (info)
- [ ] Boutons "Refuser" (ghost) + "Accepter" (orange)
- [ ] Accepter → `PUT respond accepted` → badge passe "Acceptée" (success) + **conversation créée côté backend** (vérifiée en G3)
- [ ] Refuser → `PUT respond refused` → badge "Refusée" (danger)

### Carte proposition — Envoyées pending
- [ ] Bouton unique "Annuler" (ghost)
- [ ] Tap → dialog confirm "Oui, annuler"
- [ ] Confirm → `DELETE /proposals/{uuid}` → disparaît de la liste

### Cas d'erreur
- [ ] Accepter/refuser une proposition déjà traitée → erreur 422 affichée en Alert
- [ ] Accepter sans auth → redirect login (normalement impossible puisque screen derrière auth)

---

## G3 — Chat / Conversations

### Liste conversations
- [ ] Accessible depuis : AppHeader icône Messages + Cockpit ActionCard Messages
- [ ] Empty state `MessageCircle` gris + "Aucune conversation" si vide
- [ ] Après avoir accepté une proposition G2 → conversation apparaît en tête de liste
- [ ] Avatar initiale orange ou photo si disponible
- [ ] Last_message en caption, date relative (min / h / j) alignée droite
- [ ] Badge orange unread_count si messages non lus (99+ si > 99)
- [ ] Tap conversation → détail `/conversations/[uuid]`
- [ ] Pull-to-refresh rafraîchit la liste
- [ ] Polling 10s (observable en laissant ouvert + envoyer un message depuis un autre compte)

### Détail conversation
- [ ] Header avec back + avatar + nom de l'interlocuteur
- [ ] Liste messages chronologique ASC (plus ancien en haut)
- [ ] Bulles orange à droite si message de l'user connecté, blanches à gauche sinon
- [ ] Timestamp HH:MM sous chaque bulle
- [ ] Scroll automatique vers le bas à l'ouverture
- [ ] Composer : TextInput multiline + bouton Send orange (disabled si vide)
- [ ] Envoi → apparaît immédiatement dans la liste (optimiste via onSuccess)
- [ ] Erreur 422 → message remis dans l'input + Alert
- [ ] KeyboardAvoidingView : input reste visible quand clavier ouvert (iOS)
- [ ] Polling 10s : un message envoyé depuis l'autre compte apparaît dans les 10s

### Cas limites
- [ ] Conversation inexistante (UUID bidon) → erreur 403 ou 404 affichée
- [ ] Utilisateur non participant → 403 de backend → fallback state

---

## G4 — QR scanner & QR display

### Affichage QR (tournament detail)
- [ ] Bouton "QR" en haut-droite de la page détail tournoi (à côté du back) — visible UNIQUEMENT si `share_link` présent
- [ ] Tap → modal bottom-sheet avec QR code 220px généré depuis share_link
- [ ] Lien URL affiché sous le QR, sélectionnable
- [ ] Bouton "Partager le lien" navy → ouvre le partage natif iOS/Android
- [ ] Tap outside / X → ferme le modal

### Scanner QR
- [ ] Accessible depuis : Cockpit Player et Cockpit Referee → ActionCard "Scanner un QR"
- [ ] Première ouverture : écran permission "Accès caméra requis" + bouton "Autoriser la caméra"
- [ ] Tap autoriser → dialog permission OS natif
- [ ] Refus permission → écran permission réaffiché, bouton re-demande
- [ ] Acceptation → vue caméra plein écran avec overlay carré 256px + texte
- [ ] Pointer sur un QR tournoi → parse uuid → `router.replace('/tournois/[id]')`
- [ ] Pointer sur un QR non-tournoi (texte random, autre URL) → lock relâché après 1.5s, reste sur la caméra
- [ ] Bouton back en haut-gauche (fond noir translucide) → retour écran précédent

### Cas limites
- [ ] QR avec URL malformée → ignoré, pas de crash
- [ ] QR valid UUID mais tournoi supprimé → navigation → 404 côté détail tournoi (fallback natif)
- [ ] App en arrière-plan puis retour → la caméra reprend sans freeze

---

## Bonus — Lancer un tournoi (organizer action)

### Visibilité du bouton
- [ ] Organisateur + status `open` + 0 équipe : bouton visible mais désactivé ("min 2 équipes, 0 inscrites")
- [ ] Organisateur + status `open` + 1 équipe : bouton visible mais désactivé ("1 inscrite")
- [ ] Organisateur + status `open` + 2+ équipes : bouton actif "Lancer le tournoi"
- [ ] Organisateur + status `full` + 2+ équipes : bouton actif
- [ ] **Non-organisateur** (autre user) : bouton masqué quel que soit le status
- [ ] Status `in_progress` ou `completed` : bouton masqué (même pour organisateur)

### Action launch
- [ ] Tap bouton actif → Alert confirm avec nombre d'équipes + warning irréversible
- [ ] Annuler → aucune action
- [ ] Lancer → POST `/tournaments/{uuid}/launch`, loading state sur bouton
- [ ] Succès → status passe à `in_progress`, tabs Matches/Poules/Classement apparaissent (G1)
- [ ] Les matchs sont générés côté backend (GenerateMatchesJob async, peuvent mettre 1-2s à apparaître dans la tab Matches)
- [ ] Erreur 422 (< 2 équipes côté serveur) → message affiché en Alert

---

## G7 — Matchs amicaux + ELO

### Création match amical
- [ ] Depuis tab Match (auth) : bouton "Lancer un match" → modal 3 pickers
- [ ] UserPickerModal debounce 300ms, exclut le user courant + déjà-sélectionnés
- [ ] Submit crée le match → redirect automatique `/match/{uuid}/live`
- [ ] Backend refuse 4 joueurs non-distincts (422)

### Invitations & acceptations
- [ ] Les 3 invités voient l'invitation dans leur tab Match "Invitations (N)"
- [ ] Tap → ouvre `/match/{uuid}/live` avec CTA Accepter/Refuser
- [ ] 4/4 acceptés → status passe à `accepted`, CTA "Démarrer"
- [ ] Refuser → status `declined`, écran message "Match refusé"

### Score live + tie-break + validation
- [ ] Start → `in_progress`, badge LIVE rouge pulsé
- [ ] +/- accessibles à tout participant
- [ ] Passage 8-8 ouvre modal tie-break (écart ≥ 2 requis)
- [ ] Validation bloc apparaît à 5 jeux minimum
- [ ] Captain team1 valide → badge emerald "Validé"
- [ ] Captain team2 valide → status `completed` + winner_team défini

### ELO + bloc post-match
- [ ] Bloc emerald "Match terminé" + score final + message victoire/défaite
- [ ] Bloc orange "Ton nouvel ELO" avec valeur 5.15/4.85 (cas 5v5 égalité)
- [ ] Si <10 matchs : badge "Encore N matchs pour déverrouiller"
- [ ] Vérifier via Insomnia : 4 user_elos mis à jour avec delta exact

### Onglet Matchs Profile
- [ ] Switcher "Infos" / "Matchs" (navy actif)
- [ ] Tab Matchs : EloCard avec declared + elo + stats V/D
- [ ] Barre progression 1-10 correspond à elo_level
- [ ] Badge 🔒 avec matches_to_unlock si locked
- [ ] Historique : rows V/D + date FR + score

---

## G7c — BottomNav refonte

- [ ] Navbar visible : Actu / Tournois / **Cockpit** / **Match** (Swords) / Partenaires
- [ ] Clubs disparu de la navbar mais accessible via Cockpit ActionCard
- [ ] Tap Match sur navbar → `/match` index

---

## G8 — Game proposals (parties planifiées)

### Création proposition
- [ ] Backend : POST /game-proposals avec 1-10 invités + date + time
- [ ] Creator auto-accepté (accepted_count = 1 initial)
- [ ] 422 si 0 invité, >10 invités, duplicate, self-invite, date passée

### Réponses invités
- [ ] Invité voit la proposition dans tab Match "Parties planifiées"
- [ ] Tap Accepter → accepted_count incrémenté
- [ ] 3 invités acceptent → status passe à `full`
- [ ] Tap Refuser → response=refused, proposition reste open
- [ ] Non-invité ne peut pas respond → 403

### Annulation
- [ ] Creator peut annuler → status=cancelled, disparaît de /my
- [ ] Non-creator ne peut pas annuler → 403
- [ ] Respond sur cancelled → 422

### Démarrage (creator full only)
- [ ] Status=full → creator voit CTA "Assigner rôles & démarrer"
- [ ] Tap → appelle `/start` avec les 3 premiers accepted (MVP)
- [ ] Backend crée un friendly_match status=accepted (bypass pending) avec 4 participants pré-accepted
- [ ] Redirect automatique vers `/match/{friendly_match_uuid}/live`
- [ ] Proposal passe à status=started + friendly_match_id renseigné

### Cas limites
- [ ] Non-creator tente start → 403
- [ ] Creator tente start avec <3 accepted → 422
- [ ] Creator assigne un non-accepted → 422

---

## Regression post-merge

- [ ] Feed (G6 6.1.5) toujours fonctionnel
- [ ] Partenaires mode tournoi (G7 6.1.5) toujours fonctionnel
- [ ] Clubs (Phase 6.1.6) toujours fonctionnel (hors navbar)
- [ ] Backend `php artisan test` : 295 tests verts (+ G7a +30 + G8 +19 vs baseline 246)
- [ ] Pas d'erreur runtime à l'ouverture de chaque onglet tab
