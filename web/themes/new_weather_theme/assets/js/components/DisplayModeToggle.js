const displayToggleButtons = document.querySelectorAll(".wx-display-mode-selector .usa-button-group__item > button");

const TABLE = "table";
 
const handleDisplayToggle = (e) => {
  const targetButton = e.target;
  const parentGroup = e.target.parentNode.parentNode;
  const detailsContainer = parentGroup.parentNode; 
  const tableElement = detailsContainer.querySelector("wx-hourly-table");
  const chartsContainer = detailsContainer.querySelector(".wx-charts-container")
  const qpfTable = detailsContainer.querySelector(".wx-qpf-table-wrapper");
  const qpfChart = detailsContainer.querySelector(".wx-qpf-chart-wrapper");
  if (targetButton.value !== detailsContainer.dataset.displayMode) {
    const otherButton = parentGroup.querySelector(`button[value=${detailsContainer.dataset.displayMode}]`);
    otherButton.classList.add("usa-button--outline");
    targetButton.classList.remove("usa-button--outline");
    detailsContainer.dataset.displayMode = targetButton.value;

    if (targetButton.value === TABLE) {
       tableElement.classList.remove("display-none");
       qpfTable.classList.remove("display-none");
       chartsContainer.classList.add("display-none");
       qpfChart.classList.add("display-none");
    }
    else {
       tableElement.classList.add("display-none");
       qpfTable.classList.add("display-none");
       chartsContainer.classList.remove("display-none");
       qpfChart.classList.remove("display-none");
    }
  }
}

displayToggleButtons.forEach((displayButton) => 
  { displayButton.addEventListener("click", handleDisplayToggle)}
);

