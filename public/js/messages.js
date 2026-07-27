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
  var btnSend = document.getElementById("btn-send");
  var emojiPanel = document.getElementById("emoji-panel");
  var btnEmoji = document.getElementById("btn-emoji");
  var btnImage = document.getElementById("btn-image");
  var imageInput = document.getElementById("image-input");
  var btnVoice = document.getElementById("btn-voice");
  var recordingIndicator = document.getElementById("recording-indicator");

  var activeOtherId = null;
  var pollTimer = null;
  var renderedMessageIds = {};   // pour ne redessiner que les NOUVEAUX messages (fluidité)
  var isSending = false;

  /* ---------------------------------------------------------
     OUTILS
     --------------------------------------------------------- */
  function formatTime(isoLike) {
    var d = new Date(isoLike.replace(" ", "T") + "Z");
    if (isNaN(d.getTime())) { return ""; }
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function isNearBottom() {
    return threadMessages.scrollHeight - threadMessages.scrollTop - threadMessages.clientHeight < 80;
  }

  /* ---------------------------------------------------------
     ÉMOJIS — petit panneau maison (pas d'accès direct au clavier
     émoji natif depuis un simple <input> sur tous les systèmes)
     --------------------------------------------------------- */
  var COMMON_EMOJIS = ["😀","😂","😍","👍","🙏","🎉","😢","😮","❤️","🔥","😅","🤔","👏","🙌","😎","🥲"];
  COMMON_EMOJIS.forEach(function (emoji) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-option";
    btn.textContent = emoji;
    btn.addEventListener("click", function () {
      threadInput.value += emoji;
      threadInput.focus();
    });
    emojiPanel.appendChild(btn);
  });

  btnEmoji.addEventListener("click", function () {
    emojiPanel.hidden = !emojiPanel.hidden;
  });

  /* ---------------------------------------------------------
     CHARGEMENT DES CONVERSATIONS
     --------------------------------------------------------- */
  function loadConversations() {
    fetch(API_BASE + "/conversations?userId=" + session.id)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var conversations = data.conversations || [];
        renderConversationsList(conversations);

        if (openWithId && !activeOtherId) {
          openThread(openWithId);
          openWithId = null;
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
        '<span style="overflow:hidden; flex:1;">' +
          '<span style="display:block; font-weight:600; font-size:.88rem;">' + conv.user.username + "</span>" +
          '<span style="display:block; font-size:.78rem; color:var(--text-tertiary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
            conv.lastMessage + "</span>" +
        "</span>" +
        (conv.unreadCount > 0 ? '<span class="unread-badge">' + conv.unreadCount + "</span>" : "");
      item.addEventListener("click", function () { openThread(conv.user.id); });
      conversationsItems.appendChild(item);
    });
  }

  /* ---------------------------------------------------------
     OUVERTURE / RAFRAÎCHISSEMENT D'UNE CONVERSATION
     --------------------------------------------------------- */
  function openThread(otherId) {
    var isNewThread = String(otherId) !== String(activeOtherId);
    if (isNewThread) {
      renderedMessageIds = {}; // on repart de zéro pour une nouvelle conversation
      threadMessages.innerHTML = "";
    }
    activeOtherId = otherId;
    threadPlaceholder.hidden = true;
    threadActive.hidden = false;

    var wasNearBottom = isNearBottom();

    fetch(API_BASE + "/messages/" + otherId + "?userId=" + session.id)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        document.getElementById("thread-username").textContent = data.otherUser.username;
        document.getElementById("thread-avatar").textContent = data.otherUser.username.charAt(0).toUpperCase();

        if (data.messages.length === 0 && Object.keys(renderedMessageIds).length === 0) {
          var hint = document.createElement("p");
          hint.className = "step-hint";
          hint.id = "empty-thread-hint";
          hint.style.margin = "auto";
          hint.textContent = "Aucun message pour l'instant. Écris le premier !";
          threadMessages.appendChild(hint);
        }

        var addedNew = false;
        data.messages.forEach(function (m) {
          if (renderedMessageIds[m.id]) {
            // Le message existe déjà à l'écran : on met juste à jour ses coches (délivré/lu)
            updateTicks(m);
            return;
          }
          var emptyHint = document.getElementById("empty-thread-hint");
          if (emptyHint) { emptyHint.remove(); }

          appendMessageBubble(m);
          renderedMessageIds[m.id] = true;
          addedNew = true;
        });

        // On ne fait défiler automatiquement que si on était déjà en bas
        // (sinon, ça arracherait la personne en train de relire l'historique)
        if (addedNew && (wasNearBottom || isNewThread)) {
          threadMessages.scrollTop = threadMessages.scrollHeight;
        }

        Array.prototype.forEach.call(conversationsItems.children, function (el) {
          var nameEl = el.querySelector("span span");
          el.classList.toggle("is-active", nameEl && nameEl.textContent === data.otherUser.username);
        });
      });
  }

  function bubbleContentHtml(m) {
    if (m.type === "image") {
      return '<img src="' + m.attachment + '" alt="" class="message-bubble__image">' +
        (m.body ? '<span>' + escapeHtml(m.body) + "</span>" : "");
    }
    if (m.type === "audio") {
      return '<audio controls src="' + m.attachment + '" class="message-bubble__audio"></audio>';
    }
    return "<span>" + escapeHtml(m.body) + "</span>";
  }

  function ticksHtml(m) {
    if (String(m.senderId) !== String(session.id)) { return ""; } // les coches ne s'affichent que sur MES messages
    var cls = m.readAt ? "ticks ticks--read" : (m.deliveredAt ? "ticks ticks--delivered" : "ticks");
    var symbol = (m.deliveredAt || m.readAt) ? "✓✓" : "✓";
    return '<span class="' + cls + '">' + symbol + "</span>";
  }

  function appendMessageBubble(m) {
    var isMine = String(m.senderId) === String(session.id);
    var wrap = document.createElement("div");
    wrap.className = "message-bubble " + (isMine ? "message-bubble--mine" : "message-bubble--theirs");
    wrap.id = "msg-" + m.id;
    wrap.innerHTML =
      bubbleContentHtml(m) +
      '<span class="message-bubble__meta">' +
        '<span class="message-bubble__time">' + formatTime(m.createdAt) + "</span>" +
        ticksHtml(m) +
      "</span>";
    threadMessages.appendChild(wrap);
  }

  function updateTicks(m) {
    var el = document.getElementById("msg-" + m.id);
    if (!el) { return; }
    var meta = el.querySelector(".message-bubble__meta");
    if (!meta) { return; }
    var existingTicks = meta.querySelector(".ticks");
    var newTicksHtml = ticksHtml(m);
    if (existingTicks) { existingTicks.outerHTML = newTicksHtml; }
    else if (newTicksHtml) { meta.insertAdjacentHTML("beforeend", newTicksHtml); }
  }

  /* ---------------------------------------------------------
     ENVOI D'UN MESSAGE (texte, image ou vocal)
     Affichage optimiste : la bulle apparaît tout de suite, avant
     même la réponse du serveur, pour que ça se sente "fluide".
     --------------------------------------------------------- */
  function sendMessage(payload) {
    if (isSending || !activeOtherId) { return; }
    isSending = true;
    btnSend.disabled = true;

    var optimisticId = "temp-" + Date.now();
    var optimisticMsg = {
      id: optimisticId, senderId: session.id, type: payload.type,
      body: payload.body || "", attachment: payload.attachment || null,
      createdAt: new Date().toISOString(), deliveredAt: null, readAt: null
    };
    appendMessageBubble(optimisticMsg);
    threadMessages.scrollTop = threadMessages.scrollHeight;

    fetch(API_BASE + "/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: session.id, receiverId: activeOtherId,
        type: payload.type, body: payload.body || "", attachment: payload.attachment || null
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        // On remplace la bulle temporaire par la vraie (avec son vrai id, pour les coches)
        var el = document.getElementById("msg-" + optimisticId);
        if (el) { el.remove(); }
        appendMessageBubble(data.message);
        renderedMessageIds[data.message.id] = true;
        threadMessages.scrollTop = threadMessages.scrollHeight;

        loadConversations();
      })
      .finally(function () {
        isSending = false;
        btnSend.disabled = false;
      });
  }

  threadForm.addEventListener("submit", function (evt) {
    evt.preventDefault();
    var text = threadInput.value.trim();
    if (!text) { return; }
    threadInput.value = "";
    emojiPanel.hidden = true;
    sendMessage({ type: "text", body: text });
  });

  /* ---------------------------------------------------------
     ENVOI D'IMAGE
     --------------------------------------------------------- */
  btnImage.addEventListener("click", function () {
    if (!activeOtherId) { return; }
    imageInput.click();
  });

  imageInput.addEventListener("change", function () {
    var file = imageInput.files && imageInput.files[0];
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function (evt) {
      sendMessage({ type: "image", attachment: evt.target.result });
    };
    reader.readAsDataURL(file);
    imageInput.value = "";
  });

  /* ---------------------------------------------------------
     MESSAGE VOCAL — MediaRecorder (micro du navigateur)
     --------------------------------------------------------- */
  var mediaRecorder = null;
  var audioChunks = [];
  var isRecording = false;

  btnVoice.addEventListener("click", function () {
    if (!activeOtherId) { return; }
    if (isRecording) { stopRecording(true); return; }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("L'enregistrement audio n'est pas pris en charge par ce navigateur.");
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) {
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.addEventListener("dataavailable", function (e) { audioChunks.push(e.data); });
        mediaRecorder.addEventListener("stop", function () {
          stream.getTracks().forEach(function (t) { t.stop(); }); // libère le micro
        });
        mediaRecorder.start();
        isRecording = true;
        recordingIndicator.hidden = false;
        btnVoice.textContent = "⏹️";
      })
      .catch(function () {
        alert("Impossible d'accéder au micro (permission refusée ou aucun micro détecté).");
      });
  });

  document.getElementById("btn-cancel-recording").addEventListener("click", function (e) {
    e.stopPropagation();
    stopRecording(false);
  });

  function stopRecording(shouldSend) {
    if (!mediaRecorder || !isRecording) { return; }
    isRecording = false;
    recordingIndicator.hidden = true;
    btnVoice.textContent = "🎤";

    mediaRecorder.addEventListener("stop", function onStop() {
      mediaRecorder.removeEventListener("stop", onStop);
      if (!shouldSend || audioChunks.length === 0) { return; }
      var blob = new Blob(audioChunks, { type: "audio/webm" });
      var reader = new FileReader();
      reader.onload = function (evt) {
        sendMessage({ type: "audio", attachment: evt.target.result });
      };
      reader.readAsDataURL(blob);
    });
    mediaRecorder.stop();
  }

  /* ---------------------------------------------------------
     DÉMARRAGE + ACTUALISATION AUTOMATIQUE
     --------------------------------------------------------- */
  loadConversations();

  pollTimer = window.setInterval(function () {
    if (activeOtherId) { openThread(activeOtherId); }
    loadConversations();
  }, 4000);

  window.addEventListener("beforeunload", function () {
    if (pollTimer) { window.clearInterval(pollTimer); }
  });
})();
