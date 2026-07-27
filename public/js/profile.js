(function () {
  "use strict";

  var header = document.getElementById("profile-header");
  var profileEmptyMsg = document.getElementById("profile-empty");

  var session = null;
  try { session = JSON.parse(window.localStorage.getItem("campusdeal-session") || "null"); } catch (e) { session = null; }

  if (!session) {
    header.hidden = true;
    profileEmptyMsg.hidden = false;
    document.getElementById("my-listings-grid").hidden = true;
    document.getElementById("listings-empty").hidden = true;
    return; // pas connecté : inutile d'aller chercher des annonces
  }

  document.getElementById("profile-username").textContent = session.username || "Étudiant";
  document.getElementById("profile-meta").textContent =
    (session.major || "Filière non renseignée") + " · " + (session.faculty || "Faculté non renseignée");

  if (session.avatar) {
    var img = document.getElementById("profile-avatar-img");
    img.src = session.avatar;
    img.hidden = false;
    document.getElementById("profile-avatar-fallback").hidden = true;
  } else {
    document.getElementById("profile-avatar-fallback").textContent = (session.username || "?").charAt(0).toUpperCase();
  }

  /* ---- Annonces : on récupère toutes les annonces du serveur, puis on garde
     seulement celles publiées par l'utilisateur connecté ---- */
  var CATEGORY_LABELS = {
    livres: "Livres & cours", electronique: "Électronique", vetements: "Vêtements",
    mobilier: "Mobilier & déco", fournitures: "Fournitures", divers: "Divers"
  };

  var grid = document.getElementById("my-listings-grid");
  var listingsEmptyMsg = document.getElementById("listings-empty");

  fetch(API_BASE + "/listings")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var mine = (data.listings || []).filter(function (l) { return l.sellerName === session.username; });

      if (mine.length === 0) {
        listingsEmptyMsg.hidden = false;
        grid.hidden = true;
        return;
      }

      listingsEmptyMsg.hidden = true;
      grid.hidden = false;

      mine.forEach(function (item) {
        var card = document.createElement("article");
        card.className = "listing-card";
        var imageHtml = item.photos && item.photos.length
          ? '<img src="' + item.photos[0] + '" alt="" style="width:100%;height:100%;object-fit:cover;">'
          : "🛍️";
        var priceLabel = Number(item.price).toLocaleString("fr-FR") + " FCFA";
        var badgeLabel = item.negotiable ? "Négociable" : "Prix fixe";

        card.innerHTML =
          '<div class="listing-image">' + imageHtml + "</div>" +
          '<div class="listing-body">' +
            '<p class="listing-price">' + priceLabel + "</p>" +
            '<h3 class="listing-title">' + item.title + "</h3>" +
            '<p class="listing-meta"><span class="seller-badge">' + badgeLabel + "</span> " +
              '<span class="seller-badge">' + (CATEGORY_LABELS[item.category] || item.category) + "</span></p>" +
          "</div>";

        var link = document.createElement("a");
        link.className = "listing-link";
        link.href = "listing.html?id=" + item.id;
        link.appendChild(card);
        grid.appendChild(link);
      });
    })
    .catch(function () {
      listingsEmptyMsg.hidden = false;
      listingsEmptyMsg.textContent = "Impossible de joindre le serveur (vérifie qu'il est lancé avec npm start).";
      grid.hidden = true;
    });
})();
