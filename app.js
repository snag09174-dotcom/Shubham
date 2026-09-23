/* =====================================================
   DAILYFUEL
   Food + Water Tracker
===================================================== */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  [...document.querySelectorAll(selector)];


/* =====================================================
   DEFAULT SCHEDULE
===================================================== */

/*
   IMPORTANT:

   Weekdays:
   09:00 Breakfast
   11:30 Meal 2
   16:00 Meal 3
   19:00 Dinner
   22:00 Light meal

   There is NO meal between 12:00 and 4:00 PM.

   4:00 PM itself IS allowed.
*/

const DEFAULTS = {

  weekday: [

    {
      time: "09:00",
      name: "Breakfast"
    },

    {
      time: "11:30",
      name: "Meal 2"
    },

    {
      time: "16:00",
      name: "Meal 3"
    },

    {
      time: "19:00",
      name: "Dinner"
    },

    {
      time: "22:00",
      name: "Light meal"
    }

  ],


  weekend: [

    {
      time: "09:00",
      name: "Breakfast"
    },

    {
      time: "12:00",
      name: "Lunch"
    },

    {
      time: "15:00",
      name: "Meal 3"
    },

    {
      time: "18:00",
      name: "Meal 4"
    },

    {
      time: "21:00",
      name: "Dinner"
    }

  ]

};


/* =====================================================
   STORAGE
===================================================== */

const SETTINGS_KEY =
  "dailyfuel-settings-v2";

const THEME_KEY =
  "dailyfuel-theme-v2";

const UNDO_KEY =
  "dailyfuel-undo-v2";


/* =====================================================
   DATE
===================================================== */

function dateKey(
  date = new Date()
) {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return (
    "dailyfuel-day-" +
    year +
    "-" +
    month +
    "-" +
    day
  );

}


function localDateString(
  date = new Date()
) {

  return dateKey(date)
    .replace(
      "dailyfuel-day-",
      ""
    );

}


/* =====================================================
   SETTINGS
===================================================== */

function loadSettings() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          SETTINGS_KEY
        )
      );

    if (
      saved &&
      saved.weekday &&
      saved.weekend
    ) {

      return saved;

    }

  } catch (error) {}


  return JSON.parse(
    JSON.stringify(DEFAULTS)
  );

}


let settings =
  loadSettings();


/* =====================================================
   DAY STATE
===================================================== */

function loadDay(
  date = new Date()
) {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          dateKey(date)
        )
      );


    if (saved) {

      return {

        meals:
          saved.meals || {},

        water:
          Number(saved.water) || 0

      };

    }

  } catch (error) {}


  return {

    meals: {},

    water: 0

  };

}


let dayState =
  loadDay();


/* =====================================================
   GLOBAL
===================================================== */

let editingTab =
  "weekday";

let lastAlertKey =
  "";

let undoStack =
  loadUndoStack();


/* =====================================================
   ALARM ENGINE
===================================================== */

let audioContext =
  null;

let alarmTimer =
  null;

let alarmActive =
  false;


/* =====================================================
   SAVE
===================================================== */

function saveDay() {

  localStorage.setItem(

    dateKey(),

    JSON.stringify(
      dayState
    )

  );

}


function saveSettingsData() {

  localStorage.setItem(

    SETTINGS_KEY,

    JSON.stringify(
      settings
    )

  );

}


/* =====================================================
   DAY TYPE
===================================================== */

function isCollegeDay(
  date = new Date()
) {

  const day =
    date.getDay();

  return (
    day >= 1 &&
    day <= 5
  );

}


function activeSchedule(
  date = new Date()
) {

  return isCollegeDay(date)
    ? settings.weekday
    : settings.weekend;

}


/* =====================================================
   FORMAT
===================================================== */

function formatDate() {

  return new Intl.DateTimeFormat(
    undefined,
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  ).format(
    new Date()
  );

}


function to12Hour(time) {

  const [
    hours,
    minutes
  ] =
    time
      .split(":")
      .map(Number);


  const suffix =
    hours >= 12
      ? "PM"
      : "AM";


  const hour =
    hours % 12 || 12;


  return (
    hour +
    ":" +
    String(minutes)
      .padStart(2, "0") +
    " " +
    suffix
  );

}


function escapeHtml(value) {

  return String(value)
    .replace(
      /[&<>"']/g,
      character => ({

        "&": "&amp;",

        "<": "&lt;",

        ">": "&gt;",

        '"': "&quot;",

        "'": "&#039;"

      }[character])
    );

}


/* =====================================================
   MEAL KEY
===================================================== */

function mealKey(meal) {

  return (
    meal.time +
    "|" +
    meal.name
  );

}


/* =====================================================
   RENDER
===================================================== */

function render() {

  $("#date").textContent =
    formatDate();


  $("#dayMode").textContent =

    isCollegeDay()

      ? "College day · Monday–Friday · 12 PM–8 PM"

      : "Free day · Saturday–Sunday";


  const schedule =
    activeSchedule();


  const list =
    $("#mealList");


  list.innerHTML =
    "";


  const now =
    new Date();


  const nowMinutes =
    now.getHours() * 60 +
    now.getMinutes();


  let next =
    null;


  schedule.forEach(
    meal => {

      const [
        hours,
        minutes
      ] =
        meal.time
          .split(":")
          .map(Number);


      const mealMinutes =
        hours * 60 +
        minutes;


      const key =
        mealKey(meal);


      const completed =
        !!dayState.meals[key];


      if (
        !completed &&
        mealMinutes > nowMinutes &&
        !next
      ) {

        next =
          meal;

      }


      const row =
        document.createElement(
          "label"
        );


      row.className =
        "meal" +
        (
          completed
            ? " done"
            : ""
        );


      row.innerHTML = `

        <span class="meal-time">
          ${to12Hour(meal.time)}
        </span>

        <span class="meal-info">

          <span class="meal-name">
            ${escapeHtml(meal.name)}
          </span>

          <span class="meal-status">
            ${
              completed
                ? "Completed"
                : "Eat at this time"
            }
          </span>

        </span>

        <input
          type="checkbox"
          ${completed ? "checked" : ""}
        >

      `;


      row
        .querySelector("input")
        .addEventListener(
          "change",
          event => {

            const previous =
              !!dayState.meals[key];


            const nextValue =
              event.target.checked;


            pushUndo({

              type:
                "meal",

              key,

              previous,

              next:
                nextValue

            });


            dayState.meals[key] =
              nextValue;


            saveDay();

            render();


            showToast(

              nextValue

                ? `${meal.name} completed`

                : `${meal.name} unchecked`

            );

          }
        );


      list.appendChild(
        row
      );

    }
  );


  if (next) {

    $("#nextBadge").textContent =
      "Next: " +
      to12Hour(next.time);

  } else {

    $("#nextBadge").textContent =
      "All meals checked";

  }


  /* WATER */

  const water =
    Math.max(
      0,
      dayState.water
    );


  const target =
    2500;


  $("#waterValue")
    .textContent =
    water;


  const percentage =
    Math.min(
      100,
      (water / target) * 100
    );


  $("#waterBar")
    .style.width =
    percentage + "%";


  $("#waterPercent")
    .textContent =
    Math.round(
      percentage
    ) + "%";


  renderStreak();

  updateUndoButton();

}


/* =====================================================
   STREAK
===================================================== */

function isDayComplete(
  date
) {

  const state =
    loadDay(date);


  const schedule =
    activeSchedule(date);


  if (
    schedule.length === 0
  ) {

    return false;

  }


  return schedule.every(
    meal =>
      !!state.meals[
        mealKey(meal)
      ]
  );

}


function calculateCurrentStreak() {

  let cursor =
    new Date();


  let streak =
    0;


  /*
     If today's meals are not complete,
     count backwards from yesterday.
  */

  if (
    !isDayComplete(cursor)
  ) {

    cursor.setDate(
      cursor.getDate() - 1
    );

  }


  while (
    isDayComplete(cursor)
  ) {

    streak++;


    cursor.setDate(
      cursor.getDate() - 1
    );


    if (
      streak > 10000
    ) {

      break;

    }

  }


  return streak;

}


function getStoredDayDates() {

  const dates =
    [];


  for (
    let i = 0;
    i < localStorage.length;
    i++
  ) {

    const key =
      localStorage.key(i);


    if (
      key &&
      key.startsWith(
        "dailyfuel-day-"
      )
    ) {

      dates.push(
        key.replace(
          "dailyfuel-day-",
          ""
        )
      );

    }

  }


  return dates;

}


function parseLocalDate(
  value
) {

  const [
    year,
    month,
    day
  ] =
    value
      .split("-")
      .map(Number);


  return new Date(
    year,
    month - 1,
    day
  );

}


function daysBetween(
  first,
  second
) {

  const a =
    new Date(
      first.getFullYear(),
      first.getMonth(),
      first.getDate()
    );


  const b =
    new Date(
      second.getFullYear(),
      second.getMonth(),
      second.getDate()
    );


  return Math.round(
    (b - a) / 86400000
  );

}


function calculateBestStreak() {

  const dates =
    getStoredDayDates()
      .sort();


  let best =
    0;

  let current =
    0;

  let previous =
    null;


  for (
    const dateString of dates
  ) {

    const date =
      parseLocalDate(
        dateString
      );


    if (
      !isDayComplete(date)
    ) {

      current =
        0;

      previous =
        null;

      continue;

    }


    if (
      previous &&
      daysBetween(
        previous,
        date
      ) === 1
    ) {

      current++;

    } else {

      current =
        1;

    }


    best =
      Math.max(
        best,
        current
      );


    previous =
      date;

  }


  return best;

}


function renderStreak() {

  const current =
    calculateCurrentStreak();


  const best =
    calculateBestStreak();


  $("#streakNumber")
    .textContent =
    current;


  $("#bestStreak")
    .textContent =
    best;


  if (
    isDayComplete(
      new Date()
    )
  ) {

    $("#streakMessage")
      .textContent =
      "🔥 Today's meals are complete. Keep it alive!";

  }

  else if (
    current > 0
  ) {

    $("#streakMessage")
      .textContent =
      "Complete today's meals to extend your streak.";

  }

  else {

    $("#streakMessage")
      .textContent =
      "Complete all meals today to start your streak.";

  }

}


/* =====================================================
   UNDO
===================================================== */

function loadUndoStack() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          UNDO_KEY
        )
      );


    if (
      Array.isArray(saved)
    ) {

      return saved;

    }

  } catch (error) {}


  return [];

}


function saveUndoStack() {

  localStorage.setItem(

    UNDO_KEY,

    JSON.stringify(
      undoStack
    )

  );

}


function pushUndo(action) {

  undoStack.push({

    ...action,

    date:
      localDateString()

  });


  if (
    undoStack.length > 20
  ) {

    undoStack.shift();

  }


  saveUndoStack();

}


function undoLastAction() {

  if (
    undoStack.length === 0
  ) {

    return;

  }


  const action =
    undoStack.pop();


  if (
    action.date !==
    localDateString()
  ) {

    saveUndoStack();

    updateUndoButton();

    return;

  }


  if (
    action.type ===
    "meal"
  ) {

    dayState.meals[
      action.key
    ] =
      action.previous;


    saveDay();


    showToast(
      "Meal action undone"
    );

  }


  else if (
    action.type ===
    "water"
  ) {

    dayState.water =
      action.previous;


    saveDay();


    showToast(
      "Water action undone"
    );

  }


  else if (
    action.type ===
    "reset"
  ) {

    dayState =
      action.previous;


    saveDay();


    showToast(
      "Reset undone"
    );

  }


  saveUndoStack();

  render();

}


function updateUndoButton() {

  $("#undoBtn")
    .disabled =
    undoStack.length === 0;

}


/* =====================================================
   TOAST
===================================================== */

let toastTimer =
  null;


function showToast(
  message
) {

  const toast =
    $("#toast");


  $("#toastMessage")
    .textContent =
    message;


  toast.classList.remove(
    "hidden"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.add(
          "hidden"
        );

      },
      3500
    );

}


/* =====================================================
   ALARM AUDIO
===================================================== */

/*
   The alarm does NOT create a new AudioContext
   every second.

   Instead, one AudioContext is reused and a short
   repeating pattern is scheduled until one minute
   has passed.

   Web Audio supports oscillator sources with explicit
   start/stop times. 
*/

async function getAudioContext() {

  if (!audioContext) {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;


    if (!AudioContext) {

      return null;

    }


    audioContext =
      new AudioContext();

  }


  if (
    audioContext.state ===
    "suspended"
  ) {

    await audioContext.resume();

  }


  return audioContext;

}


/* =====================================================
   ONE ALARM BEEP
===================================================== */

async function playAlarmBeep(
  startTime
) {

  const context =
    await getAudioContext();


  if (!context) {

    return;

  }


  const frequencies =
    [
      880,
      660,
      880
    ];


  frequencies.forEach(
    (
      frequency,
      index
    ) => {

      const oscillator =
        context.createOscillator();


      const gain =
        context.createGain();


      oscillator.type =
        "sine";


      oscillator.frequency.setValueAtTime(
        frequency,
        startTime +
        index * .18
      );


      gain.gain.setValueAtTime(
        .0001,
        startTime +
        index * .18
      );


      gain.gain.exponentialRampToValueAtTime(
        .16,
        startTime +
        index * .18 +
        .02
      );


      gain.gain.exponentialRampToValueAtTime(
        .0001,
        startTime +
        index * .18 +
        .14
      );


      oscillator.connect(
        gain
      );


      gain.connect(
        context.destination
      );


      oscillator.start(
        startTime +
        index * .18
      );


      oscillator.stop(
        startTime +
        index * .18 +
        .16
      );

    }
  );

}


/* =====================================================
   START 1-MINUTE ALARM
===================================================== */

async function startAlarm(
  mealName = "Meal time"
) {

  stopAlarm();


  alarmActive =
    true;


  $("#alarmTitle")
    .textContent =
    "🔔 " +
    mealName;


  $("#alarmControl")
    .classList.remove(
      "hidden"
    );


  const context =
    await getAudioContext();


  if (!context) {

    return;

  }


  /*
     Play the first beep immediately.
  */

  playAlarmBeep(
    context.currentTime
  );


  /*
     Then repeat every 3 seconds.
     The entire alarm automatically stops
     after 60 seconds.
  */

  let elapsed =
    3;


  alarmTimer =
    setInterval(
      () => {

        if (
          !alarmActive
        ) {

          return;

        }


        playAlarmBeep(
          context.currentTime
        );


        elapsed += 3;


        if (
          elapsed >= 60
        ) {

          stopAlarm();

        }

      },
      3000
    );

}


/* =====================================================
   STOP ALARM
===================================================== */

function stopAlarm() {

  alarmActive =
    false;


  if (
    alarmTimer
  ) {

    clearInterval(
      alarmTimer
    );


    alarmTimer =
      null;

  }


  $("#alarmControl")
    .classList.add(
      "hidden"
    );

}


/* =====================================================
   NOTIFICATION
===================================================== */

function showNotification(
  meal
) {

  startAlarm(
    meal.name
  );


  if (
    "Notification" in window
  ) {

    if (
      Notification.permission ===
      "granted"
    ) {

      new Notification(

        "DailyFuel — " +
        meal.name,

        {

          body:
            "It's " +
            to12Hour(
              meal.time
            ) +
            ". Time to eat."

        }

      );

    }

    else if (
      Notification.permission ===
      "default"
    ) {

      Notification
        .requestPermission()
        .then(
          permission => {

            if (
              permission ===
              "granted"
            ) {

              new Notification(

                "DailyFuel — " +
                meal.name,

                {

                  body:
                    "It's time to eat."

                }

              );

            }

          }
        )
        .catch(
          () => {}
        );

    }

  }

}


/* =====================================================
   CHECK ALERTS
===================================================== */

function checkAlerts() {

  const schedule =
    activeSchedule();


  const date =
    new Date();


  const current =

    String(
      date.getHours()
    ).padStart(2, "0")

    +

    ":" +

    String(
      date.getMinutes()
    ).padStart(2, "0");


  const alertKey =

    localDateString(date)

    +

    "|" +

    current;


  if (
    alertKey ===
    lastAlertKey
  ) {

    return;

  }


  const meal =
    schedule.find(
      item =>
        item.time ===
        current
    );


  if (meal) {

    lastAlertKey =
      alertKey;


    const key =
      mealKey(meal);


    if (
      !dayState.meals[key]
    ) {

      showNotification(
        meal
      );

    }

  }

}


/* =====================================================
   STOP BUTTON
===================================================== */

$("#stopAlarm")
  .addEventListener(
    "click",
    stopAlarm
  );


/* =====================================================
   TEST 1-MIN ALARM
===================================================== */

$("#testSound")
  .addEventListener(
    "click",
    () => {

      startAlarm(
        "Test alarm"
      );


      if (
        "Notification" in window &&
        Notification.permission ===
        "default"
      ) {

        Notification
          .requestPermission()
          .catch(
            () => {}
          );

      }

    }
  );


/* =====================================================
   WATER
===================================================== */

$$("[data-water]")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const amount =
            Number(
              button.dataset.water
            );


          const previous =
            dayState.water;


          const next =
            Math.max(
              0,
              previous + amount
            );


          pushUndo({

            type:
              "water",

            previous,

            next

          });


          dayState.water =
            next;


          saveDay();

          render();


          showToast(

            amount > 0

              ? `Added ${amount} ml`

              : `Removed ${Math.abs(amount)} ml`

          );

        }
      );

    }
  );


/* =====================================================
   UNDO
===================================================== */

$("#undoBtn")
  .addEventListener(
    "click",
    undoLastAction
  );


$("#toastUndo")
  .addEventListener(
    "click",
    () => {

      undoLastAction();


      $("#toast")
        .classList.add(
          "hidden"
        );

    }
  );


/* =====================================================
   RESET
===================================================== */

$("#resetBtn")
  .addEventListener(
    "click",
    () => {

      if (
        !confirm(
          "Reset today's meals and water?"
        )
      ) {

        return;

      }


      const previous =
        JSON.parse(
          JSON.stringify(
            dayState
          )
        );


      pushUndo({

        type:
          "reset",

        previous

      });


      dayState = {

        meals: {},

        water: 0

      };


      saveDay();

      render();


      showToast(
        "Today has been reset"
      );

    }
  );


/* =====================================================
   SETTINGS
===================================================== */

$("#settingsBtn")
  .addEventListener(
    "click",
    openSettings
  );


$("#closeSettings")
  .addEventListener(
    "click",
    closeSettings
  );


$("#cancelSettings")
  .addEventListener(
    "click",
    closeSettings
  );


$("#saveSettings")
  .addEventListener(
    "click",
    saveEditedSettings
  );


$$(".tab")
  .forEach(
    tab => {

      tab.addEventListener(
        "click",
        () => {

          editingTab =
            tab.dataset.tab;


          $$(".tab")
            .forEach(
              item => {

                item.classList.toggle(

                  "active",

                  item ===
                  tab

                );

              }
            );


          renderEditor();

        }
      );

    }
  );


function openSettings() {

  editingTab =
    "weekday";


  $$(".tab")
    .forEach(
      tab => {

        tab.classList.toggle(

          "active",

          tab.dataset.tab ===
          editingTab

        );

      }
    );


  renderEditor();


  $("#settingsModal")
    .classList.remove(
      "hidden"
    );

}


function closeSettings() {

  $("#settingsModal")
    .classList.add(
      "hidden"
    );

}


/* =====================================================
   COLLEGE TIME VALIDATION
===================================================== */

/*
   12:00 PM through 3:59 PM = blocked.

   4:00 PM = allowed.

   This means:
   12:00 -> blocked
   13:00 -> blocked
   14:00 -> blocked
   15:59 -> blocked
   16:00 -> allowed
*/

function isCollegeBlockedTime(
  time
) {

  const [
    hour,
    minute
  ] =
    time
      .split(":")
      .map(Number);


  const total =
    hour * 60 +
    minute;


  return (
    total >= 720 &&
    total < 960
  );

}


/* =====================================================
   RENDER EDITOR
===================================================== */

function renderEditor() {

  const editor =
    $("#scheduleEditor");


  editor.innerHTML =
    "";


  const rows =
    settings[editingTab]
      .map(
        meal => ({
          ...meal
        })
      );


  rows.forEach(
    (
      meal,
      index
    ) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "editor-row";


      row.innerHTML = `

        <input
          class="edit-name"
          value="${escapeHtml(
            meal.name
          )}"
          placeholder="Meal name"
        >

        <input
          class="edit-time"
          type="time"
          value="${meal.time}"
        >

        <button
          type="button"
          class="remove-meal"
        >
          ×
        </button>

      `;


      row
        .querySelector(
          ".remove-meal"
        )
        .addEventListener(
          "click",
          () => {

            rows.splice(
              index,
              1
            );


            settings[
              editingTab
            ] =
              rows;


            renderEditor();

          }
        );


      editor.appendChild(
        row
      );

    }
  );


  const add =
    document.createElement(
      "button"
    );


  add.type =
    "button";


  add.className =
    "secondary";


  add.textContent =
    "+ Add meal";


  add.addEventListener(
    "click",
    () => {

      rows.push({

        time:
          editingTab ===
          "weekday"

            ? "16:00"

            : "12:00",

        name:
          "New meal"

      });


      settings[
        editingTab
      ] =
        rows;


      renderEditor();

    }
  );


  editor.appendChild(
    add
  );

}


/* =====================================================
   SAVE EDITED SCHEDULE
===================================================== */

function saveEditedSettings() {

  const rows =
    [
      ...document.querySelectorAll(
        "#scheduleEditor .editor-row"
      )
    ];


  const result =
    [];


  for (
    const row of rows
  ) {

    const name =
      row
        .querySelector(
          ".edit-name"
        )
        .value
        .trim();


    const time =
      row
        .querySelector(
          ".edit-time"
        )
        .value;


    if (
      !name ||
      !time
    ) {

      alert(
        "Please enter both meal name and time."
      );

      return;

    }


    /*
       HARD BLOCK for college schedule.
    */

    if (
      editingTab ===
      "weekday" &&
      isCollegeBlockedTime(
        time
      )
    ) {

      alert(
        "College schedule cannot contain a meal between 12:00 PM and 4:00 PM. 4:00 PM is allowed."
      );

      return;

    }


    result.push({

      name,

      time

    });

  }


  /*
     Sort chronologically.
  */

  result.sort(
    (
      a,
      b
    ) =>
      a.time.localeCompare(
        b.time
      )
  );


  settings[
    editingTab
  ] =
    result;


  saveSettingsData();


  closeSettings();

  render();


  showToast(
    "Schedule saved"
  );

}


/* =====================================================
   THEME
===================================================== */

const DEFAULT_THEME = {

  mode:
    "light",

  accent:
    "#2d9c63",

  background:
    "#f4f7f5",

  card:
    "#ffffff"

};


function loadTheme() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          THEME_KEY
        )
      );


    if (saved) {

      return {

        ...DEFAULT_THEME,

        ...saved

      };

    }

  } catch (error) {}


  return {
    ...DEFAULT_THEME
  };

}


let theme =
  loadTheme();


/* =====================================================
   COLOR HELPERS
===================================================== */

/*
   Generate a readable soft version
   of the selected accent color.
*/

function hexToRgba(
  hex,
  alpha
) {

  const clean =
    hex.replace(
      "#",
      ""
    );


  const r =
    parseInt(
      clean.substring(0, 2),
      16
    );


  const g =
    parseInt(
      clean.substring(2, 4),
      16
    );


  const b =
    parseInt(
      clean.substring(4, 6),
      16
    );


  return `rgba(${r}, ${g}, ${b}, ${alpha})`;

}


/* =====================================================
   APPLY THEME
===================================================== */

function applyTheme() {

  const body =
    document.body;


  body.dataset.theme =
    theme.mode;


  /*
     These variables are explicitly set on
     the BODY, so custom colors actually
     override the CSS variables.
  */

  body.style.setProperty(
    "--custom-accent",
    theme.accent
  );


  body.style.setProperty(
    "--custom-background",
    theme.background
  );


  body.style.setProperty(
    "--custom-card",
    theme.card
  );


  body.style.setProperty(
    "--custom-accent-soft",
    hexToRgba(
      theme.accent,
      .13
    )
  );


  $("#accentColor")
    .value =
    theme.accent;


  $("#backgroundColor")
    .value =
    theme.background;


  $("#cardColor")
    .value =
    theme.card;


  $$(".theme-option")
    .forEach(
      button => {

        button.classList.toggle(

          "active",

          button.dataset.themeChoice ===
          theme.mode

        );

      }
    );


  localStorage.setItem(

    THEME_KEY,

    JSON.stringify(
      theme
    )

  );

}


/* =====================================================
   THEME MODAL
===================================================== */

$("#themeBtn")
  .addEventListener(
    "click",
    () => {

      applyTheme();


      $("#themeModal")
        .classList.remove(
          "hidden"
        );

    }
  );


$("#closeTheme")
  .addEventListener(
    "click",
    () => {

      $("#themeModal")
        .classList.add(
          "hidden"
        );

    }
  );


/* =====================================================
   THEME CHOICES
===================================================== */

$$(".theme-option")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          theme.mode =
            button.dataset.themeChoice;


          applyTheme();

        }
      );

    }
  );


/* =====================================================
   CUSTOM COLORS
===================================================== */

$("#accentColor")
  .addEventListener(
    "input",
    event => {

      theme.accent =
        event.target.value;


      theme.mode =
        "custom";


      applyTheme();

    }
  );


$("#backgroundColor")
  .addEventListener(
    "input",
    event => {

      theme.background =
        event.target.value;


      theme.mode =
        "custom";


      applyTheme();

    }
  );


$("#cardColor")
  .addEventListener(
    "input",
    event => {

      theme.card =
        event.target.value;


      theme.mode =
        "custom";


      applyTheme();

    }
  );


/* =====================================================
   SAVE THEME
===================================================== */

$("#saveTheme")
  .addEventListener(
    "click",
    () => {

      theme.accent =
        $("#accentColor")
          .value;


      theme.background =
        $("#backgroundColor")
          .value;


      theme.card =
        $("#cardColor")
          .value;


      theme.mode =
        theme.mode ||
        "custom";


      applyTheme();


      $("#themeModal")
        .classList.add(
          "hidden"
        );


      showToast(
        "Theme applied"
      );

    }
  );


/* =====================================================
   RESET THEME
===================================================== */

$("#resetTheme")
  .addEventListener(
    "click",
    () => {

      theme =
        {
          ...DEFAULT_THEME
        };


      applyTheme();


      showToast(
        "Theme reset"
      );

    }
  );


/* =====================================================
   START
===================================================== */

applyTheme();

render();


/*
   Check alarm every second.
*/

setInterval(
  checkAlerts,
  1000
);


/*
   Refresh UI.
*/

setInterval(
  render,
  30000
);


checkAlerts();
