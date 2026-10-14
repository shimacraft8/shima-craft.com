const openButton = document.getElementById("craft-menu-button");
const craftDialog = document.getElementById("craft-dialog");
openButton.addEventListener("click", () => craftDialog.showModal());
craftDialog.addEventListener("close", () => openButton.focus({ preventScroll: true }));
