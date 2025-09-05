const monthYear = document.getElementById("month-year");
const daysContainer = document.getElementById("calendar-days");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

const fontSelect = document.getElementById("fontSelect");
const bgThumbs = document.querySelectorAll(".bg-thumb");
const bgUpload = document.getElementById("bgUpload");
const restoreDefaults = document.getElementById("restoreDefaults");
const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

let date = new Date();
let currentMonth = date.getMonth();
let currentYear = date.getFullYear();

function renderCalendar(month, year) {
  daysContainer.innerHTML = "";
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();

  monthYear.textContent = `${months[month]} ${year}`;

  // Previous month inactive days
  for (let x = firstDay; x > 0; x--) {
    const day = document.createElement("div");
    day.classList.add("inactive");
    day.textContent = prevLastDate - x + 1;
    daysContainer.appendChild(day);
  }

  // Current month days
  for (let i = 1; i <= lastDate; i++) {
    const day = document.createElement("div");
    day.textContent = i;
    if (
      i === date.getDate() &&
      month === date.getMonth() &&
      year === date.getFullYear()
    ) {
      day.classList.add("today");
    }
    daysContainer.appendChild(day);
  }

  // Next month inactive days
  const totalCells = daysContainer.children.length;
  const nextDays = 7 - (totalCells % 7);
  if (nextDays < 7) {
    for (let j = 1; j <= nextDays; j++) {
      const day = document.createElement("div");
      day.classList.add("inactive");
      day.textContent = j;
      daysContainer.appendChild(day);
    }
  }
}

// Navigation
prevBtn.addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar(currentMonth, currentYear);
});

nextBtn.addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentMonth, currentYear);
});

// Change Font
fontSelect.addEventListener("change", (e) => {
  document.body.style.fontFamily = e.target.value;
});

// Change Background from thumbnails
bgThumbs.forEach((thumb) => {
  thumb.addEventListener("click", () => {
    document.body.style.backgroundImage = `url(${thumb.src})`;
  });
});

// Upload Custom Background
bgUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      document.body.style.backgroundImage = `url(${reader.result})`;
    };
    reader.readAsDataURL(file);
  }
});

// Restore Defaults
restoreDefaults.addEventListener("click", () => {
  document.body.style.backgroundImage =
    "url('https://source.unsplash.com/1920x1080/?beach,sunset')";
  document.body.style.fontFamily = "Poppins, sans-serif";
  fontSelect.value = "Poppins";
});

// Toggle Settings Panel
settingsBtn.addEventListener("click", () => {
  settingsPanel.style.display =
    settingsPanel.style.display === "flex" ? "none" : "flex";
});

renderCalendar(currentMonth, currentYear);
