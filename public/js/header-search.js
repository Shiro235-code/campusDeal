// Rend fonctionnelle la barre de recherche du menu "Recherche" de l'en-tête,
// présente sur plusieurs pages. Au lieu de dupliquer ce code partout,
// on le centralise ici.
(function () {
  "use strict";
  var form = document.querySelector(".nav-search-form");
  if (!form) { return; }

  form.addEventListener("submit", function (evt) {
    evt.preventDefault();
    var query = form.querySelector("input").value.trim();
    var url = "articles.html" + (query ? "?search=" + encodeURIComponent(query) : "");
    window.location.href = url;
  });
})();
