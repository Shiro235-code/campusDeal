// Tout ce qui concerne les annonces : publier, lister, consulter le détail,
// gérer le stock, et le processus d'achat (réservation + validation vendeur).
const express = require("express");
const db = require("../db");

const router = express.Router();

// GET /api/listings — annonces ACTIVES uniquement (les épuisées/archivées sont cachées)
// Paramètres optionnels dans l'URL :
//   ?category=livres     ?search=mot   ?condition=bon   ?minPrice=  ?maxPrice=
//   ?sellerId=5           -> seulement les annonces de ce vendeur
//   ?includeSoldOut=true  -> inclut aussi les annonces épuisées/archivées (pour "Mes annonces")
router.get("/listings", (req, res) => {
  var category = req.query.category;
  var search = req.query.search;
  var condition = req.query.condition;
  var minPrice = req.query.minPrice;
  var maxPrice = req.query.maxPrice;
  var sellerId = req.query.sellerId;
  var includeSoldOut = req.query.includeSoldOut === "true";

  var sql = `
    SELECT listings.*, users.username AS seller_name, users.certified AS seller_certified
    FROM listings
    JOIN users ON users.id = listings.seller_id
    WHERE 1 = 1
  `;
  var params = [];

  if (!includeSoldOut) {
    sql += " AND listings.status = 'active'";
  } else {
    sql += " AND listings.status != 'archived'"; // même en mode "tout voir", on cache le définitivement terminé
  }
  if (sellerId) {
    sql += " AND listings.seller_id = ?";
    params.push(sellerId);
  }
  if (category) {
    sql += " AND listings.category = ?";
    params.push(category);
  }
  if (search) {
    sql += " AND listings.title LIKE ?";
    params.push("%" + search + "%");
  }
  if (condition) {
    sql += " AND listings.condition = ?";
    params.push(condition);
  }
  if (minPrice) {
    sql += " AND listings.price >= ?";
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    sql += " AND listings.price <= ?";
    params.push(Number(maxPrice));
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

    // Si l'utilisateur qui regarde a déjà une demande d'achat en attente sur cette annonce
    listing.myPendingOrder = !!db.prepare(
      "SELECT id FROM orders WHERE listing_id = ? AND buyer_id = ? AND status = 'pending'"
    ).get(row.id, req.query.viewerId);
  }

  res.json({ success: true, listing });
});

// POST /api/listings — publier une nouvelle annonce
router.post("/listings", (req, res) => {
  const { sellerId, title, description, category, condition, price, negotiable, photos, stockTotal } = req.body;

  if (!sellerId || !title || !category || !condition || !price) {
    return res.status(422).json({ success: false, message: "Merci de remplir tous les champs obligatoires." });
  }

  const info = db.prepare(`
    INSERT INTO listings (seller_id, title, description, category, condition, price, negotiable, photos, stock_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sellerId, title, description || "", category, condition, price,
    negotiable ? 1 : 0,
    JSON.stringify(photos || []),
    Math.max(1, Number(stockTotal) || 1)
  );

  res.json({ success: true, message: "Annonce publiée.", listingId: info.lastInsertRowid });
});

// PUT /api/listings/:id — modifier une annonce existante (seul le vendeur peut le faire)
router.put("/listings/:id", (req, res) => {
  const listingId = req.params.id;
  const { sellerId, title, description, category, condition, price, negotiable, photos, stockTotal } = req.body;

  const existing = db.prepare("SELECT * FROM listings WHERE id = ?").get(listingId);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Annonce introuvable." });
  }
  if (!sellerId || String(existing.seller_id) !== String(sellerId)) {
    return res.status(403).json({ success: false, message: "Tu ne peux modifier que tes propres annonces." });
  }
  if (!title || !category || !condition || !price) {
    return res.status(422).json({ success: false, message: "Merci de remplir tous les champs obligatoires." });
  }

  var newStockTotal = Math.max(existing.stock_sold, Number(stockTotal) || existing.stock_total);

  db.prepare(`
    UPDATE listings
    SET title = ?, description = ?, category = ?, condition = ?, price = ?, negotiable = ?, photos = ?, stock_total = ?
    WHERE id = ?
  `).run(
    title, description || "", category, condition, price,
    negotiable ? 1 : 0,
    JSON.stringify(photos || []),
    newStockTotal,
    listingId
  );

  res.json({ success: true, message: "Annonce mise à jour." });
});

// DELETE /api/listings/:id  { sellerId }  — supprimer une annonce (seul le vendeur peut le faire)
router.delete("/listings/:id", (req, res) => {
  const listingId = req.params.id;
  const sellerId = req.body.sellerId;

  const existing = db.prepare("SELECT * FROM listings WHERE id = ?").get(listingId);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Annonce introuvable." });
  }
  if (!sellerId || String(existing.seller_id) !== String(sellerId)) {
    return res.status(403).json({ success: false, message: "Tu ne peux supprimer que tes propres annonces." });
  }

  db.prepare("DELETE FROM likes WHERE listing_id = ?").run(listingId);
  db.prepare("DELETE FROM orders WHERE listing_id = ?").run(listingId);
  db.prepare("DELETE FROM listings WHERE id = ?").run(listingId);

  res.json({ success: true, message: "Annonce supprimée." });
});

/* ---------------- ACHAT : réservation puis validation par le vendeur ---------------- */

// POST /api/listings/:id/orders  { buyerId }  — l'acheteur clique "Acheter"
router.post("/listings/:id/orders", (req, res) => {
  const listingId = req.params.id;
  const buyerId = req.body.buyerId;

  const listing = db.prepare("SELECT * FROM listings WHERE id = ?").get(listingId);
  if (!listing) return res.status(404).json({ success: false, message: "Annonce introuvable." });
  if (!buyerId) return res.status(422).json({ success: false, message: "Connecte-toi pour acheter." });
  if (String(listing.seller_id) === String(buyerId)) {
    return res.status(422).json({ success: false, message: "Tu ne peux pas acheter ta propre annonce." });
  }
  if (listing.status !== "active" || listing.stock_sold >= listing.stock_total) {
    return res.status(409).json({ success: false, message: "Cet article n'est plus disponible." });
  }

  const already = db.prepare(
    "SELECT id FROM orders WHERE listing_id = ? AND buyer_id = ? AND status = 'pending'"
  ).get(listingId, buyerId);
  if (already) {
    return res.status(409).json({ success: false, message: "Tu as déjà une demande en attente pour cet article." });
  }

  const info = db.prepare(
    "INSERT INTO orders (listing_id, buyer_id, seller_id) VALUES (?, ?, ?)"
  ).run(listingId, buyerId, listing.seller_id);

  res.json({ success: true, message: "Demande d'achat envoyée au vendeur.", orderId: info.lastInsertRowid });
});

// GET /api/sellers/:id/orders?status=pending — les demandes reçues par un vendeur
router.get("/sellers/:id/orders", (req, res) => {
  const status = req.query.status || "pending";
  const rows = db.prepare(`
    SELECT orders.*, listings.title AS listing_title, listings.price AS listing_price,
           users.username AS buyer_name
    FROM orders
    JOIN listings ON listings.id = orders.listing_id
    JOIN users ON users.id = orders.buyer_id
    WHERE orders.seller_id = ? AND orders.status = ?
    ORDER BY orders.created_at ASC
  `).all(req.params.id, status);

  res.json({ success: true, orders: rows });
});

// POST /api/orders/:id/confirm  { sellerId }  — le vendeur valide que la vente a bien eu lieu
router.post("/orders/:id/confirm", (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Demande introuvable." });
  if (!req.body.sellerId || String(order.seller_id) !== String(req.body.sellerId)) {
    return res.status(403).json({ success: false, message: "Tu ne peux valider que tes propres ventes." });
  }
  if (order.status !== "pending") {
    return res.status(409).json({ success: false, message: "Cette demande a déjà été traitée." });
  }

  db.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);

  const listing = db.prepare("SELECT * FROM listings WHERE id = ?").get(order.listing_id);
  const newSold = listing.stock_sold + 1;
  const newStatus = newSold >= listing.stock_total ? "sold_out" : "active";
  db.prepare("UPDATE listings SET stock_sold = ?, status = ? WHERE id = ?").run(newSold, newStatus, listing.id);

  // Les autres demandes en attente sur cet article, si le stock est épuisé, sont annulées
  if (newStatus === "sold_out") {
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE listing_id = ? AND status = 'pending'").run(listing.id);
  }

  res.json({ success: true, message: "Vente validée.", listingStatus: newStatus, stockSold: newSold, stockTotal: listing.stock_total });
});

// POST /api/orders/:id/cancel  { sellerId }  — le vendeur refuse/annule une demande
router.post("/orders/:id/cancel", (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Demande introuvable." });
  if (!req.body.sellerId || String(order.seller_id) !== String(req.body.sellerId)) {
    return res.status(403).json({ success: false, message: "Action non autorisée." });
  }
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(order.id);
  res.json({ success: true, message: "Demande annulée." });
});

/* ---------------- RENOUVELER OU ARCHIVER UNE ANNONCE ÉPUISÉE ---------------- */

// POST /api/listings/:id/renew  { sellerId, addStock }  — remettre en vente
router.post("/listings/:id/renew", (req, res) => {
  const listing = db.prepare("SELECT * FROM listings WHERE id = ?").get(req.params.id);
  if (!listing) return res.status(404).json({ success: false, message: "Annonce introuvable." });
  if (!req.body.sellerId || String(listing.seller_id) !== String(req.body.sellerId)) {
    return res.status(403).json({ success: false, message: "Action non autorisée." });
  }

  const addStock = Math.max(1, Number(req.body.addStock) || 1);
  const newTotal = listing.stock_sold + addStock; // le total redevient "sold + ce qu'on rajoute"

  db.prepare("UPDATE listings SET stock_total = ?, status = 'active' WHERE id = ?").run(newTotal, listing.id);
  res.json({ success: true, message: "Annonce remise en vente." });
});

// POST /api/listings/:id/archive  { sellerId }  — "le stock est vraiment fini", termine l'annonce
router.post("/listings/:id/archive", (req, res) => {
  const listing = db.prepare("SELECT * FROM listings WHERE id = ?").get(req.params.id);
  if (!listing) return res.status(404).json({ success: false, message: "Annonce introuvable." });
  if (!req.body.sellerId || String(listing.seller_id) !== String(req.body.sellerId)) {
    return res.status(403).json({ success: false, message: "Action non autorisée." });
  }

  db.prepare("UPDATE listings SET status = 'archived' WHERE id = ?").run(listing.id);
  res.json({ success: true, message: "Annonce terminée." });
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
    createdAt: row.created_at,
    stockTotal: row.stock_total,
    stockSold: row.stock_sold,
    stockAvailable: row.stock_total - row.stock_sold,
    status: row.status
  };
}

module.exports = router;
