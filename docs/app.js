const state = {
  data: null,
  view: 'today',
  level: 'All',
  category: 'All',
  search: '',
  selectedDay: new Date().getDay(),
  done: loadJson('p45.done', {}),
  checklist: loadJson('p45.checklist', {}),
  journal: loadJson('p45.journal', []),
};

const checklistItems = [
  'Warm-up ครบ',
  'คุณภาพท่าดี',
  'หยุดเมื่อความเร็วตก',
  'Cool-down หรือ mobility',
  'บันทึก note หลังฝึก',
];

const dayIndexMap = [6, 0, 1, 2, 3, 4, 5];

main();

async function main() {
  state.data = await fetch('data/training-drills.json').then((response) => response.json());
  state.selectedDay = dayIndexMap[new Date().getDay()] ?? 0;
  hydrateControls();
  render();
}

function hydrateControls() {
  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      render();
    });
  });

  document.getElementById('searchInput').addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderDrills();
  });

  document.getElementById('levelFilter').addEventListener('change', (event) => {
    state.level = event.target.value;
    renderLevels();
    renderDrills();
  });

  document.getElementById('categoryFilter').addEventListener('change', (event) => {
    state.category = event.target.value;
    renderDrills();
  });

  document.getElementById('resetToday').addEventListener('click', () => {
    const key = todayKey();
    state.checklist[key] = {};
    saveJson('p45.checklist', state.checklist);
    renderChecklist();
  });

  document.getElementById('saveJournal').addEventListener('click', saveJournal);
  document.getElementById('journalDate').valueAsDate = new Date();

  lucideReady();
}

function render() {
  document.querySelectorAll('.tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === state.view);
  });

  document.querySelectorAll('.view').forEach((section) => section.classList.remove('active'));
  document.getElementById(`${state.view}View`).classList.add('active');

  renderSummary();
  renderCategories();
  renderLevels();
  renderWeek();
  renderToday();
  renderChecklist();
  renderDrills();
  renderJournal();
  lucideReady();
}

function renderSummary() {
  const doneCount = Object.values(state.done).filter(Boolean).length;
  const weekMinutes = state.data.weeklyPlan.reduce((sum, day) => {
    return sum + day.drillIds.reduce((daySum, id) => daySum + (findDrill(id)?.minutes || 0), 0);
  }, 0);

  document.getElementById('totalDrills').textContent = state.data.drills.length;
  document.getElementById('doneCount').textContent = doneCount;
  document.getElementById('weekMinutes').textContent = weekMinutes;
}

function renderLevels() {
  const select = document.getElementById('levelFilter');
  if (select.options.length === 1) {
    state.data.levels.forEach((level) => {
      const option = document.createElement('option');
      option.value = String(level.id);
      option.textContent = `${level.name}: ${level.title} (${level.count})`;
      select.append(option);
    });
  }

  const root = document.getElementById('levelStats');
  root.innerHTML = '';
  state.data.levels.forEach((level) => {
    const button = document.createElement('button');
    button.className = `category-pill level-pill ${state.level === String(level.id) ? 'active' : ''}`;
    button.type = 'button';
    button.innerHTML = `<strong>${level.name}: ${escapeHtml(level.title)}</strong><span>${level.count} drills · ${escapeHtml(level.description)}</span>`;
    button.addEventListener('click', () => {
      state.level = String(level.id);
      state.category = 'All';
      select.value = state.level;
      document.getElementById('categoryFilter').value = 'All';
      state.view = 'library';
      render();
    });
    root.append(button);
  });
}

function renderCategories() {
  const select = document.getElementById('categoryFilter');
  if (select.options.length === 1) {
    state.data.categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.name;
      option.textContent = `${category.name} (${category.count})`;
      select.append(option);
    });
  }

  const root = document.getElementById('categoryStats');
  root.innerHTML = '';
  state.data.categories.forEach((category) => {
    const button = document.createElement('button');
    button.className = 'category-pill';
    button.type = 'button';
    button.innerHTML = `<strong>${category.name}</strong><span>${category.count} videos</span>`;
    button.addEventListener('click', () => {
      state.category = category.name;
      state.level = 'All';
      select.value = category.name;
      document.getElementById('levelFilter').value = 'All';
      state.view = 'library';
      render();
    });
    root.append(button);
  });
}

function renderWeek() {
  const root = document.getElementById('weekStrip');
  root.innerHTML = '';

  state.data.weeklyPlan.forEach((day, index) => {
    const minutes = day.drillIds.reduce((sum, id) => sum + (findDrill(id)?.minutes || 0), 0);
    const button = document.createElement('button');
    button.className = `day-button ${index === state.selectedDay ? 'active' : ''}`;
    button.type = 'button';
    button.innerHTML = `<strong>${day.day}</strong><span>${day.title} · ${minutes} min</span>`;
    button.addEventListener('click', () => {
      state.selectedDay = index;
      renderToday();
      renderChecklist();
      renderWeek();
    });
    root.append(button);
  });
}

function renderToday() {
  const day = state.data.weeklyPlan[state.selectedDay];
  document.getElementById('todayLabel').textContent = `${day.day}: ${day.title}`;
  const drills = day.drillIds.map(findDrill).filter(Boolean);
  renderCardGrid(document.getElementById('todayPlan'), drills);
}

function renderDrills() {
  const drills = state.data.drills.filter((drill) => {
    const matchesLevel = state.level === 'All' || String(drill.level) === state.level;
    const matchesCategory = state.category === 'All' || drill.category === state.category;
    const haystack = `${drill.name} ${drill.levelName} ${drill.levelTitle} ${drill.category} ${drill.goal} ${drill.caption} ${drill.hashtags.join(' ')}`.toLowerCase();
    const matchesSearch = !state.search || haystack.includes(state.search);
    return matchesLevel && matchesCategory && matchesSearch;
  });

  renderCardGrid(document.getElementById('drillGrid'), drills);
}

function renderCardGrid(root, drills) {
  const template = document.getElementById('drillCardTemplate');
  root.innerHTML = '';

  drills.forEach((drill) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const img = card.querySelector('img');
    const fallback = card.querySelector('.media-fallback');
    const title = card.querySelector('h3');
    const badge = card.querySelector('.badge');
    const levelBadge = card.querySelector('.level-badge');
    const goal = card.querySelector('.goal');
    const meta = card.querySelector('.meta');
    const focus = card.querySelector('.focus');
    const watchLink = card.querySelector('.watch-link');
    const checkButton = card.querySelector('.check-button');
    const gifState = card.querySelector('.gif-state');

    title.textContent = drill.name;
    badge.textContent = drill.category;
    levelBadge.textContent = `L${drill.level}`;
    goal.textContent = drill.goal;
    fallback.textContent = drill.category;
    img.src = drill.gif || drill.thumbnailUrl || '';
    img.alt = drill.name;
    img.addEventListener('error', () => img.classList.add('is-broken'));

    meta.innerHTML = [
      `${drill.levelName}: ${drill.levelTitle}`,
      `${drill.minutes} min`,
      drill.intensity,
      drill.sets,
    ].map((item) => `<span>${escapeHtml(item)}</span>`).join('');

    focus.innerHTML = drill.focus.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    watchLink.href = drill.tiktokUrl;
    gifState.textContent = drill.hasGif ? 'GIF ready' : 'GIF pending';
    gifState.className = `gif-state ${drill.hasGif ? 'ready' : 'pending'}`;

    checkButton.classList.toggle('done', Boolean(state.done[drill.id]));
    checkButton.addEventListener('click', () => {
      state.done[drill.id] = !state.done[drill.id];
      saveJson('p45.done', state.done);
      renderSummary();
      checkButton.classList.toggle('done', Boolean(state.done[drill.id]));
    });

    root.append(card);
  });

  lucideReady();
}

function renderChecklist() {
  const root = document.getElementById('checklist');
  const key = todayKey();
  const values = state.checklist[key] || {};
  root.innerHTML = '';

  checklistItems.forEach((item) => {
    const label = document.createElement('label');
    label.className = 'check-item';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(values[item]);
    input.addEventListener('change', () => {
      state.checklist[key] = state.checklist[key] || {};
      state.checklist[key][item] = input.checked;
      saveJson('p45.checklist', state.checklist);
    });
    label.append(input, document.createTextNode(item));
    root.append(label);
  });
}

function saveJournal() {
  const entry = {
    date: document.getElementById('journalDate').value || new Date().toISOString().slice(0, 10),
    readiness: document.getElementById('readiness').value,
    focus: document.getElementById('journalFocus').value.trim(),
    note: document.getElementById('journalNote').value.trim(),
    savedAt: new Date().toISOString(),
  };

  state.journal = [entry, ...state.journal].slice(0, 30);
  saveJson('p45.journal', state.journal);
  document.getElementById('journalNote').value = '';
  renderJournal();
}

function renderJournal() {
  const root = document.getElementById('journalEntries');
  root.innerHTML = '';

  state.journal.forEach((entry) => {
    const article = document.createElement('article');
    article.className = 'journal-entry';
    article.innerHTML = `
      <strong>${escapeHtml(entry.date)} · ${escapeHtml(entry.readiness)} · ${escapeHtml(entry.focus || 'training')}</strong>
      <p>${escapeHtml(entry.note || 'No note')}</p>
    `;
    root.append(article);
  });
}

function findDrill(id) {
  return state.data.drills.find((drill) => drill.id === id);
}

function todayKey() {
  return `${new Date().toISOString().slice(0, 10)}:${state.selectedDay}`;
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function lucideReady() {
  if (window.lucide) window.lucide.createIcons();
}
