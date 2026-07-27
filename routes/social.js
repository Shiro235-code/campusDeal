// Tout ce qui touche aux interactions sociales : j'aime, abonnements, commentaires,
// et la consultation du profil PUBLIC d'un vendeur (différent de son propre profil).
const express = require("express");
const db = require("../db");

const router = express.Router();

/* ---------------- LIKES ---------------- */
// POST /api/listings/:id/like  { userId }  -> ajoute/retire le like, retourne le nouveau total
router.post("/listings/:id/like", (req, res) => {
  const listingId = req.params.id;
  const userId = req.body.userId;
  if (!userId) return res.status(422).json({ success: false, message: "Connecte-toi pour aimer un article." });

  const existing = db.prepare("SELECT id FROM likes WHERE listing_id = ? AND user_id = ?").get(listingId, userId);
  if (existing) {
    db.prepare("DELETE FROM likes WHERE id = ?").run(existing.id);
  } else {
    db.prepare("INSERT INTO likes (listing_id, user_id) VALUES (?, ?)").run(listingId, userId);
  }
  const count = db.prepare("SELECT COUNT(*) AS c FROM likes WHERE listing_id = ?").get(listingId).c;
  res.json({ success: true, liked: !existing, likesCount: count });
});

/* ---------------- ABONNEMENTS ---------------- */
// POST /api/users/:id/follow  { followerId }  -> s'abonner/se désabonner d'un vendeur
router.post("/users/:id/follow", (req, res) => {
  const sellerId = req.params.id;
  const followerId = req.body.followerId;
  if (!followerId) return res.status(422).json({ success: false, message: "Connecte-toi pour t'abonner." });
  if (String(followerId) === String(sellerId)) {
    return res.status(422).json({ success: false, message: "Tu ne peux pas t'abonner à toi-même." });
  }

  const existing = db.prepare("SELECT id FROM follows WHERE follower_id = ? AND seller_id = ?").get(followerId, sellerId);
  if (existing) {
    db.prepare("DELETE FROM follows WHERE id = ?").run(existing.id);
  } else {
    db.prepare("INSERT INTO follows (follower_id, seller_id) VALUES (?, ?)").run(followerId, sellerId);
  }
  const count = db.prepare("SELECT COUNT(*) AS c FROM follows WHERE seller_id = ?").get(sellerId).c;
  res.json({ success: true, following: !existing, followersCount: count });
});

/* ---------------- PROFIL PUBLIC D'UN VENDEUR ---------------- */
// GET /api/users/:id?viewerId=...  -> infos publiques + ses annonces + ses commentaires
router.get("/users/:id", (req, res) => {
  const user = db.prepare("SELECT id, username, faculty, major, avatar, certified FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });

  const followersCount = db.prepare("SELECT COUNT(*) AS c FROM follows WHERE seller_id = ?").get(user.id).c;

  let isFollowing = false;
  if (req.query.viewerId) {
    isFollowing = !!db.prepare("SELECT id FROM follows WHERE follower_id = ? AND seller_id = ?")
      .get(req.query.viewerId, user.id);
  }

  const listings = db.prepare("SELECT * FROM listings WHERE seller_id = ? ORDER BY created_at DESC").all(user.id)
    .map(function (row) {
      return {
        id: row.id, title: row.title, price: row.price, negotiable: !!row.negotiable,
        category: row.category, photos: JSON.parse(row.photos || "[]")
      };
    });

  const comments = db.prepare(`
    SELECT comments.*, users.username AS author_name
    FROM comments JOIN users ON users.id = comments.author_id
    WHERE comments.seller_id = ?
    ORDER BY comments.created_at DESC
  `).all(user.id).map(function (c) {
    return { id: c.id, body: c.body, authorName: c.author_name, createdAt: c.created_at };
  });

  res.json({
    success: true,
    user: {
      id: user.id, username: user.username, faculty: user.faculty, major: user.major,
      avatar: user.avatar, certified: !!user.certified,
      followersCount: followersCount, isFollowing: isFollowing
    },
    listings: listings,
    comments: comments
  });
});

/* ---------------- COMMENTAIRES SUR UN VENDEUR ---------------- */
// POST /api/users/:id/comments  { authorId, body }
router.post("/users/:id/comments", (req, res) => {
  const sellerId = req.params.id;
  const authorId = req.body.authorId;
  const body = (req.body.body || "").trim();

  if (!authorId) return res.status(422).json({ success: false, message: "Connecte-toi pour laisser un commentaire." });
  if (!body) return res.status(422).json({ success: false, message: "Le commentaire ne peut pas être vide." });

  db.prepare("INSERT INTO comments (seller_id, author_id, body) VALUES (?, ?, ?)").run(sellerId, authorId, body);
  res.json({ success: true, message: "Commentaire ajouté." });
});

module.exports = router;
