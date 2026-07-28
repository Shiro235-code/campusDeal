// Ce fichier gère la connexion à la base de données SQLite.
// SQLite stocke tout dans un simple fichier (campusdeal.db) — pas besoin
// d'installer un serveur de base de données séparé, contrairement à MySQL.
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "campusdeal.db"));

// "IF NOT EXISTS" : ces commandes ne recréent pas les tables si elles existent déjà,
// donc on peut relancer le serveur sans effacer les données à chaque fois.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    phone         TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    faculty       TEXT,
    major         TEXT,
    avatar        TEXT,
    certified     INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS listings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id   INTEGER NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    category    TEXT NOT NULL,
    condition   TEXT NOT NULL,
    price       INTEGER NOT NULL,
    negotiable  INTEGER NOT NULL DEFAULT 0,
    photos      TEXT,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(listing_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id INTEGER NOT NULL,
    seller_id   INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, seller_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id   INTEGER NOT NULL,
    author_id   INTEGER NOT NULL,
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id   INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS certification_requests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    proof_type    TEXT NOT NULL,        -- 'email' ou 'id_card'
    proof_email   TEXT,
    proof_image   TEXT,
    status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at   TEXT
  );
`);

// Petites migrations pour ajouter de nouvelles colonnes SANS effacer les données
// déjà présentes dans ta base — utile puisque le projet évolue au fil du temps.
function safeAddColumn(table, columnDef) {
  try {
    db.exec("ALTER TABLE " + table + " ADD COLUMN " + columnDef);
  } catch (e) {
    // La colonne existe déjà : rien à faire, ce n'est pas une vraie erreur.
  }
}
safeAddColumn("messages", "type TEXT NOT NULL DEFAULT 'text'");   // 'text' | 'image' | 'audio'
safeAddColumn("messages", "attachment TEXT");                      // image/audio en base64
safeAddColumn("messages", "delivered_at TEXT");                    // quand le destinataire a rafraîchi sa liste
safeAddColumn("messages", "read_at TEXT");                         // quand le destinataire a ouvert la conversation

module.exports = db;
