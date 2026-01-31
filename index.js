/* ---------- DOM ---------- */

const DOM = {
  calendar: document.getElementById('lifeCalendar'),
  generateBtn: document.getElementById('generateButton'),
  dobInput: document.getElementById('date_of_birth'),
  countrySelect: document.getElementById('countrySelector'),
  unitSelect: document.getElementById('unitSelector'),

  eventDate: document.getElementById('eventDate'),
  eventLabel: document.getElementById('eventLabel'),
  addEventBtn: document.getElementById('addEventBtn')
};

/* ---------- CONSTANTS ---------- */

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_IN_YEAR = 365.25;

/* ---------- STATE ---------- */

const lifeEvents = [];

/* ---------- EVENTS ---------- */

DOM.generateBtn.addEventListener('click', handleGenerate);
DOM.addEventBtn.addEventListener('click', handleAddEvent);

/* ---------- MAIN ---------- */

async function handleGenerate() {
  clearCalendar();

  const dobString = DOM.dobInput.value.trim();
  if (!isValidDOB(dobString)) {
    alert('Please enter a valid date of birth (dd-MM-YYYY)');
    return;
  }

  const dob = parseDate(dobString);
  const unit = DOM.unitSelect.value;
  const country = DOM.countrySelect.value;

  const expectancyYears = await fetchLifeExpectancy(country);
  const livedDays = getDaysBetween(dob, new Date());
  const totalDays = Math.floor(expectancyYears * DAYS_IN_YEAR);

  renderCalendar({
    livedDays,
    totalDays,
    unit,
    dob
  });
}

/* ---------- EVENT ADDER ---------- */

function handleAddEvent() {
  const date = DOM.eventDate.value;
  const label = DOM.eventLabel.value.trim();

  if (!date || !label) {
    alert('Please enter both event date and description');
    return;
  }

  lifeEvents.push({ date, label });

  DOM.eventDate.value = '';
  DOM.eventLabel.value = '';

  // Re-render if calendar already exists
  if (DOM.calendar.children.length > 0) {
    DOM.generateBtn.click();
  }
}

/* ---------- CALENDAR ---------- */

function renderCalendar({ livedDays, totalDays, unit, dob }) {
  const { livedUnits, totalUnits, columns } =
    getUnitConfig(livedDays, totalDays, unit);

  DOM.calendar.style.gridTemplateColumns = `repeat(${columns}, 12px)`;

  const fragment = document.createDocumentFragment();
  const eventMap = buildEventMap(dob, unit);

  for (let i = 0; i < totalUnits; i++) {
    const cell = createCell(i < livedUnits);

    if (eventMap.has(i)) {
      cell.classList.add('event');
      cell.dataset.tooltip = eventMap.get(i);
    }

    fragment.appendChild(cell);
  }

  DOM.calendar.appendChild(fragment);
}

function getUnitConfig(livedDays, totalDays, unit) {
  switch (unit) {
    case 'days':
      return {
        livedUnits: livedDays,
        totalUnits: totalDays,
        columns: 60
      };

    case 'years':
      return {
        livedUnits: livedDays / DAYS_IN_YEAR,
        totalUnits: totalDays / DAYS_IN_YEAR,
        columns: 25
      };

    default: // weeks
      return {
        livedUnits: livedDays / 7,
        totalUnits: totalDays / 7,
        columns: 52
      };
  }
}

function createCell(isLived) {
  const cell = document.createElement('div');
  cell.className = `cell ${isLived ? 'lived' : 'remaining'}`;
  return cell;
}

function clearCalendar() {
  DOM.calendar.innerHTML = '';
}

/* ---------- EVENTS MAPPING ---------- */

function buildEventMap(dob, unit) {
  const map = new Map();

  lifeEvents.forEach(ev => {
    const index = getUnitIndex(dob, new Date(ev.date), unit);
    if (index >= 0) {
      map.set(index, ev.label);
    }
  });

  return map;
}

function getUnitIndex(dob, eventDate, unit) {
  const diffDays = getDaysBetween(dob, eventDate);

  switch (unit) {
    case 'days':
      return diffDays;
    case 'years':
      return Math.floor(diffDays / DAYS_IN_YEAR);
    default:
      return Math.floor(diffDays / 7);
  }
}

/* ---------- DATE UTILS ---------- */

function parseDate(dateString) {
  const [day, month, year] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getDaysBetween(from, to) {
  return Math.floor((to - from) / MS_PER_DAY);
}

function isValidDOB(dobString) {
  const [day, month, year] = dobString.split('-').map(Number);

  if (
    !day || !month || !year ||
    year < 1900 ||
    month < 1 || month > 12 ||
    day < 1 || day > daysInMonth(month, year)
  ) {
    return false;
  }

  return parseDate(dobString) < new Date();
}

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/* ---------- API ---------- */

async function fetchLifeExpectancy(country) {
  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${country}/indicator/SP.DYN.LE00.IN?format=json`
    );

    const data = await res.json();
    for (const row of data?.[1] || []) {
      if (row.value !== null) {
        return Math.round(row.value);
      }
    }
  } catch (err) {
    console.warn('Life expectancy fetch failed:', err);
  }

  return 70;
}