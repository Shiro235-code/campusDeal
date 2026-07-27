(function () {
  "use strict";

  var form = document.getElementById("register-form");
  var steps = Array.prototype.slice.call(document.querySelectorAll(".form-step"));
  var dots = Array.prototype.slice.call(document.querySelectorAll("#progress-dots .dot"));
  var btnBack = document.getElementById("btn-back");
  var btnNext = document.getElementById("btn-next");
  var btnSubmit = document.getElementById("btn-submit");
  var feedback = document.getElementById("form-feedback");

  var currentStep = 0;

  function renderStep() {
    steps.forEach(function (stepEl, i) { stepEl.classList.toggle("is-active", i === currentStep); });
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === currentStep);
      dot.classList.toggle("is-done", i < currentStep);
    });
    btnBack.hidden = currentStep === 0;
    var isLastStep = currentStep === steps.length - 1;
    btnNext.hidden = isLastStep;
    btnSubmit.hidden = !isLastStep;
    feedback.textContent = "";
    feedback.className = "form-feedback";
  }

  function validateCurrentStep() {
    var activeStep = steps[currentStep];
    var inputs = activeStep.querySelectorAll("input[required], select[required]");
    for (var i = 0; i < inputs.length; i++) {
      if (!inputs[i].checkValidity()) { inputs[i].reportValidity(); return false; }
    }
    var pwd = document.getElementById("password");
    var pwdConfirm = document.getElementById("password-confirm");
    if (pwd && pwdConfirm && pwd.value && pwdConfirm.value && pwd.value !== pwdConfirm.value) {
      feedback.className = "form-feedback feedback-error";
      feedback.textContent = "Les deux mots de passe ne correspondent pas.";
      return false;
    }
    return true;
  }

  btnNext.addEventListener("click", function () {
    if (!validateCurrentStep()) { return; }
    currentStep++;
    renderStep();
  });

  btnBack.addEventListener("click", function () {
    currentStep--;
    renderStep();
  });

  var avatarInput = document.getElementById("avatar-input");
  var avatarImg = document.getElementById("avatar-img");
  var avatarPlaceholder = document.getElementById("avatar-placeholder");

  avatarInput.addEventListener("change", function () {
    var file = avatarInput.files && avatarInput.files[0];
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function (evt) {
      avatarImg.src = evt.target.result;
      avatarImg.hidden = false;
      avatarPlaceholder.hidden = true;
    };
    reader.readAsDataURL(file);
  });

  /* ---- Soumission : on appelle maintenant le vrai serveur au lieu du localStorage ---- */
  form.addEventListener("submit", function (evt) {
    evt.preventDefault();
    if (!validateCurrentStep()) { return; }

    var payload = {
      username: document.getElementById("username").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
      faculty: document.getElementById("faculty").selectedOptions[0]
        ? document.getElementById("faculty").selectedOptions[0].textContent
        : "",
      major: document.getElementById("major").value.trim(),
      avatar: avatarImg.hidden ? null : avatarImg.src
    };

    feedback.className = "form-feedback";
    feedback.textContent = "Création de ton compte…";
    btnSubmit.disabled = true;

    fetch(API_BASE + "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || !result.data.success) {
          feedback.className = "form-feedback feedback-error";
          feedback.textContent = result.data.message || "Une erreur est survenue.";
          btnSubmit.disabled = false;
          return;
        }

        // On garde une trace de "qui est connecté" dans ce navigateur.
        // Les VRAIES données du compte, elles, vivent désormais sur le serveur.
        var sessionSaved = false;
        try {
          window.localStorage.setItem("campusdeal-session", JSON.stringify(result.data.user));
          sessionSaved = true;
        } catch (e) { sessionSaved = false; }

        if (!sessionSaved) {
          feedback.className = "form-feedback feedback-error";
          feedback.textContent = "Compte créé, mais impossible de garder la session dans ce navigateur (mémoire pleine). Tape localStorage.clear() dans la console (F12), puis reconnecte-toi.";
          btnSubmit.disabled = false;
          return;
        }

        feedback.className = "form-feedback feedback-success";
        feedback.textContent = "Bienvenue, " + result.data.user.username + " ! Ton compte est créé.";

        window.setTimeout(function () { window.location.href = "profile.html"; }, 900);
      })
      .catch(function () {
        feedback.className = "form-feedback feedback-error";
        feedback.textContent = "Impossible de joindre le serveur. Vérifie qu'il est bien lancé (npm start).";
        btnSubmit.disabled = false;
      });
  });

  renderStep();
})();
