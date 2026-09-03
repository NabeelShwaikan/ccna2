(() => {
  "use strict";

  const disabledCards = document.querySelectorAll(".card.disabled");

  disabledCards.forEach((card) => {
    card.setAttribute("tabindex", "-1");
  });
})();
