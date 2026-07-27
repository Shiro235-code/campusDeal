// Point d'entrée du serveur : c'est ce fichier qu'on lance avec "node server.js".
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const listingsRoutes = require("./routes/listings");
const socialRoutes = require("./routes/social");
const messagesRoutes = require("./routes/messages");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Sert le site (index.html, categories.html, css/, js/, images/...) directement
// depuis ce serveur. Comme ça, tout tourne sur une seule adresse
// (http://localhost:3000), et localStorage fonctionne normalement entre les pages
// — contrairement à l'ouverture des fichiers en double-clic (file://).
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", authRoutes);
app.use("/api", listingsRoutes);
app.use("/api", socialRoutes);
app.use("/api", messagesRoutes);

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Le serveur CampusDeal fonctionne." });
});

app.listen(PORT, () => {
  console.log(`✅ Serveur CampusDeal lancé sur http://localhost:${PORT}`);
});
