(function () {
  "use strict";

  // Il faut être connecté pour publier une annonce
  var session = null;
  try { session = JSON.parse(window.localStorage.getItem("campusdeal-session") || "null"); } catch (e) { session = null; }

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  var MAX_PHOTOS = 5;
  var photos = [];

  var form = document.getElementById("sell-form");
  var feedback = document.getElementById("sell-feedback");
  var photoGrid = document.getElementById("photo-grid");
  var photoInput = document.getElementById("photo-input");
  var photoAddSlot = document.getElementById("photo-add-slot");

  photoInput.addEventListener("change", function () {
    var files = Array.prototype.slice.call(photoInput.files || []);
    files.forEach(function (file) {
      if (photos.length >= MAX_PHOTOS) { return; }
      var reader = new FileReader();
      reader.onload = function (evt) {
        photos.push(evt.target.result);
        renderPhotoGrid();
        updatePreview();
      };
      reader.readAsDataURL(file);
    });
    photoInput.value = "";
  });

  function removePhoto(index) {
    photos.splice(index, 1);
    renderPhotoGrid();
    updatePreview();
  }

  function renderPhotoGrid() {
    Array.prototype.slice.call(photoGrid.querySelectorAll(".photo-thumb")).forEach(function (el) { el.remove(); });
    photos.forEach(function (src, index) {
      var thumb = document.createElement("div");
      thumb.className = "photo-thumb";
      thumb.innerHTML = '<img src="' + src + '" alt=""><button type="button" class="photo-remove" aria-label="Retirer cette photo">&times;</button>';
      thumb.querySelector(".photo-remove").addEventListener("click", function () { removePhoto(index); });
      photoGrid.insertBefore(thumb, photoAddSlot);
    });
    photoAddSlot.style.display = photos.length >= MAX_PHOTOS ? "none" : "flex";
  }

  var titleInput = document.getElementById("item-title");
  var priceInput = document.getElementById("item-price");
  var negotiableRadios = document.querySelectorAll('input[name="negotiable"]');

  function updatePreview() {
    document.getElementById("preview-title").textContent = titleInput.value.trim() || "Titre de ton article";
    var price = priceInput.value ? Number(priceInput.value).toLocaleString("fr-FR") + " FCFA" : "— FCFA";
    document.getElementById("preview-price").textContent = price;
    var negotiableValue = document.querySelector('input[name="negotiable"]:checked').value;
    document.getElementById("preview-negotiable").textContent = negotiableValue === "negotiable" ? "Négociable" : "Prix fixe";
    var previewImage = document.getElementById("preview-image");
    previewImage.innerHTML = photos.length
      ? '<img src="' + photos[0] + '" alt="" style="width:100%;height:100%;object-fit:cover;">'
      : "🛍️";
  }

  titleInput.addEventListener("input", updatePreview);
  priceInput.addEventListener("input", updatePreview);
  negotiableRadios.forEach(function (r) { r.addEventListener("change", updatePreview); });

  /* ---- Soumission : POST vers le vrai serveur ---- */
  form.addEventListener("submit", function (evt) {
    evt.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    var payload = {
      sellerId: session.id,
      title: titleInput.value.trim(),
      description: document.getElementById("item-description").value.trim(),
      category: document.getElementById("item-category").value,
      condition: document.getElementById("item-condition").value,
      price: Number(priceInput.value),
      negotiable: document.querySelector('input[name="negotiable"]:checked').value === "negotiable",
      photos: photos
    };

    feedback.className = "form-feedback";
    feedback.textContent = "Publication en cours…";

    fetch(API_BASE + "/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || !result.data.success) {
          feedback.className = "form-feedback feedback-error";
          feedback.textContent = result.data.message || "Échec de la publication.";
          return;
        }
        feedback.className = "form-feedback feedback-success";
        feedback.textContent = "Annonce publiée !";
        window.setTimeout(function () { window.location.href = "profile.html"; }, 900);
      })
      .catch(function () {
        feedback.className = "form-feedback feedback-error";
        feedback.textContent = "Impossible de joindre le serveur. Vérifie qu'il est bien lancé (npm start).";
      });
  });

  renderPhotoGrid();
  updatePreview();
})();
