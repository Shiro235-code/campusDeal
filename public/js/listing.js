(function () {
  "use strict";

  var CATEGORY_LABELS = {
    livres: "Livres & cours", electronique: "Électronique", vetements: "Vêtements",
    mobilier: "Mobilier & déco", fournitures: "Fournitures", divers: "Divers"
  };
  var CONDITION_LABELS = { neuf: "Neuf", "tres-bon": "Très bon état", bon: "Bon état", correct: "État correct" };

  var session = null;
  try { session = JSON.parse(window.localStorage.getItem("campusdeal-session") || "null"); } catch (e) { session = null; }

  var params = new URLSearchParams(window.location.search);
  var id = params.get("id");

  var contentEl = document.getElementById("listing-content");
  var notFoundEl = document.getElementById("listing-not-found");

  function renderItem(item) {
    contentEl.hidden = false;

    document.getElementById("listing-title").textContent = item.title;
    document.getElementById("listing-price").textContent = Number(item.price).toLocaleString("fr-FR") + " FCFA";
    document.getElementById("listing-description").textContent = item.description || "Pas de description fournie.";
    document.getElementById("listing-category-badge").textContent = CATEGORY_LABELS[item.category] || item.category;
    document.getElementById("listing-negotiable").textContent = item.negotiable ? "Négociable" : "Prix fixe";
    document.getElementById("listing-condition").textContent = CONDITION_LABELS[item.condition] || item.condition;

    var mainPhoto = document.getElementById("listing-main-photo");
    var thumbsWrap = document.getElementById("listing-thumbs");

    if (item.photos && item.photos.length) {
      mainPhoto.innerHTML = '<img src="' + item.photos[0] + '" alt="">';
      if (item.photos.length > 1) {
        item.photos.forEach(function (src, i) {
          var thumb = document.createElement("button");
          thumb.type = "button";
          thumb.className = "listing-thumb" + (i === 0 ? " is-active" : "");
          thumb.innerHTML = '<img src="' + src + '" alt="">';
          thumb.addEventListener("click", function () {
            mainPhoto.innerHTML = '<img src="' + src + '" alt="">';
            thumbsWrap.querySelectorAll(".listing-thumb").forEach(function (t) { t.classList.remove("is-active"); });
            thumb.classList.add("is-active");
          });
          thumbsWrap.appendChild(thumb);
        });
      }
    } else {
      mainPhoto.textContent = item.emoji || "🛍️";
    }

    var sellerName = item.sellerName || "Vendeur anonyme";
    document.getElementById("listing-seller-name").textContent = sellerName;
    document.getElementById("listing-seller-avatar").textContent = sellerName.charAt(0).toUpperCase();
    if (item.certified) { document.getElementById("listing-seller-certified").hidden = false; }

    var sellerLink = document.getElementById("listing-seller-link");
    if (item.sellerId) {
      sellerLink.href = "seller.html?id=" + item.sellerId;
    } else {
      sellerLink.addEventListener("click", function (e) { e.preventDefault(); });
      sellerLink.style.cursor = "default";
    }

    /* ---- J'aime ---- */
    var likeBtn = document.getElementById("btn-like");
    document.getElementById("like-count").textContent = item.likesCount || 0;
    updateLikeButton(item.isLiked);

    likeBtn.addEventListener("click", function () {
      if (!session) { window.location.href = "login.html"; return; }
      if (!id || id.indexOf("mock-") === 0) { return; }

      fetch(API_BASE + "/listings/" + id + "/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.id })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          document.getElementById("like-count").textContent = data.likesCount;
          updateLikeButton(data.liked);
        });
    });

    function updateLikeButton(liked) {
      var count = document.getElementById("like-count").textContent;
      likeBtn.innerHTML = (liked ? "❤️ " : "🤍 ") + '<span id="like-count">' + count + "</span> J'aime";
    }

    /* ---- Contacter le vendeur : messagerie intégrée du site ---- */
    document.getElementById("btn-contact").addEventListener("click", function () {
      if (!session) { window.location.href = "login.html"; return; }
      if (!item.sellerId) {
        document.getElementById("contact-hint").textContent = "Ceci est une annonce de démonstration, sans vendeur réel à contacter.";
        return;
      }
      if (String(item.sellerId) === String(session.id)) {
        document.getElementById("contact-hint").textContent = "C'est ta propre annonce !";
        return;
      }
      window.location.href = "messages.html?with=" + item.sellerId;
    });

    /* ---- Abonnement, autres annonces et commentaires : tout vient du profil du vendeur ---- */
    if (item.sellerId) {
      loadSellerExtras(item.sellerId, item.id);
    }
  }

  function loadSellerExtras(sellerId, currentListingId) {
    var url = API_BASE + "/users/" + sellerId;
    if (session) { url += "?viewerId=" + session.id; }

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        renderFollowButton(data.user);
        renderOtherListings(data.listings, currentListingId);
        renderComments(sellerId, data.comments);
      });
  }

  /* ---- Bouton S'abonner ---- */
  function renderFollowButton(user) {
    var followBtn = document.getElementById("btn-follow");

    if (!session || String(session.id) === String(user.id)) {
      return; // pas connecté, ou c'est sa propre annonce : pas de bouton d'abonnement
    }
    followBtn.hidden = false;
    updateFollowButton(user.isFollowing);

    followBtn.addEventListener("click", function () {
      fetch(API_BASE + "/users/" + user.id + "/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: session.id })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) { updateFollowButton(data.following); });
    });

    function updateFollowButton(isFollowing) {
      followBtn.textContent = isFollowing ? "✓ Abonné" : "S'abonner";
      followBtn.classList.toggle("btn-primary", !isFollowing);
      followBtn.classList.toggle("btn-ghost", isFollowing);
    }
  }

  /* ---- Autres annonces du vendeur (sans réafficher celle qu'on est déjà en train de voir) ---- */
  function renderOtherListings(listings, currentListingId) {
    var others = listings.filter(function (l) { return String(l.id) !== String(currentListingId); });
    var grid = document.getElementById("other-listings-grid");
    var emptyMsg = document.getElementById("other-listings-empty");

    if (others.length === 0) {
      emptyMsg.hidden = false;
      return;
    }

    others.forEach(function (item) {
      var card = document.createElement("article");
      card.className = "listing-card";
      var imageHtml = item.photos && item.photos.length
        ? '<img src="' + item.photos[0] + '" alt="" style="width:100%;height:100%;object-fit:cover;">'
        : "🛍️";
      card.innerHTML =
        '<div class="listing-image">' + imageHtml + "</div>" +
        '<div class="listing-body">' +
          '<p class="listing-price">' + Number(item.price).toLocaleString("fr-FR") + " FCFA</p>" +
          '<h3 class="listing-title">' + item.title + "</h3>" +
          '<p class="listing-meta"><span class="seller-badge">' + (item.negotiable ? "Négociable" : "Prix fixe") + "</span></p>" +
        "</div>";
      var link = document.createElement("a");
      link.className = "listing-link";
      link.href = "listing.html?id=" + item.id;
      link.appendChild(card);
      grid.appendChild(link);
    });
  }

  /* ---- Commentaires sur le vendeur ---- */
  function renderComments(sellerId, comments) {
    var list = document.getElementById("comments-list");
    var emptyMsg = document.getElementById("comments-empty");
    var form = document.getElementById("comment-form");
    var feedback = document.getElementById("comment-feedback");

    function draw() {
      list.innerHTML = "";
      emptyMsg.hidden = comments.length > 0;
      comments.forEach(function (c) {
        var item = document.createElement("div");
        item.style.cssText = "background:var(--surface-2); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:14px;";
        item.innerHTML =
          '<p style="font-weight:600; font-size:.85rem; margin-bottom:6px;">' + c.authorName + "</p>" +
          '<p style="font-size:.88rem; color:var(--text-secondary);">' + c.body + "</p>";
        list.appendChild(item);
      });
    }
    draw();

    if (!session) {
      form.innerHTML = '<p class="step-hint"><a href="login.html" style="color:var(--sky-light);">Connecte-toi</a> pour laisser un commentaire.</p>';
      return;
    }

    form.addEventListener("submit", function (evt) {
      evt.preventDefault();
      var text = document.getElementById("comment-input").value.trim();
      if (!text) { return; }

      fetch(API_BASE + "/users/" + sellerId + "/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId: session.id, body: text })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.success) {
            feedback.className = "form-feedback feedback-error";
            feedback.textContent = data.message;
            return;
          }
          document.getElementById("comment-input").value = "";
          feedback.className = "form-feedback feedback-success";
          feedback.textContent = "Commentaire publié.";
          comments.unshift({ body: text, authorName: session.username, createdAt: new Date().toISOString() });
          draw();
        });
    });
  }

  /* ---- Chargement initial : démo (mock) ou vraie annonce (serveur) ---- */
  if (id && id.indexOf("mock-") === 0) {
    if (typeof MOCK_LISTINGS !== "undefined" && MOCK_LISTINGS[id]) {
      renderItem(MOCK_LISTINGS[id]);
    } else {
      notFoundEl.hidden = false;
    }
  } else {
    var url = API_BASE + "/listings/" + encodeURIComponent(id);
    if (session) { url += "?viewerId=" + session.id; }

    fetch(url)
      .then(function (res) {
        if (!res.ok) { throw new Error("not found"); }
        return res.json();
      })
      .then(function (data) { renderItem(data.listing); })
      .catch(function () { notFoundEl.hidden = false; });
  }
})();
