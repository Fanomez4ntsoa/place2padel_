# BACKLOG — Place2Padel

Items différés à traiter après les phases en cours. Format : priorité, contexte, proposition, dépendances.

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
- Configurer le scheme `placetopadel://` dans Expo (déjà en place — cf. `app.json:scheme=place2padel`, à renommer en `placetopadel`)
- Tester les universal links iOS + App Links Android

**Dépendances**
- Décision : court terme endpoint Laravel simple OU attendre la Phase 7 Next.js
- Configuration du domaine de prod (pointer `success_url` vers la vraie URL)

**Priorité** 🟡 Important — impacte l'UX du flow paiement mais contournable (polling manuel fonctionne)

**Statut** À prioriser avant mise en prod Stripe
