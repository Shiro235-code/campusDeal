(function () {
  "use strict";

  var CATEGORY_LABELS = {
    livres: "Livres & cours", electronique: "Électronique", vetements: "Vêtements",
    mobilier: "Mobilier & déco", fournitures: "Fournitures", divers: "Divers"
  };

  var params = new URLSearchParams(window.location.search);
  var currentCategory = params.get("category") || "";
  var currentSearch = params.get("search") || "";

  var grid = document.getElementById("articles-grid");
  var loadingMsg = document.getElementById("articles-loading");
  var emptyMsg = document.getElementById("articles-empty");
  var titleEl = document.getElementById("articles-title");
  var searchInput = document.getElementById("articles-search-input");
  var searchForm = document.getElementById("articles-search-form");

  // Le titre de la page s'adapte à la catégorie choisie
  titleEl.textContent = currentCategory ? CATEGORY_LABELS[currentCategory] || "Articles" : "Tous les articles";
  searchInput.value = currentSearch;

  // On surligne l'onglet de catégorie actif
  document.querySelectorAll("#category-tabs a").forEach(function (a) {
    if (a.dataset.category === currentCategory) { a.style.color = "var(--sky-light)"; }
  });

  function loadArticles() {
    loadingMsg.hidden = false;
    emptyMsg.hidden = true;
    grid.innerHTML = "";

    var url = API_BASE + "/listings?";
    var queryParts = [];
    if (currentCategory) { queryParts.push("category=" + encodeURIComponent(currentCategory)); }
    if (currentSearch) { queryParts.push("search=" + encodeURIComponent(currentSearch)); }
    url += queryParts.join("&");

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        loadingMsg.hidden = true;
        var listings = data.listings || [];

        if (listings.length === 0) {
          emptyMsg.hidden = false;
          return;
        }

        listings.forEach(function (item) {
          var card = document.createElement("article");
          card.className = "listing-card";

          var imageHtml = item.photos && item.photos.length
            ? '<img src="' + item.photos[0] + '" alt="" style="width:100%;height:100%;object-fit:cover;">'
            : "🛍️";

          var priceLabel = Number(item.price).toLocaleString("fr-FR") + " FCFA";
          var badgeLabel = item.negotiable ? "Négociable" : "Prix fixe";
          var sellerBadge = item.certified
            ? '<span class="seller-badge certified">✓ ' + item.sellerName + '</span>'
            : '<span class="seller-badge">' + item.sellerName + '</span>';

          card.innerHTML =
            '<div class="listing-image">' + imageHtml + "</div>" +
            '<div class="listing-body">' +
              '<p class="listing-price">' + priceLabel + "</p>" +
              '<h3 class="listing-title">' + item.title + "</h3>" +
              '<p class="listing-meta"><span class="seller-badge">' + badgeLabel + "</span> " + sellerBadge + "</p>" +
            "</div>";

          var link = document.createElement("a");
          link.className = "listing-link";
          link.href = "listing.html?id=" + item.id;
          link.appendChild(card);
          grid.appendChild(link);
        });
      })
      .catch(function () {
        loadingMsg.hidden = true;
        emptyMsg.hidden = false;
        emptyMsg.textContent = "Impossible de joindre le serveur (vérifie qu'il est lancé avec npm start).";
      });
  }

  // Recherche : on met à jour l'URL (pour pouvoir partager/rafraîchir le lien)
  // et on relance le chargement, sans recharger toute la page.
  searchForm.addEventListener("submit", function (evt) {
    evt.preventDefault();
    currentSearch = searchInput.value.trim();
    var newParams = new URLSearchParams();
    if (currentCategory) { newParams.set("category", currentCategory); }
    if (currentSearch) { newParams.set("search", currentSearch); }
    window.history.replaceState({}, "", "articles.html?" + newParams.toString());
    loadArticles();
  });

  loadArticles();
})();
