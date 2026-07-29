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
    document.getElementById("orders-list").hidden = true;
    document.getElementById("orders-empty").hidden = true;
    return;
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

  var CATEGORY_LABELS = {
    livres: "Livres & cours", electronique: "Électronique", vetements: "Vêtements",
    mobilier: "Mobilier & déco", fournitures: "Fournitures", divers: "Divers"
  };

  /* =========================================================
     DEMANDES D'ACHAT REÇUES (à valider ou refuser)
     ========================================================= */
  var ordersList = document.getElementById("orders-list");
  var ordersEmpty = document.getElementById("orders-empty");

  function loadOrders() {
    fetch(API_BASE + "/sellers/" + session.id + "/orders?status=pending")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var orders = data.orders || [];
        ordersList.innerHTML = "";
        ordersEmpty.hidden = orders.length > 0;

        orders.forEach(function (order) {
          var card = document.createElement("div");
          card.style.cssText = "background:var(--surface-2); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:14px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;";
          card.innerHTML =
            '<div><p style="font-weight:600; font-size:.9rem;">' + order.buyer_name + '</p>' +
            '<p style="font-size:.85rem; color:var(--text-secondary);">veut acheter « ' + order.listing_title +
            ' » — ' + Number(order.listing_price).toLocaleString("fr-FR") + ' FCFA</p></div>' +
            '<div style="display:flex; gap:8px;">' +
              '<button type="button" class="btn btn-primary btn-confirm-order">✓ Valider</button>' +
              '<button type="button" class="btn btn-ghost btn-cancel-order">✗ Refuser</button>' +
            '</div>';

          card.querySelector(".btn-confirm-order").addEventListener("click", function () {
            if (!window.confirm("Confirmes-tu que la transaction avec " + order.buyer_name + " a bien eu lieu ?")) { return; }
            fetch(API_BASE + "/orders/" + order.id + "/confirm", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sellerId: session.id })
            })
              .then(function (res) { return res.json(); })
              .then(function () { loadOrders(); loadListings(); });
          });

          card.querySelector(".btn-cancel-order").addEventListener("click", function () {
            fetch(API_BASE + "/orders/" + order.id + "/cancel", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sellerId: session.id })
            })
              .then(function (res) { return res.json(); })
              .then(function () { loadOrders(); });
          });

          ordersList.appendChild(card);
        });
      });
  }

  /* =========================================================
     MES ANNONCES (actives ET épuisées, avec actions selon le cas)
     ========================================================= */
  var grid = document.getElementById("my-listings-grid");
  var listingsEmptyMsg = document.getElementById("listings-empty");

  function loadListings() {
    fetch(API_BASE + "/listings?sellerId=" + session.id + "&includeSoldOut=true")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var listings = data.listings || [];
        grid.innerHTML = "";

        if (listings.length === 0) {
          listingsEmptyMsg.hidden = false;
          grid.hidden = true;
          return;
        }
        listingsEmptyMsg.hidden = true;
        grid.hidden = false;

        listings.forEach(function (item) {
          var card = document.createElement("article");
          card.className = "listing-card";
          var imageHtml = item.photos && item.photos.length
            ? '<img src="' + item.photos[0] + '" alt="" style="width:100%;height:100%;object-fit:cover;">'
            : "🛍️";
          var priceLabel = Number(item.price).toLocaleString("fr-FR") + " FCFA";
          var badgeLabel = item.negotiable ? "Négociable" : "Prix fixe";
          var stockLabel = item.stockAvailable + " dispo · " + item.stockSold + " vendu" + (item.stockSold > 1 ? "s" : "");

          card.innerHTML =
            '<div class="listing-image">' + imageHtml + "</div>" +
            '<div class="listing-body">' +
              '<p class="listing-price">' + priceLabel + "</p>" +
              '<h3 class="listing-title">' + item.title + "</h3>" +
              '<p class="listing-meta"><span class="seller-badge">' + badgeLabel + "</span> " +
                '<span class="seller-badge">' + (CATEGORY_LABELS[item.category] || item.category) + "</span></p>" +
              '<p class="step-hint" style="margin-top:6px;">' + stockLabel + "</p>" +
            "</div>";

          var wrap = document.createElement("div");
          var link = document.createElement("a");
          link.className = "listing-link";
          link.href = "listing.html?id=" + item.id;
          link.appendChild(card);
          wrap.appendChild(link);

          var actions = document.createElement("div");
          actions.className = "listing-owner-actions";

          if (item.status === "sold_out") {
            // Stock épuisé : le vendeur choisit de renouveler ou de terminer l'annonce
            actions.innerHTML =
              '<button type="button" class="btn btn-primary btn-renew">Renouveler le stock</button>' +
              '<button type="button" class="btn btn-ghost btn-archive">Stock vraiment fini</button>';

            actions.querySelector(".btn-renew").addEventListener("click", function () {
              var qty = window.prompt("Combien de nouveaux exemplaires ajoutes-tu ?", "1");
              if (!qty || isNaN(Number(qty)) || Number(qty) < 1) { return; }
              fetch(API_BASE + "/listings/" + item.id + "/renew", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sellerId: session.id, addStock: Number(qty) })
              })
                .then(function (res) { return res.json(); })
                .then(function () { loadListings(); });
            });

            actions.querySelector(".btn-archive").addEventListener("click", function () {
              if (!window.confirm('Terminer définitivement "' + item.title + '" ? Elle disparaîtra de ton profil.')) { return; }
              fetch(API_BASE + "/listings/" + item.id + "/archive", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sellerId: session.id })
              })
                .then(function (res) { return res.json(); })
                .then(function () { loadListings(); });
            });
          } else {
            // Annonce active : modifier / supprimer comme avant
            actions.innerHTML =
              '<a href="sell.html?edit=' + item.id + '" class="btn btn-ghost">Modifier</a>' +
              '<button type="button" class="btn btn-ghost listing-delete-btn">Supprimer</button>';
            actions.querySelector(".listing-delete-btn").addEventListener("click", function () {
              if (!window.confirm('Supprimer définitivement "' + item.title + '" ?')) { return; }
              fetch(API_BASE + "/listings/" + item.id, {
                method: "DELETE", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sellerId: session.id })
              })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                  if (data.success) { wrap.remove(); }
                  else { alert(data.message || "Suppression impossible."); }
                });
            });
          }

          wrap.appendChild(actions);
          grid.appendChild(wrap);
        });
      });
  }

  loadOrders();
  loadListings();
})();
