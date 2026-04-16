# Plan de tests — Phase 6.2 mobile

Tests manuels émulateur à exécuter avant la mise en prod. Couvre G1 → G9 + Bonus Launch + régression globale sur tous les modules mergés.

Backend actuel sur `main` : **309 tests PHPUnit verts** (1108 assertions). TSC mobile : clean.

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

## G7 — Matchs amicaux + ELO (FriendlyMatch)

### Accès & état initial
- [ ] Tab "Match" visible dans la BottomNav (icône Swords, entre Cockpit et Partenaires)
- [ ] Non-auth : tab Match affiche hero marketing + 4 features + CTA register (pas de login requis pour voir)
- [ ] Auth : tab Match affiche EloCard + bouton "Lancer un match" + sections Invitations/En cours si existantes
- [ ] EloCard initiale : declared_level (issu de user_profile.padel_level, default 4) = elo_level, badge 🔒 "Encore 10 matchs pour déverrouiller"

### Création d'un match amical (4 joueurs obligatoires)
- [ ] Tap "Lancer un match" → modal bottom-sheet avec 3 SlotPicker (partenaire, adversaire 1 captain, adversaire 2)
- [ ] Tap SlotPicker ouvre UserPickerModal avec recherche debounce 300ms
- [ ] Recherche < 2 caractères : affiche "Tape au moins 2 caractères"
- [ ] Recherche ≥ 2 caractères : liste de 10 users max, triés par nom
- [ ] Le user courant est exclu des résultats (pas de self-invite)
- [ ] Joueurs déjà sélectionnés dans d'autres slots sont exclus (pas de duplicate)
- [ ] Bouton "Créer l'invitation" disabled tant que les 3 slots ne sont pas tous remplis
- [ ] Submit → POST /friendly-matches → redirect automatique vers `/match/{uuid}/live`
- [ ] Match créé avec status `pending`, 4 participants (creator team1 slot1 captain accepted ; partner team1 slot2 non-accepted ; opp1 team2 slot1 captain non-accepted ; opp2 team2 slot2 non-accepted)
- [ ] Backend refuse 4 joueurs non-distincts (422) — impossible via UI mais test API direct

### Acceptations (invitations reçues)
- [ ] Chaque invité voit l'invitation dans sa tab Match "Invitations (N)"
- [ ] Tap invitation → ouvre `/match/{uuid}/live` avec CTA "Refuser" / "Accepter"
- [ ] Accepter → responded_at rempli, header "En attente des acceptations" reste tant que <4/4
- [ ] Quand 4/4 acceptés → status passe à `accepted`, CTA devient "Démarrer le match"
- [ ] Si 1 invité refuse → status passe directement à `declined`, écran rouge "Match refusé", irreversible
- [ ] Non-participant tente d'accepter (via API) → 403

### Démarrage du match
- [ ] Creator tape "Démarrer le match" → PUT /start → status=in_progress, started_at rempli
- [ ] Badge LIVE rouge pulsé s'affiche dans le header
- [ ] Tout participant peut démarrer (pas uniquement creator)
- [ ] Start sur un match pending (pas encore 4/4) → 422 "Le match n'est pas encore accepté par les 4 joueurs"

### Score live
- [ ] Tous les 4 participants voient les boutons +/- accessibles (pas de restriction captain-only)
- [ ] Non-participant (user extérieur au match) : pas de boutons +/-, score lecture seule
- [ ] +/- saisit le score et re-synchronise entre les 4 joueurs via polling 10s
- [ ] Plafond 9, plancher 0
- [ ] Toute nouvelle saisie reset les flags validated_by_team1/team2 (les 2 capitaines doivent re-valider)

### Tie-break 8-8
- [ ] Passer à 8-8 ouvre automatiquement modal tie-break
- [ ] Modal refuse écart < 2
- [ ] Modal accepte écart ≥ 2 (ex : 10-8, 12-10)
- [ ] Après validation : badge "Tie-break !" + affichage (ex : "10 – 8")

### Double validation capitaine
- [ ] Bloc Validation apparaît dès que `in_progress` + games ≥ 5 (et TB présent si 8-8)
- [ ] Captain team1 voit "Valider" actif, partner team1 voit "En attente"
- [ ] Captain team1 valide → badge emerald "Validé"
- [ ] Captain team2 valide → status `completed`, winner_team défini (games > games OR TB > TB)
- [ ] Bloc emerald "Match terminé" + score final affiché
- [ ] Message contextuel : "🏆 Victoire !" si user dans winner team, "Défaite — continue à progresser" sinon

### Bloc ELO impact post-match
- [ ] Bloc orange "Ton nouvel ELO" affiché automatiquement après completion
- [ ] Pour un match 5v5 (4 joueurs declared_level=5) score 6-3 : winner team → ELO 5.15, loser team → 4.85
- [ ] Si matches_played < 10 : badge "Encore N match(s) pour déverrouiller ton niveau"
- [ ] Fixtures ELO à vérifier (via Insomnia GET /users/{uuid}/elo après completion) :
  - 5v5 égalité : +0.15 / −0.15 → 5.15 / 4.85
  - 6v4 favori gagne : 6.07 / 3.93
  - 4v6 outsider gagne : 4.23 / 5.77
  - 9.9v2 clamp haut : 9.90 / 2.00
  - 2v9.9 upset extrême : 2.30 / 9.60
- [ ] Les 4 user_elos (winners + losers) ont leur history incrémenté d'un entry avec match_uuid, result, opponent_avg_elo, elo_before, elo_after

### Onglet Matchs Profile
- [ ] Dans `/profil/{uuid}` : switcher "Infos" / "Matchs" en haut (segmented control navy actif)
- [ ] Tab Matchs affiche :
  - EloCard complète (declared, elo, barre progression 1-10, badge lock, stats V/D)
  - Delta visible (flèche verte up ou rouge down) si unlocked
  - Historique : rows V/D badge emerald/red + date FR + score
- [ ] Historique vide → Card "Aucun match joué pour l'instant"
- [ ] Tab Infos inchangé (stats FFT, bio, niveaux, disponibilités)

### BottomNav refonte (G7c)
- [ ] Navbar affiche 5 onglets : Actu / Tournois / **Cockpit** (centre surélevé) / **Match** (Swords) / Partenaires
- [ ] **Clubs DISPARU de la navbar**
- [ ] Clubs reste accessible via Cockpit → ActionCard "Mes clubs" ou Feed post tournoi → lien club
- [ ] Tap icône Match navbar → route `/match` (tab index)
- [ ] Route `/match/[id]/live` n'apparaît pas dans la navbar (href: null) mais est accessible via push

---

## G8 — Game proposals (parties planifiées)

### Création proposition (1-10 invités)
- [ ] UI de création : non implémentée dans l'app mobile pour l'instant → test via Insomnia
- [ ] POST /game-proposals avec `invitee_uuids` array (1 à 10) + date (≥ aujourd'hui) + time (HH:MM)
- [ ] Creator auto-accepté (accepted_count = 1 initial, status=open)
- [ ] 422 si : 0 invité / > 10 invités / duplicate invitee / self-invite / date passée / invitee_uuid inexistant

### Visualisation dans la tab Match
- [ ] Section "Parties planifiées (N)" visible dans tab Match entre "Invitations" et "En cours"
- [ ] Chaque proposal affichée via GameProposalCard :
  - Badge status coloré (open amber / full blue / started emerald / cancelled slate)
  - Compteur "accepted_count / 4"
  - Date FR courte + heure + durée
  - Lieu (club + city si renseignés)
  - Tags invités avec marqueurs (✓ accepted, ✕ refused, rien si pending)

### Réponses invités
- [ ] Invité voit la proposition dans sa tab Match "Parties planifiées (N)"
- [ ] Card invité pending : boutons "Refuser" (ghost) + "Accepter" (orange)
- [ ] Accepter → PUT /respond body `{ response: "accepted" }` → accepted_count + 1
- [ ] Refuser → PUT /respond body `{ response: "refused" }` → response=refused, proposition reste status=open
- [ ] Quand 3 invités acceptent (+ creator = 4) → proposal.status passe à `full`, CTA creator devient "Assigner rôles & démarrer"
- [ ] Non-invité tente respond → 403 "Tu n'es pas invité à cette partie"
- [ ] Double-accept idempotent (pas d'erreur)

### Annulation
- [ ] Creator voit bouton "Annuler" tant que status ≠ started/cancelled
- [ ] Tap "Annuler" → dialog confirm "Oui, annuler"
- [ ] Confirm → DELETE /game-proposals/{uuid} → status=cancelled, proposition disparaît de /my
- [ ] Non-creator tente annuler → 403 "Seul le créateur peut annuler la proposition"
- [ ] Respond sur cancelled → 422 "Cette partie a été annulée"

### Démarrage (creator, status=full uniquement)
- [ ] CTA "Assigner rôles & démarrer" visible uniquement si isCreator && status=full
- [ ] Tap → POST /start (MVP : assigne auto les 3 premiers accepted comme partner/opp1/opp2)
- [ ] Backend crée un friendly_match status=**accepted** directement (bypass pending car tous ont déjà consenti au niveau proposal)
- [ ] Les 4 participants du friendly_match ont tous accepted_at rempli
- [ ] Proposal passe à status=started, friendly_match_id renseigné
- [ ] Redirect automatique mobile vers `/match/{friendly_match_uuid}/live`
- [ ] Match démarre comme un G7 classique mais avec statut initial `accepted` — plus besoin d'acceptations

### Cas limites
- [ ] Non-creator tente /start → 403
- [ ] Creator tente /start avec <3 accepted → 422 "Seulement X/3 joueurs invités ont accepté"
- [ ] Creator assigne un joueur non-accepted dans les rôles → 422 "Ce joueur n'a pas accepté la partie"

---

## G9 — Stripe par tournoi + Resend emails

### Prérequis environnement
- [ ] `.env` backend : `STRIPE_KEY=pk_test_51Rbz...`, `STRIPE_SECRET=sk_test_51Rbz...`, `STRIPE_WEBHOOK_SECRET=whsec_...`
- [ ] `.env` backend : `MAIL_MAILER=resend`, `RESEND_API_KEY=re_H5Zus...`, `MAIL_FROM_ADDRESS=noreply@placetopadel.com`
- [ ] Vérifier `config:clear && config:cache` si nécessaire

### Création d'un tournoi payant (via Insomnia ou écran admin)
- [ ] POST /tournaments avec `payment_method: "online"` et `price: "15€"` → tournament créé avec `payment_method=online` visible dans la réponse
- [ ] payment_method default = `on_site` si non fourni
- [ ] Valeur invalide `payment_method: "bitcoin"` → 422 validation error
- [ ] Mobile : le champ payment_method du TournamentResource remonte bien dans le détail

### CTA dynamique sur le détail tournoi
- [ ] Tournoi `payment_method=on_site` : CTA label standard "S'inscrire" (flow existant, inscription directe)
- [ ] Tournoi `payment_method=online` + prix "15€" : CTA label dynamique **"S'inscrire — 15€"**
- [ ] Sous-texte "🔒 Paiement sécurisé via Stripe" visible uniquement en mode online
- [ ] Tournoi online mais prix null/0 : CTA affiché mais tap → erreur 422 "Prix du tournoi invalide"

### Flow Stripe Checkout (happy path)
- [ ] Tap "S'inscrire — 15€" → POST /payments/checkout/create
- [ ] Backend vérifie éligibilité (online + prix > 0 + statut open/full + pas déjà inscrit) → crée Stripe session
- [ ] Réponse backend contient `checkout_url` (https://checkout.stripe.com/c/pay/...)
- [ ] Mobile : `Linking.openURL(checkout_url)` ouvre le navigateur externe vers Stripe
- [ ] Overlay plein écran noir apparaît dans l'app avec spinner + "Vérification du paiement…"
- [ ] Sur Stripe : utiliser carte test `4242 4242 4242 4242` + date future + CVC 3 chiffres
- [ ] Redirection Stripe → success_url contient `?session_id=cs_test_...`
- [ ] Retour dans l'app (manuel) : polling toutes les 2.5s sur GET /payments/checkout/status/{sessionId}
- [ ] Quand Stripe renvoie payment_status=paid → backend :
  - Met status transaction = "paid"
  - Déclenche auto-inscription via TournamentService::registerTeam
  - Dispatch TeamRegistered event → SendEmailJob
- [ ] Mobile : overlay passe en ✅ "Paiement confirmé" + "Inscription en cours..."
- [ ] Alert "Paiement confirmé — Tu es inscrit au tournoi !" + refetch tournament → TournamentDetail reflète `isRegistered=true`
- [ ] Tab Équipes du tournoi montre bien la nouvelle team inscrite

### Flow Stripe Checkout (cas d'erreur)
- [ ] User annule sur la page Stripe → redirection cancel_url avec `?payment=cancelled`
- [ ] Retour app : overlay état ❌ "Paiement annulé — Aucun débit n'a été effectué" + bouton Fermer
- [ ] Carte test déclinée `4000 0000 0000 9995` → status=failed, overlay ❌
- [ ] Tap "Annuler la vérification" → overlay se ferme, user peut retenter
- [ ] Idempotence : 2ème tap "S'inscrire — 15€" → renvoie la même session pending (pas de duplicate)

### Webhook Stripe (backend + Insomnia)
- [ ] POST /webhook/stripe sans signature → 400 "payload invalide" ou "signature invalide"
- [ ] Configuration Stripe Dashboard : endpoint webhook pointe vers `https://{host}/api/v1/webhook/stripe` avec event `checkout.session.completed`
- [ ] Test avec Stripe CLI : `stripe listen --forward-to localhost:8000/api/v1/webhook/stripe` puis `stripe trigger checkout.session.completed`
- [ ] Backend log : "Stripe webhook" reçu, signature OK
- [ ] Transaction passe à paid + auto-inscription (idempotent si déjà traité via polling)

### Resend emails
- [ ] Après inscription tournoi (via paiement Stripe OU inscription directe on_site), le joueur reçoit un email
- [ ] Sender : `noreply@placetopadel.com`
- [ ] ⚠️ Vérifier que le domaine `placetopadel.com` est validé dans Resend dashboard (SPF/DKIM) — sinon bounced
- [ ] Si domaine non validé : email part sur `onboarding@resend.dev` (limité aux emails owner Resend)
- [ ] Tester avec un compte Gmail personnel → check boîte de réception (+ spam) dans les 30s

### Edge cases backend (déjà couverts par 14 tests PHPUnit)
- [ ] Tentative create checkout sur tournoi `on_site` → 422
- [ ] Tentative create checkout sans prix → 422
- [ ] Tentative create checkout si déjà inscrit → 422
- [ ] Tentative create checkout si tournoi `in_progress`/`completed` → 422
- [ ] Sans auth → 401
- [ ] UUID tournament inconnu → 422

---

## Régression globale — tous modules

À exécuter après les tests G7/G8/G9 pour s'assurer qu'aucune feature antérieure n'a régressé post-merges.

### Auth & Navigation
- [ ] Register → réception email bienvenue (si Resend configuré)
- [ ] Login classique → redirect Cockpit
- [ ] Logout → redirect login
- [ ] Tap logo AppHeader (partout) → route `/home`
- [ ] BottomNav 5 onglets opérationnels (Actu / Tournois / **Cockpit** / **Match** / Partenaires)
- [ ] Clubs accessible via Cockpit ActionCard (hors navbar)
- [ ] Back router cohérent dans tous les écrans

### Cockpit
- [ ] Vue joueur vs vue referee selon `user.role`
- [ ] Mode vacances (VacationCard) : activation avec ville → bandeau orange
- [ ] ActionCards : Mes tournois, Propositions partenaires (badge count), Messages, Scanner QR, Mon profil, Se déconnecter
- [ ] Bloc "Je suis seul (N)" s'il y a des seekings actifs

### Profile
- [ ] Header compact (photo + nom + badges + club + ville)
- [ ] Stats 4 colonnes (Points FFT, Rang, Niveau, Position)
- [ ] Switcher Infos / Matchs fonctionnel
- [ ] Tab Infos : bio, niveaux préférés, disponibilités
- [ ] Tab Matchs : EloCard + historique
- [ ] Bouton édition (soi-même uniquement) : modal bio/ville
- [ ] Autre profil : bouton édition masqué

### Tournois
- [ ] Liste tournois : filtres ville + rayon + niveau, infinite scroll, pull-to-refresh
- [ ] Détail tournoi : tabs conditionnels selon status (Infos/Équipes/Seeking si open/full, Matches/Poules/Classement si in_progress/completed)
- [ ] Inscription directe si `payment_method=on_site`
- [ ] Inscription Stripe si `payment_method=online` (G9)
- [ ] Bouton QR code en haut-droite visible si share_link présent (G4)
- [ ] Bouton "Lancer le tournoi" visible si organizer + status open/full + ≥2 équipes (Bonus)
- [ ] Tab Seeking : bouton "Je suis seul" avec modal message (G2)

### Score live (G1) — non régressé
- [ ] Score +/- fonctionne, tie-break, double validation, ranking live, pools

### Matchs amicaux (G7) — non régressé
- [ ] Tab Match : ELO card + création match → live + ELO applied post-match
- [ ] Onglet Matchs dans profil

### Game proposals (G8)
- [ ] Section "Parties planifiées" dans tab Match si des proposals existent
- [ ] Flow accept/refuse/start fonctionnel

### Feed (6.1.5)
- [ ] Onglet Actu : filtres sticky (Tout / Mes tournois / Mes partenaires / Mes clubs)
- [ ] Posts : image 4/5, like optimiste, commentaires bottom-sheet
- [ ] Pull-to-refresh, infinite scroll

### Clubs (6.1.6)
- [ ] Accessible via Cockpit ActionCard → `/clubs`
- [ ] Recherche debounce 300ms
- [ ] Bloc "Mes abonnements" en tête si user loggé et abonnements > 0
- [ ] Détail club : toggle abonner/désabonner + liens tel/mail/web

### Partenaires (6.1.5 G7)
- [ ] Mode "Tournoi" fonctionnel : sélecteur tournoi + liste cards compat
- [ ] Modes "Match amical" et "Rencontre" → ComingSoonSheet affiché

### Chat (G3)
- [ ] Icône Messages AppHeader → liste conversations
- [ ] Détail conversation : bulles + composer + polling 10s
- [ ] Conversation créée automatiquement après accept proposal G2

### QR (G4)
- [ ] Scanner depuis Cockpit ActionCard : permission caméra OK
- [ ] Scan QR tournoi → redirect détail tournoi
- [ ] Affichage QR depuis détail tournoi → bottom-sheet + partage natif

### Backend
- [ ] `php artisan test` : **309 tests verts** (1108 assertions)
- [ ] `php artisan route:list` : toutes les routes listées sans warning
- [ ] `php artisan horizon:status` : worker actif si Redis démarré
- [ ] Queues : `php artisan queue:listen` traite les jobs sans erreur (emails, FanoutNotification, etc.)

### Mobile
- [ ] `npx tsc --noEmit` : clean
- [ ] Build dev : `npx expo start --clear` → ouverture sur émulateur sans crash
- [ ] Pas d'erreur console au chargement de chaque tab
- [ ] Pas de warning Reanimated/NativeWind bloquant

---

## Checklist avant mise en prod

- [ ] Backend 309 tests verts
- [ ] Mobile TSC clean
- [ ] `.env` prod renseigné (Stripe live keys, Resend domaine vérifié, S3 creds, VAPID ou Expo Push)
- [ ] Webhook Stripe configuré dans dashboard pour `{prod_url}/api/v1/webhook/stripe`
- [ ] DNS placetopadel.com : SPF/DKIM Resend validés
- [ ] Tests émulateur validés sur Android ET iOS
- [ ] TESTS.md : toutes les cases cochées sur un run complet
- [ ] Migrations prod exécutées (`php artisan migrate --force`)
- [ ] Horizon + queue workers lancés sur le serveur
