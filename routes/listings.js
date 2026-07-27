// Tout ce qui concerne les annonces : publier, lister, consulter le détail.
const express = require("express");
const db = require("../db");

const router = express.Router();

// GET /api/listings — toutes les annonces, les plus récentes en premier
// Accepte deux paramètres optionnels dans l'URL :
//   ?category=livres        -> ne garde que cette catégorie
//   ?search=calculatrice     -> ne garde que les titres qui contiennent ce mot
router.get("/listings", (req, res) => {
  var category = req.query.category;
  var search = req.query.search;

  var sql = `
    SELECT listings.*, users.username AS seller_name, users.certified AS seller_certified
    FROM listings
    JOIN users ON users.id = listings.seller_id
    WHERE 1 = 1
  `;
  var params = [];

  if (category) {
    sql += " AND listings.category = ?";
    params.push(category);
  }
  if (search) {
    sql += " AND listings.title LIKE ?";
    params.push("%" + search + "%");
  }

  sql += " ORDER BY listings.created_at DESC";

  const rows = db.prepare(sql).all(params);
  const listings = rows.map(formatListing);
  res.json({ success: true, listings });
});

// GET /api/listings/:id?viewerId=...  — le détail d'une seule annonce
router.get("/listings/:id", (req, res) => {
  const row = db.prepare(`
    SELECT listings.*, users.username AS seller_name, users.certified AS seller_certified,
           users.phone AS seller_phone
    FROM listings
    JOIN users ON users.id = listings.seller_id
    WHERE listings.id = ?
  `).get(req.params.id);

  if (!row) {
    return res.status(404).json({ success: false, message: "Annonce introuvable." });
  }

  const listing = formatListing(row);
  listing.sellerPhone = row.seller_phone;
  listing.likesCount = db.prepare("SELECT COUNT(*) AS c FROM likes WHERE listing_id = ?").get(row.id).c;
  if (req.query.viewerId) {
    listing.isLiked = !!db.prepare("SELECT id FROM likes WHERE listing_id = ? AND user_id = ?")
      .get(row.id, req.query.viewerId);
  }

  res.json({ success: true, listing });
});

// POST /api/listings — publier une nouvelle annonce
router.post("/listings", (req, res) => {
  const { sellerId, title, description, category, condition, price, negotiable, photos } = req.body;

  if (!sellerId || !title || !category || !condition || !price) {
    return res.status(422).json({ success: false, message: "Merci de remplir tous les champs obligatoires." });
  }

  const info = db.prepare(`
    INSERT INTO listings (seller_id, title, description, category, condition, price, negotiable, photos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sellerId, title, description || "", category, condition, price,
    negotiable ? 1 : 0,
    JSON.stringify(photos || []) // les photos (base64) sont stockées sous forme de texte JSON
  );

  res.json({ success: true, message: "Annonce publiée.", listingId: info.lastInsertRowid });
});

// Convertit une ligne brute de la base en objet propre pour le frontend
function formatListing(row) {
  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    price: row.price,
    negotiable: !!row.negotiable,
    photos: JSON.parse(row.photos || "[]"),
    sellerName: row.seller_name,
    certified: !!row.seller_certified,
    createdAt: row.created_at
  };
}

module.exports = router;
