(function () {
  "use strict";

  var loginSection = document.getElementById("admin-login");
  var dashboardSection = document.getElementById("admin-dashboard");
  var loginForm = document.getElementById("admin-login-form");
  var loginFeedback = document.getElementById("admin-login-feedback");
  var requestsList = document.getElementById("requests-list");
  var requestsEmpty = document.getElementById("requests-empty");

  var adminKey = null;
  try { adminKey = window.sessionStorage.getItem("campusdeal-admin-key"); } catch (e) { adminKey = null; }

  if (adminKey) { showDashboard(); }

  loginForm.addEventListener("submit", function (evt) {
    evt.preventDefault();
    var key = document.getElementById("admin-key").value;

    // On teste la clé directement sur une vraie requête protégée : si ça marche, elle est bonne.
    fetch(API_BASE + "/admin/certifications", { headers: { "x-admin-key": key } })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) {
          loginFeedback.className = "form-feedback feedback-error";
          loginFeedback.textContent = "Clé incorrecte.";
          return;
        }
        adminKey = key;
        try { window.sessionStorage.setItem("campusdeal-admin-key", key); } catch (e) { /* ignore */ }
        showDashboard();
      });
  });

  function showDashboard() {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    loadRequests();
  }

  function loadRequests() {
    fetch(API_BASE + "/admin/certifications?status=pending", { headers: { "x-admin-key": adminKey } })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var requests = data.requests || [];
        requestsList.innerHTML = "";
        requestsEmpty.hidden = requests.length > 0;

        requests.forEach(function (r) {
          var card = document.createElement("div");
          card.className = "profile-section";

          var proofHtml = r.proof_type === "email"
            ? "<p><strong>Email universitaire fourni :</strong> " + r.proof_email + "</p>"
            : '<p><strong>Carte d\'étudiant :</strong></p><img src="' + r.proof_image + '" alt="" style="max-width:280px; border-radius:8px; margin-top:8px;">';

          card.innerHTML =
            "<p style=\"font-weight:600; margin-bottom:8px;\">" + r.username + " (" + r.email + ")</p>" +
            proofHtml +
            '<div style="display:flex; gap:10px; margin-top:14px;">' +
              '<button type="button" class="btn btn-primary btn-approve">✓ Approuver</button>' +
              '<button type="button" class="btn btn-ghost btn-reject">✗ Refuser</button>' +
            "</div>";

          card.querySelector(".btn-approve").addEventListener("click", function () {
            reviewRequest(r.id, "approve");
          });
          card.querySelector(".btn-reject").addEventListener("click", function () {
            reviewRequest(r.id, "reject");
          });

          requestsList.appendChild(card);
        });
      });
  }

  function reviewRequest(id, action) {
    fetch(API_BASE + "/admin/certifications/" + id + "/" + action, {
      method: "POST",
      headers: { "x-admin-key": adminKey }
    })
      .then(function (res) { return res.json(); })
      .then(function () { loadRequests(); });
  }
})();
