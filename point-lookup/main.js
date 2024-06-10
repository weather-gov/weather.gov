import Formatter from "https://unpkg.com/json-formatter-js@2.5.11/dist/json-formatter.mjs";

const main = async () => {
  document.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    alert("hi");
    // const f = new Formatter(js);

    // document.body.appendChild(f.render());
  });
};
main();
