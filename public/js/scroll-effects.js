(function () {
  "use strict";

  /* ---------------------------------------------------------
     1) PARALLAXE "3D" DE L'ARRIÈRE-PLAN DU HERO
     À chaque défilement, on déplace et on agrandit légèrement
     l'image de fond à une vitesse différente du contenu texte.
     C'est cette différence de vitesse qui crée l'illusion de
     profondeur (effet 3D), au lieu qu'image et texte défilent
     ensemble comme sur une simple page.
     --------------------------------------------------------- */
  var bg = document.querySelector(".hero-bg");
  if (bg) {
    var ticking = false;

    function updateParallax() {
      var y = window.scrollY;
      // Le déplacement est PLAFONNÉ (Math.min) : même si tu défiles très loin,
      // l'image ne sort jamais du cadre — elle bouge un peu, puis se stabilise.
      var translateY = Math.min(y * 0.12, 70);
      var scale = 1 + Math.min(y, 900) / 4500;   // zoom léger et lui aussi plafonné
      bg.style.transform = "translateY(" + translateY + "px) scale(" + scale + ")";
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });

    updateParallax();
  }

  /* ---------------------------------------------------------
     2) APPARITION DES SECTIONS AU DÉFILEMENT
     On observe chaque élément marqué ".reveal". Dès qu'il entre
     dans l'écran, on lui ajoute la classe "is-visible", ce qui
     déclenche la transition CSS (fondu + léger glissement).
     --------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target); // une fois visible, plus besoin de le surveiller
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -10% 0px" });
    // rootMargin décale la zone de déclenchement vers le haut : la section
    // s'anime un peu avant d'atteindre le bas de l'écran, plus naturel à l'œil.

    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    // Navigateur trop ancien pour IntersectionObserver : on affiche tout directement
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }
})();
