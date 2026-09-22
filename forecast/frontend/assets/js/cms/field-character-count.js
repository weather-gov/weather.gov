const appendCharCounter = (wrapperArea) => {
  // check if counter already present
  if (wrapperArea.querySelector(".wx-char-count-wrapper")) return;

  const textArea = wrapperArea.querySelector("textarea, input");

  const maxLength = textArea.getAttribute("maxlength");
  const maxLengthInt = maxLength ? parseInt(maxLength) : 0;

  const wrapperDiv = document.createElement("div");
  wrapperDiv.className = "wx-char-count-wrapper";

  const srSpan = document.createElement("span");
  srSpan.textContent = "Character count:";
  srSpan.className = "w-sr-only";

  const currentLengthSpan = document.createElement("span");
  currentLengthSpan.className = "wx-char-count-current";
  currentLengthSpan.innerHTML = textArea.value?.length
    ? textArea.value?.length
    : 0;
  wrapperDiv.append(srSpan, currentLengthSpan);

  if (maxLengthInt) {
    const maxLengthSpan = document.createElement("span");
    maxLengthSpan.className = "wx-char-count-max";
    maxLengthSpan.textContent = `/${maxLengthInt}`;
    wrapperDiv.append(maxLengthSpan);
  }

  textArea.insertAdjacentElement("afterend", wrapperDiv);
  if (!textArea.hasAttribute("wx-watch-char-count")) {
    textArea.addEventListener("input", watchCharCount);
    textArea.setAttribute("wx-watch-char-count", true);
  }
};

const watchCharCount = (e) => {
  const newLength = e.currentTarget?.value?.length ?? 0;
  e.currentTarget.nextElementSibling.querySelector(
    ".wx-char-count-current",
  ).innerHTML = newLength;
};

document.addEventListener("DOMContentLoaded", (e) => {
  document.querySelectorAll("div[wx-char-counter]")?.forEach(appendCharCounter);
});

document.addEventListener("w-formset:added", (e) => {
  appendCharCounter(e.target);
});
