(function () {
  "use strict";

  var session = null;
  try { session = JSON.parse(window.localStorage.getItem("campusdeal-session") || "null"); } catch (e) { session = null; }

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  /* ---- Pré-remplissage avec les infos actuelles ---- */
  var usernameInput = document.getElementById("username");
  var facultyInput = document.getElementById("faculty");
  var majorInput = document.getElementById("major");
  var avatarImg = document.getElementById("avatar-img");
  var avatarPlaceholder = document.getElementById("avatar-placeholder");

  usernameInput.value = session.username || "";
  facultyInput.value = session.faculty || "";
  majorInput.value = session.major || "";

  if (session.avatar) {
    avatarImg.src = session.avatar;
    avatarImg.hidden = false;
    avatarPlaceholder.hidden = true;
  } else {
    avatarPlaceholder.textContent = (session.username || "?").charAt(0).toUpperCase();
  }

  document.getElementById("avatar-input").addEventListener("change", function (evt) {
    var file = evt.target.files && evt.target.files[0];
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      avatarImg.src = e.target.result;
      avatarImg.hidden = false;
      avatarPlaceholder.hidden = true;
    };
    reader.readAsDataURL(file);
  });

  /* ---- Enregistrer les infos du profil ---- */
  var profileForm = document.getElementById("profile-form");
  var profileFeedback = document.getElementById("profile-feedback");

  profileForm.addEventListener("submit", function (evt) {
    evt.preventDefault();

    var payload = {
      username: usernameInput.value.trim(),
      faculty: facultyInput.value,
      major: majorInput.value.trim(),
      avatar: avatarImg.hidden ? null : avatarImg.src
    };

    profileFeedback.className = "form-feedback";
    profileFeedback.textContent = "Enregistrement…";

    fetch(API_BASE + "/users/" + session.id + "/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || !result.data.success) {
          profileFeedback.className = "form-feedback feedback-error";
          profileFeedback.textContent = result.data.message || "Échec de l'enregistrement.";
          return;
        }
        // On met à jour la session locale avec les nouvelles infos, pour que tout le
        // site (menu, profil...) les reflète immédiatement, sans avoir à se reconnecter.
        try { window.localStorage.setItem("campusdeal-session", JSON.stringify(result.data.user)); } catch (e) { /* ignore */ }

        profileFeedback.className = "form-feedback feedback-success";
        profileFeedback.textContent = "Profil mis à jour !";
        window.setTimeout(function () { window.location.href = "profile.html"; }, 900);
      })
      .catch(function () {
        profileFeedback.className = "form-feedback feedback-error";
        profileFeedback.textContent = "Impossible de joindre le serveur.";
      });
  });

  /* ---- Changer le mot de passe ---- */
  var passwordForm = document.getElementById("password-form");
  var passwordFeedback = document.getElementById("password-feedback");

  passwordForm.addEventListener("submit", function (evt) {
    evt.preventDefault();

    var current = document.getElementById("current-password").value;
    var next = document.getElementById("new-password").value;
    var confirm = document.getElementById("new-password-confirm").value;

    if (next !== confirm) {
      passwordFeedback.className = "form-feedback feedback-error";
      passwordFeedback.textContent = "Les deux nouveaux mots de passe ne correspondent pas.";
      return;
    }

    passwordFeedback.className = "form-feedback";
    passwordFeedback.textContent = "Changement en cours…";

    fetch(API_BASE + "/users/" + session.id + "/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || !result.data.success) {
          passwordFeedback.className = "form-feedback feedback-error";
          passwordFeedback.textContent = result.data.message || "Échec du changement de mot de passe.";
          return;
        }
        passwordFeedback.className = "form-feedback feedback-success";
        passwordFeedback.textContent = "Mot de passe changé !";
        passwordForm.reset();
      })
      .catch(function () {
        passwordFeedback.className = "form-feedback feedback-error";
        passwordFeedback.textContent = "Impossible de joindre le serveur.";
      });
  });
  /* ---- Certification étudiante ---- */
  var certStatusEl = document.getElementById("certification-status");
  var certForm = document.getElementById("certification-form");
  var certFeedback = document.getElementById("certification-feedback");
  var certSubmitBtn = document.getElementById("certification-submit");
  var proofTypeRadios = document.querySelectorAll('input[name="proof-type"]');
  var proofEmailField = document.getElementById("proof-email-field");
  var proofImageField = document.getElementById("proof-image-field");
  var proofImageInput = document.getElementById("proof-image-input");
  var proofImagePreview = document.getElementById("proof-image-preview");
  var proofImagePlaceholder = document.getElementById("proof-image-placeholder");
  var proofImageData = null;

  proofTypeRadios.forEach(function (r) {
    r.addEventListener("change", function () {
      var isEmail = document.querySelector('input[name="proof-type"]:checked').value === "email";
      proofEmailField.hidden = !isEmail;
      proofImageField.hidden = isEmail;
    });
  });

  proofImageInput.addEventListener("change", function () {
    var file = proofImageInput.files && proofImageInput.files[0];
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      proofImageData = e.target.result;
      proofImagePreview.src = proofImageData;
      proofImagePreview.hidden = false;
      proofImagePlaceholder.hidden = true;
    };
    reader.readAsDataURL(file);
  });

  function loadCertificationStatus() {
    fetch(API_BASE + "/users/" + session.id + "/certification")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var request = data.request;

        if (session.certified) {
          certStatusEl.innerHTML = '<p class="form-feedback feedback-success">✓ Tu es un étudiant certifié.</p>';
          certForm.hidden = true;
        } else if (request && request.status === "pending") {
          certStatusEl.innerHTML = '<p class="step-hint">⏳ Ta demande est en attente de vérification par un administrateur.</p>';
          certSubmitBtn.textContent = "Renvoyer une nouvelle demande";
        } else if (request && request.status === "rejected") {
          certStatusEl.innerHTML = '<p class="form-feedback feedback-error">Ta dernière demande a été refusée. Tu peux en renvoyer une avec une preuve différente.</p>';
        }
      });
  }
  loadCertificationStatus();

  certForm.addEventListener("submit", function (evt) {
    evt.preventDefault();
    var proofType = document.querySelector('input[name="proof-type"]:checked').value;

    var payload = { proofType: proofType };
    if (proofType === "email") {
      payload.proofEmail = document.getElementById("proof-email").value.trim();
    } else {
      payload.proofImage = proofImageData;
    }

    certFeedback.className = "form-feedback";
    certFeedback.textContent = "Envoi en cours…";

    fetch(API_BASE + "/users/" + session.id + "/certification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || !result.data.success) {
          certFeedback.className = "form-feedback feedback-error";
          certFeedback.textContent = result.data.message || "Échec de l'envoi.";
          return;
        }
        certFeedback.className = "form-feedback feedback-success";
        certFeedback.textContent = "Demande envoyée !";
        loadCertificationStatus();
      });
  });
})();
