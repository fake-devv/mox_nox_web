const calendar = document.getElementById('lifeCalendar');

document.getElementById('generateButton').addEventListener('click', async () => {
  clearCalendar();

  const dob = document.getElementById('date_of_birth').value;
  const country = document.getElementById('countrySelector').value;
  const unit = document.getElementById('unitSelector').value;

  if (!dob) {
    alert('Please enter date of birth');
    return;
  }

  const lifeExpectancyYears = await getLifeExpectancy(country);
  const livedDays = getLivedDays(dob);
  const totalDays = Math.floor(lifeExpectancyYears * 365.25);

  renderCalendar(livedDays, totalDays, unit);
});

function renderCalendar(livedDays, totalDays, unit) {
  let livedUnits, totalUnits, columns;

  switch (unit) {
    case 'days':
      livedUnits = livedDays;
      totalUnits = totalDays;
      columns = 60;
      break;
    case 'years':
      livedUnits = livedDays / 365.25;
      totalUnits = totalDays / 365.25;
      columns = 25;
      break;
    default:
      livedUnits = livedDays / 7;
      totalUnits = totalDays / 7;
      columns = 52;
  }

  calendar.style.gridTemplateColumns = `repeat(${columns}, 12px)`;

  for (let i = 0; i < Math.floor(totalUnits); i++) {
    const cell = document.createElement('div');
    cell.className = 'cell ' + (i < livedUnits ? 'lived' : 'remaining');
    calendar.appendChild(cell);
  }
}

function getLivedDays(dobString) {
  const [day, month, year] = dobString.split('-').map(Number);
  const dob = new Date(year, month - 1, day);
  const today = new Date();
  return Math.floor((today - dob) / (1000 * 60 * 60 * 24));
}

async function getLifeExpectancy(country) {
  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${country}/indicator/SP.DYN.LE00.IN?format=json`
    );
    const data = await res.json();
    for (const row of data[1]) {
      if (row.value !== null) return Math.round(row.value);
    }
  } catch {}
  return 70;
}

function clearCalendar() {
  calendar.innerHTML = '';
}