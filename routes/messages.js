// La messagerie entre acheteurs et vendeurs.
const express = require("express");
const db = require("../db");

const router = express.Router();

// GET /api/conversations?userId=...
// Liste toutes les personnes avec qui l'utilisateur a déjà échangé, avec le dernier message.
router.get("/conversations", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(422).json({ success: false, message: "userId manquant." });

  const rows = db.prepare(`
    SELECT DISTINCT
      CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id
    FROM messages
    WHERE sender_id = ? OR receiver_id = ?
  `).all(userId, userId, userId);

  const conversations = rows.map(function (r) {
    const other = db.prepare("SELECT id, username, avatar FROM users WHERE id = ?").get(r.other_id);
    const lastMsg = db.prepare(`
      SELECT body, created_at FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY id DESC LIMIT 1
    `).get(userId, r.other_id, r.other_id, userId);
    return {
      user: other,
      lastMessage: lastMsg ? lastMsg.body : "",
      lastAt: lastMsg ? lastMsg.created_at : ""
    };
  }).sort(function (a, b) { return a.lastAt < b.lastAt ? 1 : -1; });

  res.json({ success: true, conversations: conversations });
});

// GET /api/messages/:otherId?userId=...
// Le fil de discussion complet entre userId et otherId.
router.get("/messages/:otherId", (req, res) => {
  const userId = req.query.userId;
  const otherId = req.params.otherId;
  if (!userId) return res.status(422).json({ success: false, message: "userId manquant." });

  const rows = db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY id ASC
  `).all(userId, otherId, otherId, userId);

  const otherUser = db.prepare("SELECT id, username, avatar FROM users WHERE id = ?").get(otherId);
  if (!otherUser) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });

  res.json({
    success: true,
    otherUser: otherUser,
    messages: rows.map(function (m) {
      return { id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at };
    })
  });
});

// POST /api/messages  { senderId, receiverId, body }
router.post("/messages", (req, res) => {
  const senderId = req.body.senderId;
  const receiverId = req.body.receiverId;
  const body = (req.body.body || "").trim();

  if (!senderId || !receiverId || !body) {
    return res.status(422).json({ success: false, message: "Message vide." });
  }

  db.prepare("INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)").run(senderId, receiverId, body);
  res.json({ success: true });
});

module.exports = router;
