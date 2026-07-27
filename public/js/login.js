(function () {
  "use strict";

  var form = document.getElementById("login-form");
  var feedback = document.getElementById("login-feedback");

  form.addEventListener("submit", function (evt) {
    evt.preventDefault();

    var payload = {
      identifier: document.getElementById("login-identifier").value.trim(),
      password: document.getElementById("login-password").value
    };

    feedback.className = "form-feedback";
    feedback.textContent = "Connexion en cours…";

    fetch(API_BASE + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || !result.data.success) {
          feedback.className = "form-feedback feedback-error";
          feedback.textContent = result.data.message || "Identifiants incorrects.";
          return;
        }

        var sessionSaved = false;
        try {
          window.localStorage.setItem("campusdeal-session", JSON.stringify(result.data.user));
          sessionSaved = true;
        } catch (e) { sessionSaved = false; }

        if (!sessionSaved) {
          feedback.className = "form-feedback feedback-error";
          feedback.textContent = "Connexion réussie côté serveur, mais impossible de garder la session (mémoire pleine). Tape localStorage.clear() dans la console (F12), puis réessaie.";
          return;
        }

        feedback.className = "form-feedback feedback-success";
        feedback.textContent = "Connexion réussie ! Redirection…";

        window.setTimeout(function () { window.location.href = "profile.html"; }, 700);
      })
      .catch(function () {
        feedback.className = "form-feedback feedback-error";
        feedback.textContent = "Impossible de joindre le serveur. Vérifie qu'il est bien lancé (npm start).";
      });
  });
})();
