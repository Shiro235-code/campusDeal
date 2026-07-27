// Notifications de nouveaux messages, façon WhatsApp :
// - une vraie notification du navigateur si l'onglet n'est pas actif
// - un badge qui reste visible (titre de l'onglet + menu "Messages")
//   tant que la conversation correspondante n'a pas été ouverte
(function () {
  "use strict";

  var session = null;
  try { session = JSON.parse(window.localStorage.getItem("campusdeal-session") || "null"); } catch (e) { session = null; }
  if (!session) { return; } // pas connecté : rien à surveiller

  var originalTitle = document.title;
  var lastUnreadTotal = 0;

  // On ne demande la permission de notification qu'une seule fois par navigateur,
  // pour ne pas harceler la personne à chaque page.
  function ensurePermission() {
    if (!("Notification" in window)) { return; }
    if (Notification.permission !== "default") { return; }
    var alreadyAsked = false;
    try { alreadyAsked = window.localStorage.getItem("campusdeal-notif-asked") === "1"; } catch (e) { /* ignore */ }
    if (!alreadyAsked) {
      Notification.requestPermission();
      try { window.localStorage.setItem("campusdeal-notif-asked", "1"); } catch (e) { /* ignore */ }
    }
  }
  ensurePermission();

  function updateBadge(count) {
    // Le titre de l'onglet affiche "(2) CampusDeal — ..." tant qu'il reste des messages non lus
    document.title = count > 0 ? "(" + count + ") " + originalTitle : originalTitle;

    // Petit point rouge sur le lien "Messages" du menu, s'il est présent sur cette page
    var link = document.querySelector('a[href="messages.html"]');
    if (!link) { return; }
    var dot = link.querySelector(".nav-unread-dot");
    if (count > 0 && !dot) {
      dot = document.createElement("span");
      dot.className = "nav-unread-dot";
      link.appendChild(dot);
    } else if (count === 0 && dot) {
      dot.remove();
    }
  }

  function poll() {
    fetch(API_BASE + "/conversations?userId=" + session.id)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var conversations = data.conversations || [];
        var total = conversations.reduce(function (sum, c) { return sum + (c.unreadCount || 0); }, 0);

        // On ne déclenche une notification "bureau" que si le total AUGMENTE,
        // et seulement si la personne n'est pas déjà en train de regarder l'onglet
        // (sinon elle voit déjà le message arriver en direct dans messages.html).
        if (total > lastUnreadTotal && (document.hidden || !document.hasFocus())) {
          var withNew = conversations.filter(function (c) { return c.unreadCount > 0; })[0];
          if (withNew && "Notification" in window && Notification.permission === "granted") {
            var notif = new Notification("CampusDeal — " + withNew.user.username, {
              body: withNew.lastMessage || "Nouveau message"
            });
            notif.onclick = function () {
              window.focus();
              window.location.href = "messages.html?with=" + withNew.user.id;
              notif.close();
            };
          }
        }

        lastUnreadTotal = total;
        updateBadge(total);
      })
      .catch(function () { /* pas de connexion au serveur : on réessaiera au prochain cycle */ });
  }

  poll();
  window.setInterval(poll, 6000);
})();
