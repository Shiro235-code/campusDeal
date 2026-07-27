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

  /* ---- Boutons du menu "Paramètres" (présents seulement sur certaines pages) ---- */
  var settingsThemeBtn = document.getElementById("settings-theme-toggle");
  var settingsThemeLabel = document.getElementById("settings-theme-label");
  var settingsTextSizeBtn = document.getElementById("settings-textsize-toggle");
  var settingsTextSizeLabel = document.getElementById("settings-textsize-label");

  function syncSettingsLabels() {
    if (settingsThemeLabel) {
      settingsThemeLabel.textContent = body.getAttribute("data-theme") === "light" ? "Clair" : "Sombre";
    }
    if (settingsTextSizeLabel) {
      settingsTextSizeLabel.textContent = html.classList.contains("text-large") ? "Grande" : "Normale";
    }
  }
  syncSettingsLabels();

  if (settingsThemeBtn) { settingsThemeBtn.addEventListener("click", toggleTheme); }
  if (settingsTextSizeBtn) { settingsTextSizeBtn.addEventListener("click", toggleTextSize); }
})();
