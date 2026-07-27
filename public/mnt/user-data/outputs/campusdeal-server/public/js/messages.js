(function () {
  "use strict";

  var session = null;
  try { session = JSON.parse(window.localStorage.getItem("campusdeal-session") || "null"); } catch (e) { session = null; }

  if (!session) {
    document.getElementById("messages-signed-out").hidden = false;
    return;
  }
  document.getElementById("messages-app").hidden = false;

  var params = new URLSearchParams(window.location.search);
  var openWithId = params.get("with");

  var conversationsItems = document.getElementById("conversations-items");
  var conversationsEmpty = document.getElementById("conversations-empty");
  var threadPlaceholder = document.getElementById("thread-placeholder");
  var threadActive = document.getElementById("thread-active");
  var threadMessages = document.getElementById("thread-messages");
  var threadForm = document.getElementById("thread-form");
  var threadInput = document.getElementById("thread-input");

  var activeOtherId = null;
  var pollTimer = null;

  function formatTime(isoLike) {
    // SQLite renvoie "AAAA-MM-JJ HH:MM:SS" — on affiche juste l'heure locale, format court.
    var d = new Date(isoLike.replace(" ", "T") + "Z");
    if (isNaN(d.getTime())) { return ""; }
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function loadConversations() {
    fetch(API_BASE + "/conversations?userId=" + session.id)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var conversations = data.conversations || [];
        renderConversationsList(conversations);

        if (openWithId && !activeOtherId) {
          openThread(openWithId);
          openWithId = null; // on ne le réutilise qu'une fois, au premier chargement
        } else if (!activeOtherId && conversations.length > 0) {
          openThread(conversations[0].user.id);
        }
      });
  }

  function renderConversationsList(conversations) {
    conversationsItems.innerHTML = "";
    conversationsEmpty.hidden = conversations.length > 0;

    conversations.forEach(function (conv) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "conversation-item" + (String(conv.user.id) === String(activeOtherId) ? " is-active" : "");
      item.innerHTML =
        '<span class="listing-seller-avatar" style="width:36px;height:36px;font-size:.85rem;">' +
          conv.user.username.charAt(0).toUpperCase() + "</span>" +
        '<span style="overflow:hidden;">' +
          '<span style="display:block; font-weight:600; font-size:.88rem;">' + conv.user.username + "</span>" +
          '<span style="display:block; font-size:.78rem; color:var(--text-tertiary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
            conv.lastMessage + "</span>" +
        "</span>";
      item.addEventListener("click", function () { openThread(conv.user.id); });
      conversationsItems.appendChild(item);
    });
  }

  function openThread(otherId) {
    var isNewThread = String(otherId) !== String(activeOtherId);
    activeOtherId = otherId;
    threadPlaceholder.hidden = true;
    threadActive.hidden = false;

    fetch(API_BASE + "/messages/" + otherId + "?userId=" + session.id)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        document.getElementById("thread-username").textContent = data.otherUser.username;
        document.getElementById("thread-avatar").textContent = data.otherUser.username.charAt(0).toUpperCase();

        threadMessages.innerHTML = "";

        if (data.messages.length === 0) {
          var hint = document.createElement("p");
          hint.className = "step-hint";
          hint.style.margin = "auto";
          hint.textContent = "Aucun message pour l'instant. Écris le premier !";
          threadMessages.appendChild(hint);
        } else {
          data.messages.forEach(function (m) {
            var isMine = String(m.senderId) === String(session.id);
            var wrap = document.createElement("div");
            wrap.className = "message-bubble " + (isMine ? "message-bubble--mine" : "message-bubble--theirs");
            wrap.innerHTML =
              '<span>' + escapeHtml(m.body) + "</span>" +
              '<span class="message-bubble__time">' + formatTime(m.createdAt) + "</span>";
            threadMessages.appendChild(wrap);
          });
        }
        threadMessages.scrollTop = threadMessages.scrollHeight;

        // On souligne la bonne conversation dans la liste de gauche
        Array.prototype.forEach.call(conversationsItems.children, function (el, i) {
          el.classList.toggle("is-active", el.querySelector("span span") &&
            el.querySelector("span span").textContent === data.otherUser.username);
        });
      });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  threadForm.addEventListener("submit", function (evt) {
    evt.preventDefault();
    var text = threadInput.value.trim();
    if (!text || !activeOtherId) { return; }

    threadInput.value = "";
    fetch(API_BASE + "/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: session.id, receiverId: activeOtherId, body: text })
    })
      .then(function (res) { return res.json(); })
      .then(function () {
        openThread(activeOtherId);
        loadConversations();
      });
  });

  loadConversations();

  /* ---- Actualisation automatique toutes les 4 secondes, façon messagerie "en direct" ----
     On ne fait PAS ça avec de vrais WebSockets (plus complexe), mais l'effet est similaire
     pour un projet de cette taille : on revérifie juste régulièrement s'il y a du nouveau. */
  pollTimer = window.setInterval(function () {
    if (activeOtherId) { openThread(activeOtherId); }
    loadConversations();
  }, 4000);

  window.addEventListener("beforeunload", function () {
    if (pollTimer) { window.clearInterval(pollTimer); }
  });
})();
