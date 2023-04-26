let console = {};

document.addEventListener("DOMContentLoaded", () => {
  console = document.getElementById("console").children.item(0);
});

export default (txt) => {
  console.innerText = `${console.innerText}\n${txt}`.trim();
};
