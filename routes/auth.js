// Tout ce qui concerne les comptes : inscription et connexion.
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");

const router = express.Router();

// POST /api/register — création de compte
router.post("/register", (req, res) => {
  const { username, phone, email, password, faculty, major, avatar } = req.body;

  if (!username || !phone || !email || !password) {
    return res.status(422).json({ success: false, message: "Merci de remplir tous les champs obligatoires." });
  }
  if (password.length < 8) {
    return res.status(422).json({ success: false, message: "Le mot de passe doit contenir au moins 8 caractères." });
  }

  // On vérifie qu'aucun compte n'existe déjà avec cet email ou ce pseudo
  const existing = db.prepare("SELECT id FROM users WHERE email = ? OR username = ?").get(email, username);
  if (existing) {
    return res.status(409).json({ success: false, message: "Un compte existe déjà avec cet email ou ce pseudo." });
  }

  // Le mot de passe n'est JAMAIS stocké en clair : bcrypt le transforme en une empreinte
  // irréversible ("hash"). Même nous, on ne peut pas retrouver le mot de passe original.
  const passwordHash = bcrypt.hashSync(password, 10);

  const info = db.prepare(`
    INSERT INTO users (username, phone, email, password_hash, faculty, major, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(username, phone, email, passwordHash, faculty || null, major || null, avatar || null);

  res.json({
    success: true,
    message: "Compte créé avec succès.",
    user: { id: info.lastInsertRowid, username, faculty, major, avatar, certified: false }
  });
});

// POST /api/login — connexion
router.post("/login", (req, res) => {
  const { identifier, password } = req.body; // identifier = email OU pseudo

  if (!identifier || !password) {
    return res.status(422).json({ success: false, message: "Merci de remplir tous les champs." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ? OR username = ?").get(identifier, identifier);

  // On vérifie le mot de passe avec bcrypt.compareSync, qui recalcule le hash du mot de passe
  // tapé et le compare à celui stocké — sans jamais avoir besoin de "déchiffrer" quoi que ce soit.
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: "Identifiants incorrects." });
  }

  res.json({
    success: true,
    message: "Connexion réussie.",
    user: {
      id: user.id, username: user.username, faculty: user.faculty,
      major: user.major, avatar: user.avatar, certified: !!user.certified
    }
  });
});

// PUT /api/users/:id/profile — modifier pseudo / faculté / filière / photo
router.put("/users/:id/profile", (req, res) => {
  const userId = req.params.id;
  const { username, faculty, major, avatar } = req.body;

  if (!username || !username.trim()) {
    return res.status(422).json({ success: false, message: "Le pseudo ne peut pas être vide." });
  }

  // On vérifie que ce pseudo n'est pas déjà pris par QUELQU'UN D'AUTRE
  const clash = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(username.trim(), userId);
  if (clash) {
    return res.status(409).json({ success: false, message: "Ce pseudo est déjà utilisé par un autre compte." });
  }

  db.prepare(`
    UPDATE users SET username = ?, faculty = ?, major = ?, avatar = ?
    WHERE id = ?
  `).run(username.trim(), faculty || null, major || null, avatar || null, userId);

  const updated = db.prepare("SELECT id, username, faculty, major, avatar, certified FROM users WHERE id = ?").get(userId);
  res.json({
    success: true,
    message: "Profil mis à jour.",
    user: { ...updated, certified: !!updated.certified }
  });
});

// POST /api/users/:id/password — changer de mot de passe (demande l'ancien, par sécurité)
router.post("/users/:id/password", (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(422).json({ success: false, message: "Merci de remplir les deux champs." });
  }
  if (newPassword.length < 8) {
    return res.status(422).json({ success: false, message: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ success: false, message: "Mot de passe actuel incorrect." });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, userId);

  res.json({ success: true, message: "Mot de passe mis à jour." });
});

module.exports = router;
