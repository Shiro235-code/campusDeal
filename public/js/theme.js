(function () {
  "use strict";
  var THEME_KEY = "campusdeal-theme";
  var TEXTSIZE_KEY = "campusdeal-textsize";
  var body = document.body;
  var html = document.documentElement;

  /* ---- Thème (clair/sombre) ---- */
  var savedTheme = null;
  try { savedTheme = window.localStorage.getItem(THEME_KEY); } catch (e) { /* stockage indisponible */ }
  if (savedTheme === "light" || savedTheme === "dark") {
    body.setAttribute("data-theme", savedTheme);
  }

  var roundToggle = document.getElementById("theme-toggle");

  function syncRoundToggleState() {
    if (!roundToggle) { return; }
    var isLight = body.getAttribute("data-theme") === "light";
    roundToggle.setAttribute("aria-pressed", String(isLight));
    roundToggle.setAttribute("aria-label", isLight ? "Activer le mode sombre" : "Activer le mode clair");
  }
  syncRoundToggleState();

  function toggleTheme() {
    var isLight = body.getAttribute("data-theme") === "light";
    var next = isLight ? "dark" : "light";
    body.setAttribute("data-theme", next);
    try { window.localStorage.setItem(THEME_KEY, next); } catch (e) { /* stockage indisponible */ }
    syncRoundToggleState();
    syncSettingsLabels();
  }

  if (roundToggle) { roundToggle.addEventListener("click", toggleTheme); }

  /* ---- Taille du texte (normale/grande) ---- */
  var savedTextSize = null;
  try { savedTextSize = window.localStorage.getItem(TEXTSIZE_KEY); } catch (e) { /* stockage indisponible */ }
  if (savedTextSize === "large") { html.classList.add("text-large"); }

  function toggleTextSize() {
    var isLarge = html.classList.toggle("text-large");
    try { window.localStorage.setItem(TEXTSIZE_KEY, isLarge ? "large" : "normal"); } catch (e) { /* stockage indisponible */ }
    syncSettingsLabels();
  }

  /* ---- Boutons du menu "Paramètres" ----
     On utilise des CLASSES plutôt que des identifiants uniques, pour pouvoir
     avoir le même bouton à deux endroits (menu desktop ET menu mobile) sans
     conflit — un id ne peut exister qu'une seule fois par page. */
  var themeButtons = document.querySelectorAll(".theme-toggle-action");
  var themeLabels = document.querySelectorAll(".theme-toggle-label");
  var textSizeButtons = document.querySelectorAll(".textsize-toggle-action");
  var textSizeLabels = document.querySelectorAll(".textsize-toggle-label");

  function syncSettingsLabels() {
    var themeText = body.getAttribute("data-theme") === "light" ? "Clair" : "Sombre";
    var sizeText = html.classList.contains("text-large") ? "Grande" : "Normale";
    themeLabels.forEach(function (el) { el.textContent = themeText; });
    textSizeLabels.forEach(function (el) { el.textContent = sizeText; });
  }
  syncSettingsLabels();

  themeButtons.forEach(function (btn) { btn.addEventListener("click", toggleTheme); });
  textSizeButtons.forEach(function (btn) { btn.addEventListener("click", toggleTextSize); });
})();
