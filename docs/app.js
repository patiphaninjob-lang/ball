const DEFAULT_FAVORITE_LIST_ID = 'default';
const FAVORITE_LISTS_STORAGE_KEY = 'p45.favoriteLists';
const SELECTED_FAVORITE_LIST_STORAGE_KEY = 'p45.selectedFavoriteList';

const state = {
  data: null,
  exercises: null,
  view: 'exercises',
  participant: 'Solo',
  level: 'All',
  category: 'All',
  exerciseCategory: 'All',
  exerciseLevel: 'All',
  favoritesCategory: 'All',
  favoritesLevel: 'All',
  selectedFavoriteListId: loadJson(SELECTED_FAVORITE_LIST_STORAGE_KEY, DEFAULT_FAVORITE_LIST_ID),
  selectedProgramId: loadJson('p45.selectedProgram', 'base'),
  selectedDay: new Date().getDay(),
  done: loadJson('p45.done', {}),
  checklist: loadJson('p45.checklist', {}),
  journal: loadJson('p45.journal', []),
  favorites: loadJson('p45.favorites', {}),
  favoriteLists: loadFavoriteLists(),
};

const checklistItems = [
  'Warm-up ครบ',
  'คุณภาพท่าดี',
  'หยุดเมื่อความเร็วตก',
  'Cool-down หรือ mobility',
  'บันทึก note หลังฝึก',
];

const dayIndexMap = [6, 0, 1, 2, 3, 4, 5];
let installPromptEvent = null;
let lazyGifObserver = null;

// Call main() when DOM is ready (use both event and fallback)
if (document.readyState === 'loading') {
  console.log('[app.js] DOM loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[app.js] DOMContentLoaded fired, calling main()');
    main();
  });
} else {
  console.log('[app.js] DOM already ready, calling main()');
  main();
}

async function main() {
  try {
    console.log('[main] loading exercise-library.json');
    state.exercises = await fetch('data/exercise-library.json').then((response) => response.json()).catch((e) => {
      console.error('[main] exercises fetch failed:', e);
      return null;
    });
    console.log('[main] loaded exercises:', state.exercises?.exercises?.length);

    ensureSelectedFavoriteList();
    saveFavoriteLists();
    hydrateControls();
    render();
    console.log('[main] render complete');
  } catch (error) {
    console.error('[main] error:', error);
  }
}

function hydrateControls() {
  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      render();
    });
  });

  const exerciseCategoryFilter = document.getElementById('exerciseCategoryFilter');
  if (exerciseCategoryFilter) {
    exerciseCategoryFilter.addEventListener('change', (event) => {
      state.exerciseCategory = event.target.value;
      renderExercises();
    });
  }

  const exerciseLevelFilter = document.getElementById('exerciseLevelFilter');
  if (exerciseLevelFilter) {
    exerciseLevelFilter.addEventListener('change', (event) => {
      state.exerciseLevel = event.target.value;
      renderExercises();
    });
  }

  const favoritesCategoryFilter = document.getElementById('favoritesCategoryFilter');
  if (favoritesCategoryFilter) {
    favoritesCategoryFilter.addEventListener('change', (event) => {
      state.favoritesCategory = event.target.value;
      renderFavorites();
    });
  }

  const favoritesLevelFilter = document.getElementById('favoritesLevelFilter');
  if (favoritesLevelFilter) {
    favoritesLevelFilter.addEventListener('change', (event) => {
      state.favoritesLevel = event.target.value;
      renderFavorites();
    });
  }

  hydrateFavoriteListControls();

  const saveJournalBtn = document.getElementById('saveJournal');
  if (saveJournalBtn) {
    saveJournalBtn.addEventListener('click', saveJournal);
  }

  const journalDate = document.getElementById('journalDate');
  if (journalDate) {
    journalDate.valueAsDate = new Date();
  }

  hydrateInstallButton();
  registerServiceWorker();
  lucideReady();
}

function render() {
  renderFavoriteListControls();

  document.querySelectorAll('.tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === state.view);
  });

  document.querySelectorAll('.view').forEach((section) => section.classList.remove('active'));
  document.getElementById(`${state.view}View`).classList.add('active');

  if (state.view === 'exercises') {
    renderExercises();
  } else if (state.view === 'favorites') {
    renderFavorites();
  }

  lucideReady();
}

function renderSummary() {
  const doneCount = Object.values(state.done).filter(Boolean).length;
  const weekMinutes = selectedSundayProgram()?.minutes || 0;

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

  state.data.sundayPrograms.forEach((program) => {
    const button = document.createElement('button');
    button.className = `day-button ${program.id === state.selectedProgramId ? 'active' : ''}`;
    button.type = 'button';
    button.innerHTML = `<strong>${escapeHtml(program.name)}</strong><span>${program.minutes} min · ${escapeHtml(program.summary)}</span>`;
    button.addEventListener('click', () => {
      state.selectedProgramId = program.id;
      saveJson('p45.selectedProgram', state.selectedProgramId);
      renderSummary();
      renderToday();
      renderChecklist();
      renderWeek();
    });
    root.append(button);
  });
}

function renderToday() {
  const program = selectedSundayProgram();
  document.getElementById('todayLabel').textContent = `${program.name}: ${program.whenToChoose}`;
  renderPlanProgress(program);
  const drills = program.drillIds.map(findDrill).filter(Boolean);
  renderCardGrid(document.getElementById('todayPlan'), drills);
}

function renderPlanProgress(program = selectedSundayProgram()) {
  const total = program.drillIds.length;
  const completed = program.drillIds.filter((id) => state.done[id]).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('planProgressText').textContent = `${completed} / ${total}`;
  document.getElementById('planProgressBar').style.width = `${percent}%`;
}

function renderDrills() {
  const drills = state.data.drills.filter((drill) => {
    const matchesParticipant = state.participant === 'All' || drill.participant === state.participant;
    const matchesLevel = state.level === 'All' || String(drill.level) === state.level;
    const matchesCategory = state.category === 'All' || drill.category === state.category;
    const haystack = `${drill.name} ${drill.participant} ${drill.levelName} ${drill.levelTitle} ${drill.category} ${drill.goal} ${drill.caption} ${drill.hashtags.join(' ')}`.toLowerCase();
    const matchesSearch = !state.search || haystack.includes(state.search);
    return matchesParticipant && matchesLevel && matchesCategory && matchesSearch;
  });

  renderCardGrid(document.getElementById('drillGrid'), drills, { inlineEmbed: false });
}

function renderCardGrid(root, drills, options = {}) {
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
    const checkButton = card.querySelector('.check-button');
    const gifState = card.querySelector('.gif-state');

    title.textContent = drill.name;
    badge.textContent = drill.category;
    levelBadge.textContent = `L${drill.level}`;
    goal.textContent = drill.goal;
    fallback.textContent = drill.category;
    // Set up image with proper loading and visibility handling
    const imagePath = drill.gif || drill.thumbnailUrl || '';
    if (imagePath) {
      img.src = imagePath;
      img.alt = drill.name;

      // Hide fallback when image loads
      img.addEventListener('load', () => {
        fallback.style.display = 'none';
        img.style.display = 'block';
      });

      // Show fallback if image fails to load
      img.addEventListener('error', () => {
        img.classList.add('is-broken');
        img.style.display = 'none';
        fallback.style.display = 'grid';
      });
    } else {
      // No image, show fallback
      img.style.display = 'none';
      fallback.style.display = 'grid';
    }

    meta.innerHTML = [
      drill.participant,
      `${drill.levelName}: ${drill.levelTitle}`,
      `${drill.minutes} min`,
      drill.intensity,
      drill.sets,
    ].map((item) => `<span>${escapeHtml(item)}</span>`).join('');

    focus.innerHTML = drill.focus.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    gifState.textContent = drill.hasGif ? 'GIF ready' : 'GIF pending';
    gifState.className = `gif-state ${drill.hasGif ? 'ready' : 'pending'}`;

    checkButton.classList.toggle('done', Boolean(state.done[drill.id]));
    checkButton.addEventListener('click', () => {
      state.done[drill.id] = !state.done[drill.id];
      saveJson('p45.done', state.done);
      renderSummary();
      renderPlanProgress();
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

function renderProgram() {
  if (!state.program) {
    document.getElementById('programStatus').textContent = 'Program not available';
    return;
  }

  const program = state.program;
  const currentPhaseNum = program.currentPhase || state.data?.personalizedProgram?.currentPhase || 1;
  const currentWeekNum = program.currentWeek || state.data?.personalizedProgram?.currentWeek || 1;
  const currentPhase = program.phases[currentPhaseNum - 1];
  const currentWeek = currentWeekNum;

  // Render program header
  document.getElementById('programStatus').innerHTML = `
    <strong>${program.name}</strong><br>
    <span>Current: ${currentPhase.name}</span><br>
    <span>Week ${currentWeek} of ${program.totalWeeks}</span>
  `;

  // Render phase cards
  const phasesRoot = document.getElementById('programPhases');
  phasesRoot.innerHTML = '';
  program.phases.forEach((phase, index) => {
    const isActive = index + 1 === program.currentPhase;
    const isComplete = index + 1 < program.currentPhase;
    const phaseCard = document.createElement('div');
    phaseCard.className = `phase-card ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`;
    phaseCard.innerHTML = `
      <div class="phase-header">
        <h4>${phase.name}</h4>
        <span class="phase-weeks">Week ${phase.weeks[0]}-${phase.weeks[phase.weeks.length - 1]}</span>
      </div>
      <p class="phase-goal">${phase.goal}</p>
      <p class="phase-focus"><strong>Focus:</strong> ${phase.focusArea}</p>
      ${isActive ? '<span class="badge-active">Current Phase</span>' : ''}
      ${isComplete ? '<span class="badge-complete">✓ Complete</span>' : ''}
    `;
    phasesRoot.append(phaseCard);
  });

  // Render this week's drills
  const drillsRoot = document.getElementById('weekDrillsGrid');
  drillsRoot.innerHTML = '';
  currentPhase.drills.forEach((drillId) => {
    const drill = findDrill(drillId.id);
    if (drill) {
      const card = createDrillCard(drill);
      drillsRoot.append(card);
    }
  });

  // Render exit criteria
  const exitRoot = document.getElementById('exitCriteria');
  exitRoot.innerHTML = `
    <h4>To Progress to Next Phase:</h4>
    <ul>
      ${currentPhase.exitCriteria.map(c => `<li>${c}</li>`).join('')}
    </ul>
  `;
}

function createDrillCard(drill) {
  const template = document.getElementById('drillCardTemplate');
  const card = template.content.cloneNode(true);
  const article = card.querySelector('article');

  const img = card.querySelector('img');
  const fallback = card.querySelector('.media-fallback');
  const title = card.querySelector('h3');
  const badge = card.querySelector('.badge');
  const goal = card.querySelector('.goal');
  const meta = card.querySelector('.meta');

  title.textContent = drill.name;
  badge.textContent = drill.category;
  goal.textContent = drill.goal;
  fallback.textContent = drill.category;

  const imagePath = drill.gif || '';
  if (imagePath) {
    img.src = imagePath;
    img.alt = drill.name;
    img.addEventListener('load', () => {
      fallback.style.display = 'none';
      img.style.display = 'block';
    });
    img.addEventListener('error', () => {
      img.style.display = 'none';
      fallback.style.display = 'grid';
    });
  } else {
    img.style.display = 'none';
    fallback.style.display = 'grid';
  }

  meta.innerHTML = [drill.participant, `Level ${drill.level}`, `${drill.minutes} min`]
    .map(item => `<span>${escapeHtml(item)}</span>`)
    .join('');

  return card;
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

function selectedSundayProgram() {
  return state.data.sundayPrograms.find((program) => program.id === state.selectedProgramId) || state.data.sundayPrograms[0];
}

function todayKey() {
  return `${new Date().toISOString().slice(0, 10)}:${state.selectedProgramId}`;
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

function loadFavoriteLists() {
  const stored = loadJson(FAVORITE_LISTS_STORAGE_KEY, null);
  const legacyFavorites = loadJson('p45.favorites', {});
  const legacyExerciseIds = Object.keys(legacyFavorites).filter((id) => legacyFavorites[id]);

  if (Array.isArray(stored) && stored.length > 0) {
    const lists = stored.map((list, index) => normalizeFavoriteList(list, index)).filter(Boolean);
    return lists.length ? lists : [createFavoriteList(DEFAULT_FAVORITE_LIST_ID, 'โปรด 1', legacyExerciseIds)];
  }

  return [createFavoriteList(DEFAULT_FAVORITE_LIST_ID, 'โปรด 1', legacyExerciseIds)];
}

function normalizeFavoriteList(list, index) {
  if (!list || typeof list !== 'object') return null;

  const exerciseIds = Array.isArray(list.exerciseIds)
    ? list.exerciseIds
    : Object.keys(list.exercises || {}).filter((id) => list.exercises[id]);

  return createFavoriteList(
    String(list.id || `favorite-${index + 1}`),
    String(list.name || `โปรด ${index + 1}`),
    exerciseIds,
  );
}

function createFavoriteList(id, name, exerciseIds = []) {
  return {
    id,
    name,
    exerciseIds: [...new Set(exerciseIds.map((exerciseId) => String(exerciseId)).filter(Boolean))],
  };
}

function createFavoriteListId() {
  return `favorite-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function ensureSelectedFavoriteList() {
  if (!state.favoriteLists.length) {
    state.favoriteLists = [createFavoriteList(DEFAULT_FAVORITE_LIST_ID, 'โปรด 1')];
  }

  if (!state.favoriteLists.some((list) => list.id === state.selectedFavoriteListId)) {
    state.selectedFavoriteListId = state.favoriteLists[0].id;
  }
}

function selectedFavoriteList() {
  ensureSelectedFavoriteList();
  return state.favoriteLists.find((list) => list.id === state.selectedFavoriteListId) || state.favoriteLists[0];
}

function saveFavoriteLists() {
  ensureSelectedFavoriteList();
  saveJson(FAVORITE_LISTS_STORAGE_KEY, state.favoriteLists);
  saveJson(SELECTED_FAVORITE_LIST_STORAGE_KEY, state.selectedFavoriteListId);
  syncLegacyFavorites();
}

function syncLegacyFavorites() {
  const nextFavorites = {};

  state.favoriteLists.forEach((list) => {
    list.exerciseIds.forEach((exerciseId) => {
      nextFavorites[exerciseId] = true;
    });
  });

  state.favorites = nextFavorites;
  saveJson('p45.favorites', nextFavorites);
}

function isExerciseInFavoriteList(exerciseId, listId = state.selectedFavoriteListId) {
  const id = String(exerciseId);
  const list = state.favoriteLists.find((item) => item.id === listId);
  return Boolean(list?.exerciseIds.includes(id));
}

function favoriteListCountForExercise(exerciseId) {
  const id = String(exerciseId);
  return state.favoriteLists.filter((list) => list.exerciseIds.includes(id)).length;
}

function setExerciseFavoriteListMembership(exerciseId, listId, shouldInclude) {
  const list = state.favoriteLists.find((item) => item.id === listId);
  if (!list) return false;

  const id = String(exerciseId);
  const currentIndex = list.exerciseIds.indexOf(id);

  if (shouldInclude && currentIndex === -1) {
    list.exerciseIds.push(id);
  } else if (!shouldInclude && currentIndex !== -1) {
    list.exerciseIds.splice(currentIndex, 1);
  }

  saveFavoriteLists();
  return isExerciseInFavoriteList(id, listId);
}

function toggleFavorite(exerciseId, listId = state.selectedFavoriteListId) {
  return setExerciseFavoriteListMembership(exerciseId, listId, !isExerciseInFavoriteList(exerciseId, listId));
}

function hydrateFavoriteListControls() {
  const select = document.getElementById('favoriteListSelect');
  const createButton = document.getElementById('createFavoriteList');
  const deleteButton = document.getElementById('deleteFavoriteList');

  if (select) {
    select.addEventListener('change', (event) => {
      state.selectedFavoriteListId = event.target.value;
      saveFavoriteLists();
      renderFavoriteListControls();
      refreshFavoriteBadges();
      if (state.view === 'favorites') renderFavorites();
      if (currentExerciseForFullscreen) renderFavoriteListPicker(currentExerciseForFullscreen);
    });
  }

  if (createButton) {
    createButton.addEventListener('click', createFavoriteListFromPrompt);
  }

  if (deleteButton) {
    deleteButton.addEventListener('click', deleteSelectedFavoriteList);
  }

  renderFavoriteListControls();
}

function renderFavoriteListControls() {
  const select = document.getElementById('favoriteListSelect');
  const deleteButton = document.getElementById('deleteFavoriteList');
  if (!select) return;

  ensureSelectedFavoriteList();
  select.innerHTML = '';

  state.favoriteLists.forEach((list) => {
    const option = document.createElement('option');
    option.value = list.id;
    option.textContent = `${list.name} (${list.exerciseIds.length})`;
    select.appendChild(option);
  });

  select.value = state.selectedFavoriteListId;

  if (deleteButton) {
    deleteButton.disabled = state.favoriteLists.length <= 1;
  }
}

function createFavoriteListFromPrompt() {
  const defaultName = `โปรด ${state.favoriteLists.length + 1}`;
  const name = window.prompt('ตั้งชื่อรายการโปรดใหม่', defaultName);
  const trimmedName = name?.trim();
  if (!trimmedName) return;

  const list = createFavoriteList(createFavoriteListId(), trimmedName);
  state.favoriteLists.push(list);
  state.selectedFavoriteListId = list.id;
  saveFavoriteLists();
  renderFavoriteListControls();
  refreshFavoriteBadges();
  if (state.view === 'favorites') renderFavorites();
  if (currentExerciseForFullscreen) renderFavoriteListPicker(currentExerciseForFullscreen);
}

function deleteSelectedFavoriteList() {
  if (state.favoriteLists.length <= 1) return;

  const list = selectedFavoriteList();
  const confirmed = window.confirm(`ลบรายการ "${list.name}" หรือไม่? ท่าฝึกจะยังอยู่ในคลังทั้งหมด`);
  if (!confirmed) return;

  state.favoriteLists = state.favoriteLists.filter((item) => item.id !== list.id);
  state.selectedFavoriteListId = state.favoriteLists[0].id;
  saveFavoriteLists();
  renderFavoriteListControls();
  refreshFavoriteBadges();
  if (state.view === 'favorites') renderFavorites();
  if (currentExerciseForFullscreen) renderFavoriteListPicker(currentExerciseForFullscreen);
}

function updateFavoriteBadge(button, exerciseId) {
  const currentList = selectedFavoriteList();
  const isInSelectedList = isExerciseInFavoriteList(exerciseId, currentList.id);
  const listCount = favoriteListCountForExercise(exerciseId);

  button.classList.toggle('active', isInSelectedList);
  button.classList.toggle('saved-elsewhere', listCount > 0 && !isInSelectedList);
  button.title = `${isInSelectedList ? 'ลบออกจาก' : 'เพิ่มลง'} ${currentList.name}`;
  button.setAttribute('aria-label', button.title);

  if (listCount > 1) {
    button.dataset.count = String(listCount);
  } else {
    delete button.dataset.count;
  }
}

function refreshFavoriteBadges() {
  document.querySelectorAll('.favorite-badge[data-exercise-id]').forEach((button) => {
    updateFavoriteBadge(button, button.dataset.exerciseId);
  });
}

function renderFavoriteListPicker(exercise) {
  const root = document.getElementById('fsFavoriteLists');
  if (!root || !exercise) return;

  root.innerHTML = '';

  state.favoriteLists.forEach((list) => {
    const label = document.createElement('label');
    label.className = 'favorite-list-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = isExerciseInFavoriteList(exercise.id, list.id);
    input.addEventListener('change', () => {
      setExerciseFavoriteListMembership(exercise.id, list.id, input.checked);
      renderFavoriteListPicker(exercise);
      updateFullscreenFavoriteButton(exercise);
      refreshFavoriteBadges();
      if (state.view === 'favorites') renderFavorites();
    });

    const name = document.createElement('span');
    name.textContent = list.name;

    const count = document.createElement('small');
    count.textContent = `${list.exerciseIds.length} ท่า`;

    label.append(input, name, count);
    root.append(label);
  });
}

function updateFullscreenFavoriteButton(exercise) {
  const favBtn = document.getElementById('fsFavorite');
  if (!favBtn || !exercise) return;

  const list = selectedFavoriteList();
  favBtn.classList.toggle('active', isExerciseInFavoriteList(exercise.id, list.id));
  favBtn.title = `เพิ่ม/ลบจาก ${list.name}`;
  favBtn.onclick = () => {
    toggleFavorite(exercise.id, list.id);
    updateFullscreenFavoriteButton(exercise);
    renderFavoriteListPicker(exercise);
    refreshFavoriteBadges();
    if (state.view === 'favorites') renderFavorites();
  };
}

function hydrateInstallButton() {
  const button = document.getElementById('installApp');
  if (!button) return;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPromptEvent = event;
    button.hidden = false;
    lucideReady();
  });

  button.addEventListener('click', async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    installPromptEvent = null;
    button.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    installPromptEvent = null;
    button.hidden = true;
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderExercises() {
  console.log('[renderExercises] state.exercises:', state.exercises?.totalExercises);
  if (!state.exercises || !state.exercises.exercises) {
    console.log('[renderExercises] STOP: no exercises data');
    return;
  }

  const root = document.getElementById('exercisesGrid');
  if (!root) {
    console.log('[renderExercises] STOP: no exercisesGrid element');
    return;
  }

  console.log('[renderExercises] rendering', state.exercises.exercises.length, 'exercises');
  root.innerHTML = '';

  // Filter exercises
  let filtered = state.exercises.exercises;

  if (state.exerciseCategory !== 'All') {
    filtered = filtered.filter(ex => ex.category === state.exerciseCategory);
  }

  if (state.exerciseLevel !== 'All') {
    filtered = filtered.filter(ex => ex.level === state.exerciseLevel);
  }

  // Render cards with GIFs
  console.log('[renderExercises] filtered:', filtered.length, 'after category/level/search filters');
  filtered.forEach((exercise, idx) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';
    card.title = exercise.drillName + ' - ' + exercise.category;

    const thumbnail = document.createElement('div');
    thumbnail.className = 'exercise-thumbnail';

    const gif = createExerciseGif(exercise);
    if (idx === 0) console.log('[renderExercises] first GIF src:', exercise.file);

    thumbnail.appendChild(gif);

    const info = document.createElement('div');
    info.className = 'exercise-info';

    const title = document.createElement('div');
    title.className = 'exercise-title';
    title.textContent = exercise.drillName.substring(0, 40);

    const meta = document.createElement('div');
    meta.className = 'exercise-meta';

    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'exercise-badge';
    categoryBadge.textContent = exercise.category;

    const levelBadge = document.createElement('span');
    levelBadge.className = 'exercise-badge';
    levelBadge.textContent = exercise.level;

    const durationBadge = document.createElement('span');
    durationBadge.className = 'exercise-badge';
    durationBadge.textContent = `${exercise.duration.toFixed(1)}s`;

    meta.append(categoryBadge, levelBadge, durationBadge);
    info.append(title, meta);
    card.append(thumbnail, info);

    // Add favorite badge
    const favoriteBadge = document.createElement('button');
    favoriteBadge.className = 'favorite-badge';
    favoriteBadge.textContent = '♥️';
    favoriteBadge.type = 'button';
    favoriteBadge.dataset.exerciseId = exercise.id;
    updateFavoriteBadge(favoriteBadge, exercise.id);
    favoriteBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(exercise.id);
      updateFavoriteBadge(favoriteBadge, exercise.id);
      if (state.view === 'favorites') renderFavorites();
    });
    thumbnail.appendChild(favoriteBadge);

    // Add click handler to open fullscreen viewer directly
    card.addEventListener('click', () => {
      showFullscreenViewer(exercise);
    });

    root.append(card);
  });

  setupLazyGifs(root);
  setupModalHandlers();
  lucideReady();
}

function renderFavorites() {
  const root = document.getElementById('favoritesGrid');
  const emptyMsg = document.getElementById('emptyFavorites');
  const countSpan = document.getElementById('favoriteCount');

  const activeFavoriteList = selectedFavoriteList();
  const favoriteIds = new Set(activeFavoriteList.exerciseIds);
  const allFavorites = state.exercises.exercises.filter(ex => favoriteIds.has(String(ex.id)));

  // Update count
  countSpan.textContent = allFavorites.length;

  // Filter by category and level
  let filtered = allFavorites;

  if (state.favoritesCategory !== 'All') {
    filtered = filtered.filter(ex => ex.category === state.favoritesCategory);
  }

  if (state.favoritesLevel !== 'All') {
    filtered = filtered.filter(ex => ex.level === state.favoritesLevel);
  }

  // Show/hide empty message
  if (allFavorites.length === 0) {
    root.innerHTML = '';
    emptyMsg.style.display = 'flex';
    return;
  } else {
    emptyMsg.style.display = 'none';
  }

  // Render filtered favorites
  console.log('[renderFavorites] rendering', filtered.length, 'favorites');
  root.innerHTML = '';

  filtered.forEach((exercise, idx) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';
    card.title = exercise.drillName + ' - ' + exercise.category;

    const thumbnail = document.createElement('div');
    thumbnail.className = 'exercise-thumbnail';

    const gif = createExerciseGif(exercise);

    thumbnail.appendChild(gif);

    const info = document.createElement('div');
    info.className = 'exercise-info';

    const title = document.createElement('div');
    title.className = 'exercise-title';
    title.textContent = exercise.drillName.substring(0, 40);

    const meta = document.createElement('div');
    meta.className = 'exercise-meta';

    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'exercise-badge';
    categoryBadge.textContent = exercise.category;

    const levelBadge = document.createElement('span');
    levelBadge.className = 'exercise-badge';
    levelBadge.textContent = exercise.level;

    const durationBadge = document.createElement('span');
    durationBadge.className = 'exercise-badge';
    durationBadge.textContent = `${exercise.duration.toFixed(1)}s`;

    meta.append(categoryBadge, levelBadge, durationBadge);
    info.append(title, meta);
    card.append(thumbnail, info);

    const favoriteBadge = document.createElement('button');
    favoriteBadge.className = 'favorite-badge';
    favoriteBadge.textContent = '♥️';
    favoriteBadge.type = 'button';
    favoriteBadge.dataset.exerciseId = exercise.id;
    updateFavoriteBadge(favoriteBadge, exercise.id);
    favoriteBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(exercise.id);
      renderFavorites();
    });
    thumbnail.appendChild(favoriteBadge);

    card.addEventListener('click', () => {
      showFullscreenViewer(exercise);
    });

    root.append(card);
  });

  setupLazyGifs(root);
  lucideReady();
}

function createExerciseGif(exercise) {
  const gif = document.createElement('img');
  gif.alt = exercise.drillName;
  gif.dataset.src = exercise.file;
  gif.loading = 'lazy';
  gif.decoding = 'async';
  gif.className = 'exercise-gif is-pending';
  return gif;
}

function setupLazyGifs(root) {
  const images = [...root.querySelectorAll('img[data-src]')];

  if (!('IntersectionObserver' in window)) {
    images.forEach(loadLazyGif);
    return;
  }

  lazyGifObserver?.disconnect();
  lazyGifObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadLazyGif(entry.target);
        lazyGifObserver.unobserve(entry.target);
      });
    },
    { rootMargin: '600px 0px', threshold: 0.01 },
  );

  images.forEach((image) => lazyGifObserver.observe(image));
}

function loadLazyGif(image) {
  if (image.dataset.loaded === 'true') return;
  image.dataset.loaded = 'true';
  setGifImageSource(image, image.dataset.src);
}

function setGifImageSource(image, src) {
  image.dataset.baseSrc = src;
  image.dataset.retries = '0';
  image.classList.remove('is-broken', 'is-loaded');
  image.classList.add('is-pending');
  image.onload = () => markGifLoaded(image);
  image.onerror = () => retryGif(image);
  image.src = src;
}

function markGifLoaded(image) {
  image.classList.remove('is-pending', 'is-broken');
  image.classList.add('is-loaded');
}

function retryGif(image) {
  const retries = Number(image.dataset.retries || 0);

  if (retries >= 2) {
    image.classList.remove('is-pending');
    image.classList.add('is-broken');
    return;
  }

  image.dataset.retries = String(retries + 1);
  const retryDelay = 450 * (retries + 1);

  window.setTimeout(() => {
    image.src = cacheBustedUrl(image.dataset.baseSrc || image.dataset.src || image.src);
  }, retryDelay);
}

function cacheBustedUrl(src) {
  const url = new URL(src, window.location.href);
  url.searchParams.set('retry', String(Date.now()));
  return url.toString();
}

function showExerciseModal(exercise) {
  const modal = document.getElementById('exerciseModal');
  currentExerciseForFullscreen = exercise;

  const modalGif = document.getElementById('modalGif');
  modalGif.alt = exercise.drillName;
  setGifImageSource(modalGif, exercise.file);
  document.getElementById('modalTitle').textContent = exercise.drillName;
  document.getElementById('modalGoal').textContent = exercise.drillGoal_th || exercise.drillGoal || 'ไม่มีคำอธิบาย';
  document.getElementById('modalLevel').textContent = `Level ${exercise.level}`;
  document.getElementById('modalCategory').textContent = exercise.category;
  document.getElementById('modalDuration').textContent = `${exercise.duration.toFixed(1)}s`;

  // Focus items (Thai version)
  const focusList = document.getElementById('modalFocus');
  focusList.innerHTML = '';
  if (exercise.focus_th && exercise.focus_th.length > 0) {
    exercise.focus_th.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      focusList.appendChild(li);
    });
  } else if (exercise.focus && exercise.focus.length > 0) {
    exercise.focus.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      focusList.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'สนใจให้ท่าถูกต้องและหายใจสมดุล';
    focusList.appendChild(li);
  }

  renderResearchNote('modalResearch', exercise.research);

  // Tags
  const tagsList = document.getElementById('modalTags');
  tagsList.innerHTML = '';
  if (exercise.tags && exercise.tags.length > 0) {
    exercise.tags.forEach(tag => {
      const span = document.createElement('span');
      span.textContent = tag;
      tagsList.appendChild(span);
    });
  }

  // Done button
  const doneBtn = document.getElementById('modalDone');
  doneBtn.textContent = state.done[exercise.id] ? '✓ ทำเสร็จแล้ว' : 'ทำเสร็จแล้ว';
  doneBtn.onclick = () => {
    state.done[exercise.id] = !state.done[exercise.id];
    saveJson('p45.done', state.done);
    doneBtn.textContent = state.done[exercise.id] ? '✓ ทำเสร็จแล้ว' : 'ทำเสร็จแล้ว';
  };

  modal.showModal();
  lucideReady();
}

let currentExerciseForFullscreen = null;

function setupModalHandlers() {
  const modal = document.getElementById('exerciseModal');
  const closeBtn = document.querySelector('.modal-close');
  const expandBtn = document.getElementById('expandFullscreen');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.close());
  }

  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      if (currentExerciseForFullscreen) {
        showFullscreenViewer(currentExerciseForFullscreen);
        modal.close();
      }
    });
  }

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.close();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const fsViewer = document.getElementById('fullscreenViewer');
      if (fsViewer && fsViewer.open) {
        fsViewer.close();
      } else if (modal && modal.open) {
        modal.close();
      }
    }
  });

  setupFullscreenHandlers();
}

function showFullscreenViewer(exercise) {
  const viewer = document.getElementById('fullscreenViewer');
  currentExerciseForFullscreen = exercise;

  document.getElementById('fsTitle').textContent = exercise.drillName;

  updateFullscreenFavoriteButton(exercise);
  const fullscreenGif = document.getElementById('fsGif');
  fullscreenGif.alt = exercise.drillName;
  setGifImageSource(fullscreenGif, exercise.file);
  document.getElementById('fsGoal').textContent = exercise.drillGoal_th || exercise.drillGoal || 'ไม่มีคำอธิบาย';
  document.getElementById('fsLevel').textContent = `Level ${exercise.level}`;
  document.getElementById('fsCategory').textContent = exercise.category;
  document.getElementById('fsDuration').textContent = `${exercise.duration.toFixed(1)}s`;

  // Focus items (Thai version)
  const focusList = document.getElementById('fsFocus');
  focusList.innerHTML = '';
  if (exercise.focus_th && exercise.focus_th.length > 0) {
    exercise.focus_th.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      focusList.appendChild(li);
    });
  } else if (exercise.focus && exercise.focus.length > 0) {
    exercise.focus.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      focusList.appendChild(li);
    });
  }

  renderResearchNote('fsResearch', exercise.research);
  renderFavoriteListPicker(exercise);

  viewer.showModal();
  lucideReady();
}

function renderResearchNote(elementId, research) {
  const root = document.getElementById(elementId);
  if (!root) return;

  if (!research) {
    root.hidden = true;
    root.innerHTML = '';
    return;
  }

  const benefits = (research.benefits || []).slice(0, 3);
  const cautions = (research.cautions || []).slice(0, 3);
  const sources = (research.sources || []).slice(0, 2);

  root.hidden = false;
  root.innerHTML = `
    <h3>ข้อมูลที่ตรวจแล้ว</h3>
    ${benefits.length ? `<strong>ประโยชน์</strong><ul>${benefits.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
    ${cautions.length ? `<strong>ระวัง</strong><ul>${cautions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
    ${sources.length ? `<p class="research-sources">ที่มา: ${sources.map((source) => source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title)}</a>` : escapeHtml(source.title)).join(', ')}</p>` : ''}
  `;
}

function setupFullscreenHandlers() {
  const viewer = document.getElementById('fullscreenViewer');
  const closeBtn = document.getElementById('fsClose');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => viewer.close());
  }

  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) {
      viewer.close();
    }
  });
}

function lucideReady() {
  if (window.lucide) window.lucide.createIcons();
}
