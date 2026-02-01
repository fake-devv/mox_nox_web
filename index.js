/* ---------- DOM ---------- */

const DOM = {
    body: document.body,
    calendar: document.getElementById('lifeCalendar'),
    generateBtn: document.getElementById('generateButton'),
    dobInput: document.getElementById('dobInput'),
    countrySelect: document.getElementById('countrySelector'),
    unitSelect: document.getElementById('unitSelector'),
    secondsValue: document.getElementById('secondsLived'),
    secondsToggle: document.getElementById('secondsModeToggle'),
    secondsTitle: document.getElementById('secondsTitle'),
    eventDate: document.getElementById('eventDate'),
    eventLabel: document.getElementById('eventLabel'),
    addEventBtn: document.getElementById('addEventBtn'),
};

/* ---------- CONSTANTS ---------- */

const MS_PER_DAY = 86400000;
const DAYS_IN_YEAR = 365.25;

/* ---------- STATE ---------- */

const state = {
    dob: null,
    totalSeconds: 0,
    secondsMode: 'lived', // lived | left
    timerId: null,
    events: []
};

/* ---------- EVENTS ---------- */

DOM.generateBtn.addEventListener('click', generate);
DOM.addEventBtn.addEventListener('click', addEvent);
DOM.secondsToggle.addEventListener('change', toggleSecondsMode);

/* ---------- MAIN ---------- */

async function generate() {
    clearCalendar();
    state.dob = new Date(DOM.dobInput.value);
    if(state.dob > new Date()) {
        return alert('If you are from the future, please come back later. 😊');
    }
    // if the age is older than 125 years, alert and return
    const ageInYears = (new Date() - state.dob) / (MS_PER_DAY * DAYS_IN_YEAR);
    if(ageInYears > 125) {
        return alert('I doubt anyone lives that long! and if you do you don\'t need this calendar. 😊');
    }
    const unit = DOM.unitSelect.value;
    const country = DOM.countrySelect.value;

    const expectancy = await fetchLifeExpectancy(country);
    const livedDays = daysBetween(state.dob, new Date());
    const totalDays = Math.floor(expectancy * DAYS_IN_YEAR);

    state.totalSeconds = totalDays * 86400;

    renderCalendar(livedDays, totalDays, unit);
    if (!state.timerId) startTimer();

}

/* ---------- TIMER ---------- */

function startTimer() {
    stopTimer();

    const dobSeconds = Math.floor(state.dob.getTime() / 1000);

    function tick() {
        const now = Math.floor(Date.now() / 1000);
        const lived = now - dobSeconds;

        const value =
            state.secondsMode === 'lived'
                ? lived
                : Math.max(state.totalSeconds - lived, 0);

        DOM.secondsValue.textContent = value.toLocaleString();

        DOM.secondsValue.classList.toggle('danger', state.secondsMode === 'left');
        DOM.secondsValue.classList.add('tick');
        setTimeout(() => DOM.secondsValue.classList.remove('tick'), 120);
    }

    tick();
    state.timerId = setInterval(tick, 1000);
}

function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
}

/* ---------- TOGGLE ---------- */

function toggleSecondsMode() {
    state.secondsMode = DOM.secondsToggle.checked ? 'left' : 'lived';

    DOM.secondsTitle.textContent = state.secondsMode === 'left' ? 'Seconds left' : 'Seconds lived';

    DOM.body.classList.toggle('countdown', state.secondsMode === 'left');

    startTimer();
}

/* ---------- CALENDAR ---------- */

function renderCalendar(livedDays, totalDays, unit) {
    const cfg = unitConfig(livedDays, totalDays, unit);

    const lived = Math.floor(cfg.lived);
    const total = Math.floor(cfg.total);
    const columns = cfg.columns;

    DOM.calendar.style.gridTemplateColumns = `repeat(${columns}, 12px)`;
    const frag = document.createDocumentFragment();

    const eventMap = buildEventMap(unit);

    for (let i = 0; i < total; i++) {
        const cell = document.createElement('div');
        cell.className = `cell ${i < lived ? 'lived' : 'remaining'}`;

        if (i === total - 1) {
            cell.classList.add('final');
            cell.dataset.tooltip = 'End of the road son 😎';
        }

        if (eventMap.has(i)) {
            cell.classList.add('event');
            cell.dataset.tooltip = eventMap.get(i);
        }

        frag.appendChild(cell);
    }

    DOM.calendar.appendChild(frag);
}

function unitConfig(livedDays, totalDays, unit) {
    switch (unit) {
        case 'days':
            return { lived: livedDays, total: totalDays, columns: 60 };
        case 'years':
            return {
                lived: livedDays / DAYS_IN_YEAR,
                total: totalDays / DAYS_IN_YEAR,
                columns: 25
            };
        default:
            return { lived: livedDays / 7, total: totalDays / 7, columns: 52 };
    }
}

/* ---------- EVENTS ---------- */

function addEvent() {
    const date = DOM.eventDate.value;
    const label = DOM.eventLabel.value.trim();

    if (!date || !label) return alert('Event needs date & label');

    state.events.push({ date: new Date(date), label });
    DOM.eventDate.value = DOM.eventLabel.value = '';

    generate();
}

function buildEventMap(unit) {
    const map = new Map();

    state.events.forEach(ev => {
        const days = daysBetween(state.dob, ev.date);
        const index =
            unit === 'days' ? days :
                unit === 'years' ? Math.floor(days / DAYS_IN_YEAR) :
                    Math.floor(days / 7);

        if (index >= 0) map.set(index, ev.label);
    });

    return map;
}

/* ---------- UTILS ---------- */

function daysBetween(a, b) {
    return Math.floor((b - a) / MS_PER_DAY);
}

/* ---------- API ---------- */

async function fetchLifeExpectancy(country) {
    try {
        const res = await fetch(
            `https://api.worldbank.org/v2/country/${country}/indicator/SP.DYN.LE00.IN?format=json`
        );
        const data = await res.json();
        for (const row of data?.[1] || []) {
            if (row.value) return Math.round(row.value);
        }
    } catch { }
    return 70;
}

function clearCalendar() {
    DOM.calendar.innerHTML = '';
}