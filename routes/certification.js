// La certification étudiante : l'utilisateur envoie une preuve (email universitaire
// ou photo de carte d'étudiant), un administrateur la valide ou la refuse.
const express = require("express");
const db = require("../db");

const router = express.Router();

// Clé simple pour protéger les routes d'administration (voir server.js).
// Pour un vrai projet en production, ceci devrait être un vrai système de comptes
// admin avec mot de passe propre — ici, une clé partagée suffit pour apprendre.
const ADMIN_KEY = process.env.CAMPUSDEAL_ADMIN_KEY || "campusdeal-admin-2026";

function requireAdmin(req, res, next) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({ success: false, message: "Accès administrateur refusé." });
  }
  next();
}

/* ---------------- CÔTÉ ÉTUDIANT ---------------- */

// GET /api/users/:id/certification — statut de la dernière demande de cet utilisateur
router.get("/users/:id/certification", (req, res) => {
  const request = db.prepare(`
    SELECT * FROM certification_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1
  `).get(req.params.id);

  res.json({ success: true, request: request || null });
});

// POST /api/users/:id/certification — envoyer une nouvelle demande
router.post("/users/:id/certification", (req, res) => {
  const userId = req.params.id;
  const { proofType, proofEmail, proofImage } = req.body;

  if (proofType !== "email" && proofType !== "id_card") {
    return res.status(422).json({ success: false, message: "Type de preuve invalide." });
  }
  if (proofType === "email" && (!proofEmail || !proofEmail.trim())) {
    return res.status(422).json({ success: false, message: "Merci de renseigner ton email universitaire." });
  }
  if (proofType === "id_card" && !proofImage) {
    return res.status(422).json({ success: false, message: "Merci d'ajouter une photo de ta carte d'étudiant." });
  }

  db.prepare(`
    INSERT INTO certification_requests (user_id, proof_type, proof_email, proof_image, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(userId, proofType, proofEmail || null, proofImage || null);

  res.json({ success: true, message: "Demande envoyée, en attente de vérification." });
});

/* ---------------- CÔTÉ ADMINISTRATEUR ---------------- */

// GET /api/admin/certifications?status=pending — liste des demandes (protégé)
router.get("/admin/certifications", requireAdmin, (req, res) => {
  const status = req.query.status || "pending";
  const rows = db.prepare(`
    SELECT certification_requests.*, users.username, users.email
    FROM certification_requests
    JOIN users ON users.id = certification_requests.user_id
    WHERE certification_requests.status = ?
    ORDER BY certification_requests.id ASC
  `).all(status);

  res.json({ success: true, requests: rows });
});

// POST /api/admin/certifications/:id/approve — valider une demande (protégé)
router.post("/admin/certifications/:id/approve", requireAdmin, (req, res) => {
  const request = db.prepare("SELECT * FROM certification_requests WHERE id = ?").get(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: "Demande introuvable." });

  db.prepare("UPDATE certification_requests SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(request.id);
  db.prepare("UPDATE users SET certified = 1 WHERE id = ?").run(request.user_id);

  res.json({ success: true, message: "Étudiant certifié." });
});

// POST /api/admin/certifications/:id/reject — refuser une demande (protégé)
router.post("/admin/certifications/:id/reject", requireAdmin, (req, res) => {
  const request = db.prepare("SELECT * FROM certification_requests WHERE id = ?").get(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: "Demande introuvable." });

  db.prepare("UPDATE certification_requests SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(request.id);

  res.json({ success: true, message: "Demande refusée." });
});

module.exports = router;
