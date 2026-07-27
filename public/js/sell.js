(function () {
  "use strict";

  // Il faut être connecté pour publier une annonce
  var session = null;
  try { session = JSON.parse(window.localStorage.getItem("campusdeal-session") || "null"); } catch (e) { session = null; }

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  // Mode édition si l'URL contient ?edit=123 (id de l'annonce à modifier)
  var params = new URLSearchParams(window.location.search);
  var editId = params.get("edit");
  var isEditMode = !!editId;

  var MAX_PHOTOS = 5;
  var photos = [];

  var form = document.getElementById("sell-form");
  var feedback = document.getElementById("sell-feedback");
  var photoGrid = document.getElementById("photo-grid");
  var photoInput = document.getElementById("photo-input");
  var photoAddSlot = document.getElementById("photo-add-slot");
  var submitBtn = document.getElementById("submit-btn");

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
  var descriptionInput = document.getElementById("item-description");
  var categoryInput = document.getElementById("item-category");
  var conditionInput = document.getElementById("item-condition");
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

  /* ---- Si on est en mode édition, on va chercher l'annonce existante et on pré-remplit tout ---- */
  if (isEditMode) {
    document.getElementById("page-eyebrow").textContent = "Modifier l'annonce";
    document.getElementById("page-title").textContent = "Modifie ton article";
    document.getElementById("page-subtitle").textContent = "Change ce que tu veux, puis enregistre.";
    submitBtn.textContent = "Enregistrer les modifications";

    fetch(API_BASE + "/listings/" + editId)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var item = data.listing;
        if (!item || String(item.sellerId) !== String(session.id)) {
          feedback.className = "form-feedback feedback-error";
          feedback.textContent = "Tu ne peux modifier que tes propres annonces.";
          submitBtn.disabled = true;
          return;
        }

        titleInput.value = item.title;
        descriptionInput.value = item.description || "";
        categoryInput.value = item.category;
        conditionInput.value = item.condition;
        priceInput.value = item.price;
        document.querySelector('input[name="negotiable"][value="' + (item.negotiable ? "negotiable" : "fixed") + '"]').checked = true;

        photos = item.photos || [];
        renderPhotoGrid();
        updatePreview();
      });
  }

  /* ---- Soumission : POST (nouvelle annonce) ou PUT (modification) ---- */
  form.addEventListener("submit", function (evt) {
    evt.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    var payload = {
      sellerId: session.id,
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      category: categoryInput.value,
      condition: conditionInput.value,
      price: Number(priceInput.value),
      negotiable: document.querySelector('input[name="negotiable"]:checked').value === "negotiable",
      photos: photos
    };

    feedback.className = "form-feedback";
    feedback.textContent = isEditMode ? "Enregistrement en cours…" : "Publication en cours…";
    submitBtn.disabled = true;

    var url = isEditMode ? API_BASE + "/listings/" + editId : API_BASE + "/listings";
    var method = isEditMode ? "PUT" : "POST";

    fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || !result.data.success) {
          feedback.className = "form-feedback feedback-error";
          feedback.textContent = result.data.message || "Échec de l'enregistrement.";
          submitBtn.disabled = false;
          return;
        }
        feedback.className = "form-feedback feedback-success";
        feedback.textContent = isEditMode ? "Annonce mise à jour !" : "Annonce publiée !";
        var redirectTo = isEditMode ? "listing.html?id=" + editId : "profile.html";
        window.setTimeout(function () { window.location.href = redirectTo; }, 900);
      })
      .catch(function () {
        feedback.className = "form-feedback feedback-error";
        feedback.textContent = "Impossible de joindre le serveur. Vérifie qu'il est bien lancé (npm start).";
        submitBtn.disabled = false;
      });
  });

  renderPhotoGrid();
  updatePreview();
})();
