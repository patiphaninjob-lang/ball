const state = {
  data: null,
  exercises: null,
  view: 'today',
  participant: 'Solo',
  level: 'All',
  category: 'All',
  exerciseCategory: 'All',
  exerciseLevel: 'All',
  search: '',
  selectedProgramId: loadJson('p45.selectedProgram', 'base'),
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
let installPromptEvent = null;

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
    console.log('[main] loading training-drills.json');
    state.data = await fetch('data/training-drills.json').then((response) => response.json());
    console.log('[main] loaded drills:', state.data?.drills?.length);

    console.log('[main] loading acl-recovery-program.json');
    state.program = await fetch('data/acl-recovery-program.json').then((response) => response.json()).catch((e) => {
      console.error('[main] program fetch failed:', e);
      return null;
    });
    console.log('[main] loaded program:', !!state.program);

    console.log('[main] loading exercise-library.json');
    state.exercises = await fetch('data/exercise-library.json').then((response) => response.json()).catch((e) => {
      console.error('[main] exercises fetch failed:', e);
      return null;
    });
    console.log('[main] loaded exercises:', state.exercises?.exercises?.length);

    state.selectedDay = dayIndexMap[new Date().getDay()] ?? 0;
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

  document.getElementById('searchInput').addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderDrills();
  });

  document.getElementById('participantFilter').addEventListener('change', (event) => {
    state.participant = event.target.value;
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

  const videoModal = document.getElementById('videoModal');
  const videoPlayer = document.getElementById('videoPlayer');
  const modalClose = document.querySelector('.modal-close');

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      videoPlayer.pause();
      videoModal.style.display = 'none';
    });
  }

  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) {
        videoPlayer.pause();
        videoModal.style.display = 'none';
      }
    });
  }

  document.getElementById('resetToday').addEventListener('click', () => {
    const key = todayKey();
    state.checklist[key] = {};
    saveJson('p45.checklist', state.checklist);
    renderChecklist();
  });

  document.getElementById('saveJournal').addEventListener('click', saveJournal);
  document.getElementById('journalDate').valueAsDate = new Date();

  hydrateInstallButton();
  registerServiceWorker();
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
  renderExercises();
  renderProgram();
  renderJournal();
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
  if (!state.exercises || !state.exercises.exercises) return;

  const root = document.getElementById('exercisesGrid');
  if (!root) return;

  root.innerHTML = '';

  // Filter exercises
  let filtered = state.exercises.exercises;

  if (state.exerciseCategory !== 'All') {
    filtered = filtered.filter(ex => ex.category === state.exerciseCategory);
  }

  if (state.exerciseLevel !== 'All') {
    filtered = filtered.filter(ex => ex.level === state.exerciseLevel);
  }

  if (state.search) {
    filtered = filtered.filter(ex =>
      (ex.drillName || '').toLowerCase().includes(state.search) ||
      (ex.category || '').toLowerCase().includes(state.search) ||
      ex.tags.some(tag => tag.toLowerCase().includes(state.search))
    );
  }

  // Render cards
  filtered.forEach(exercise => {
    const card = document.createElement('div');
    card.className = 'exercise-card';

    const thumbnail = document.createElement('div');
    thumbnail.className = 'exercise-thumbnail';

    const playButton = document.createElement('button');
    playButton.className = 'exercise-play-button';
    playButton.innerHTML = '<i data-lucide="play"></i>';
    playButton.addEventListener('click', () => playVideo(exercise));

    thumbnail.appendChild(playButton);

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
    root.append(card);
  });

  lucideReady();
}

function playVideo(exercise) {
  const modal = document.getElementById('videoModal');
  const player = document.getElementById('videoPlayer');
  const info = document.getElementById('videoInfo');

  player.src = exercise.file;
  info.innerHTML = `
    <h3>${exercise.drillName}</h3>
    <p><strong>Category:</strong> ${exercise.category} | <strong>Level:</strong> ${exercise.level}</p>
    <p><strong>Duration:</strong> ${exercise.duration.toFixed(1)}s</p>
    <p><strong>Goal:</strong> ${exercise.drillGoal || 'N/A'}</p>
    ${exercise.focus && exercise.focus.length > 0 ? `<p><strong>Focus:</strong> ${exercise.focus.join(', ')}</p>` : ''}
  `;

  modal.style.display = 'flex';
  player.play();
}

function lucideReady() {
  if (window.lucide) window.lucide.createIcons();
}
