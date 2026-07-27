(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var sellerId = params.get("id");

  var session = null;
  try { session = JSON.parse(window.localStorage.getItem("campusdeal-session") || "null"); } catch (e) { session = null; }

  var contentEl = document.getElementById("seller-content");
  var notFoundEl = document.getElementById("seller-not-found");

  if (!sellerId) { notFoundEl.hidden = false; }
  else { loadSeller(); }

  function loadSeller() {
    var url = API_BASE + "/users/" + encodeURIComponent(sellerId);
    if (session) { url += "?viewerId=" + session.id; }

    fetch(url)
      .then(function (res) {
        if (!res.ok) { throw new Error("not found"); }
        return res.json();
      })
      .then(function (data) { render(data.user, data.listings, data.comments); })
      .catch(function () { notFoundEl.hidden = false; });
  }

  function render(user, listings, comments) {
    contentEl.hidden = false;

    document.getElementById("seller-username").textContent = user.username;
    document.getElementById("seller-meta").textContent =
      (user.major || "Filière non renseignée") + " · " + (user.faculty || "Faculté non renseignée");
    document.getElementById("seller-followers").textContent =
      user.followersCount + (user.followersCount > 1 ? " abonnés" : " abonné");

    if (user.avatar) {
      document.getElementById("seller-avatar-img").src = user.avatar;
      document.getElementById("seller-avatar-img").hidden = false;
      document.getElementById("seller-avatar-fallback").hidden = true;
    } else {
      document.getElementById("seller-avatar-fallback").textContent = user.username.charAt(0).toUpperCase();
    }

    /* ---- Bouton Suivre ---- */
    var followBtn = document.getElementById("btn-follow");
    var messageBtn = document.getElementById("btn-message");

    if (!session) {
      followBtn.textContent = "Se connecter pour suivre";
      followBtn.addEventListener("click", function () { window.location.href = "login.html"; });
      messageBtn.textContent = "Se connecter pour écrire";
      messageBtn.addEventListener("click", function () { window.location.href = "login.html"; });
    } else if (String(session.id) === String(user.id)) {
      // On regarde son propre profil public : pas de bouton "suivre soi-même"
      followBtn.hidden = true;
      messageBtn.hidden = true;
    } else {
      updateFollowButton(user.isFollowing);
      followBtn.addEventListener("click", function () {
        fetch(API_BASE + "/users/" + user.id + "/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followerId: session.id })
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            updateFollowButton(data.following);
            document.getElementById("seller-followers").textContent =
              data.followersCount + (data.followersCount > 1 ? " abonnés" : " abonné");
          });
      });

      messageBtn.addEventListener("click", function () {
        window.location.href = "messages.html?with=" + user.id;
      });
    }

    function updateFollowButton(isFollowing) {
      followBtn.textContent = isFollowing ? "✓ Abonné" : "S'abonner";
      followBtn.classList.toggle("btn-primary", !isFollowing);
      followBtn.classList.toggle("btn-ghost", isFollowing);
    }

    /* ---- Annonces du vendeur ---- */
    var grid = document.getElementById("seller-listings-grid");
    var listingsEmpty = document.getElementById("seller-listings-empty");
    if (listings.length === 0) {
      listingsEmpty.hidden = false;
    } else {
      listingsEmpty.hidden = true;
      listings.forEach(function (item) {
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

    /* ---- Commentaires ---- */
    renderComments(comments);

    var commentForm = document.getElementById("comment-form");
    var commentFeedback = document.getElementById("comment-feedback");

    if (!session) {
      commentForm.innerHTML = '<p class="step-hint"><a href="login.html" style="color:var(--sky-light);">Connecte-toi</a> pour laisser un commentaire.</p>';
    } else {
      commentForm.addEventListener("submit", function (evt) {
        evt.preventDefault();
        var text = document.getElementById("comment-input").value.trim();
        if (!text) { return; }

        fetch(API_BASE + "/users/" + user.id + "/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorId: session.id, body: text })
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (!data.success) {
              commentFeedback.className = "form-feedback feedback-error";
              commentFeedback.textContent = data.message;
              return;
            }
            document.getElementById("comment-input").value = "";
            commentFeedback.className = "form-feedback feedback-success";
            commentFeedback.textContent = "Commentaire publié.";
            comments.unshift({ body: text, authorName: session.username, createdAt: new Date().toISOString() });
            renderComments(comments);
          });
      });
    }
  }

  function renderComments(comments) {
    var list = document.getElementById("comments-list");
    var emptyMsg = document.getElementById("comments-empty");
    list.innerHTML = "";

    if (comments.length === 0) {
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;

    comments.forEach(function (c) {
      var item = document.createElement("div");
      item.style.cssText = "background:var(--surface-2); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:14px;";
      item.innerHTML =
        '<p style="font-weight:600; font-size:.85rem; margin-bottom:6px;">' + c.authorName + "</p>" +
        '<p style="font-size:.88rem; color:var(--text-secondary);">' + c.body + "</p>";
      list.appendChild(item);
    });
  }
})();
