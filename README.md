# Backend CampusDeal

## Installation (une seule fois)
Il te faut Node.js installé sur ta machine (celui que tu as déjà pour Flutter/npm).

```bash
cd campusdeal-server
npm install
```

## Lancer le serveur
```bash
npm start
```
Tu devrais voir : `✅ Serveur CampusDeal lancé sur http://localhost:3000`

Le fichier `campusdeal.db` se crée automatiquement au premier lancement — c'est ta base de données, un simple fichier sur ton disque.

## Tester que ça marche
Ouvre `http://localhost:3000/api/health` dans ton navigateur — tu dois voir un message de succès en JSON.

## Routes disponibles
- `POST /api/register` — créer un compte
- `POST /api/login` — se connecter
- `GET /api/listings` — toutes les annonces
- `GET /api/listings/:id` — une annonce précise
- `POST /api/listings` — publier une annonce

## Prochaine étape
Le frontend (`register.js`, `login.js`, `sell.js`, `listing.js`) utilise encore `localStorage`
au lieu d'appeler ce serveur. La prochaine étape sera de remplacer ces appels par de vraies
requêtes `fetch()` vers `http://localhost:3000/api/...`.
