const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  [...document.querySelectorAll(selector)];


/* =====================================================
   DEFAULT SCHEDULE
===================================================== */

const DEFAULTS = {

  weekday: [

    {
      time: "08:00",
      name: "Breakfast"
    },

    {
      time: "11:00",
      name: "Meal 2"
    },

    {
      time: "14:00",
      name: "Lunch"
    },

    {
      time: "17:00",
      name: "Meal 4"
    },

    {
      time: "20:00",
      name: "Dinner"
    },

    {
      time: "23:00",
      name: "Light meal"
    }

  ],


  weekend: [

    {
      time: "08:00",
      name: "Breakfast"
    },

    {
      time: "11:00",
      name: "Meal 2"
    },

    {
      time: "14:00",
      name: "Lunch"
    },

    {
      time: "17:00",
      name: "Meal 4"
    },

    {
      time: "20:00",
      name: "Dinner"
    },

    {
      time: "23:00",
      name: "Light meal"
    }

  ]

};


/* =====================================================
   STORAGE KEYS
===================================================== */

const SETTINGS_KEY =
  "dailyfuel-settings-v1";

const THEME_KEY =
  "dailyfuel-theme-v1";

const UNDO_KEY =
  "dailyfuel-undo-v1";


/* =====================================================
   DATE KEY
===================================================== */

function dateKey(date = new Date()) {

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(date.getDate())
      .padStart(2, "0");

  return (
    "dailyfuel-day-" +
    year +
    "-" +
    month +
    "-" +
    day
  );

}


/* =====================================================
   DATE STRING
===================================================== */

function localDateString(date = new Date()) {

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(date.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;

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

function loadDay(date = new Date()) {

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
   GLOBAL STATE
===================================================== */

let editingTab =
  "weekday";

let lastAlertKey =
  "";

let undoStack =
  loadUndoStack();

let toastTimer =
  null;


/* =====================================================
   SAVE DAY
===================================================== */

function saveDay() {

  localStorage.setItem(

    dateKey(),

    JSON.stringify(
      dayState
    )

  );

}


/* =====================================================
   SAVE SETTINGS
===================================================== */

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
   DATE
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
          aria-label="Mark ${
            escapeHtml(meal.name)
          } complete"
        >

      `;


      row
        .querySelector("input")
        .addEventListener(
          "change",
          event => {

            const previous =
              dayState.meals[key] || false;

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
      to12Hour(
        next.time
      );

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
   TIME FORMAT
===================================================== */

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


/* =====================================================
   SECURITY
===================================================== */

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
   STREAK SYSTEM
===================================================== */

/*
   A day counts as complete when
   EVERY scheduled meal for that
   day has been checked.
*/

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


/* =====================================================
   CURRENT STREAK
===================================================== */

function calculateCurrentStreak() {

  const today =
    new Date();


  let streak =
    0;


  let cursor =
    new Date(today);


  /*
     If today isn't finished,
     start counting from yesterday.
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


    /*
       Safety limit.
       Prevents an infinite loop.
    */

    if (
      streak > 10000
    ) {

      break;

    }

  }


  return streak;

}


/* =====================================================
   BEST STREAK
===================================================== */

function calculateBestStreak() {

  const dates =
    getStoredDayDates();


  if (
    dates.length === 0
  ) {

    return 0;

  }


  dates.sort();


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


/* =====================================================
   STORED DATES
===================================================== */

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


/* =====================================================
   PARSE LOCAL DATE
===================================================== */

function parseLocalDate(
  dateString
) {

  const [
    year,
    month,
    day
  ] =
    dateString
      .split("-")
      .map(Number);


  return new Date(
    year,
    month - 1,
    day
  );

}


/* =====================================================
   DATE DIFFERENCE
===================================================== */

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
    (
      b - a
    ) /
    86400000
  );

}


/* =====================================================
   RENDER STREAK
===================================================== */

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
      "🔥 Today's meals are complete. Keep the streak alive!";

  }
  else if (
    current > 0
  ) {

    $("#streakMessage")
      .textContent =
      "Complete all today's meals to extend your streak.";

  }
  else {

    $("#streakMessage")
      .textContent =
      "Complete all meals today to start your streak.";

  }

}


/* =====================================================
   UNDO SYSTEM
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


  /*
     Keep only the last 20 actions.
  */

  if (
    undoStack.length > 20
  ) {

    undoStack.shift();

  }


  saveUndoStack();

}


/* =====================================================
   UNDO LAST ACTION
===================================================== */

function undoLastAction() {

  if (
    undoStack.length === 0
  ) {

    return;

  }


  const action =
    undoStack.pop();


  /*
     Only allow undoing actions
     belonging to today.
  */

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


/* =====================================================
   UNDO BUTTON
===================================================== */

function updateUndoButton() {

  const button =
    $("#undoBtn");


  button.disabled =
    undoStack.length === 0;


  button.title =
    undoStack.length > 0
      ? "Undo last action"
      : "Nothing to undo";

}


/* =====================================================
   TOAST
===================================================== */

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
   TOAST UNDO
===================================================== */

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
   UNDO BUTTON
===================================================== */

$("#undoBtn")
  .addEventListener(
    "click",
    undoLastAction
  );


/* =====================================================
   SOUND
===================================================== */

function beep() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;


    if (
      !AudioContext
    ) {

      return;

    }


    const context =
      new AudioContext();


    const gain =
      context.createGain();


    gain.gain.value =
      0.08;


    gain.connect(
      context.destination
    );


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


        oscillator.frequency.value =
          frequency;


        oscillator.type =
          "sine";


        oscillator.connect(
          gain
        );


        const start =
          context.currentTime +
          index * 0.18;


        oscillator.start(
          start
        );


        oscillator.stop(
          start + 0.12
        );

      }
    );

  } catch (error) {}

}


/* =====================================================
   NOTIFICATION
===================================================== */

function showNotification(
  meal
) {

  beep();


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
        );

    }

  }


  document.title =
    "🔔 " +
    meal.name +
    " — DailyFuel";


  setTimeout(
    () => {

      document.title =
        "DailyFuel — Food & Water Tracker";

    },
    5000
  );

}


/* =====================================================
   ALERT CHECKER
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
   WATER BUTTONS
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
   TEST SOUND
===================================================== */

$("#testSound")
  .addEventListener(
    "click",
    () => {

      beep();


      if (
        "Notification" in window
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
   RESET
===================================================== */

$("#resetBtn")
  .addEventListener(
    "click",
    () => {

      const answer =
        confirm(
          "Reset today's meals and water?"
        );


      if (!answer) {

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


/* =====================================================
   SCHEDULE TABS
===================================================== */

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


/* =====================================================
   OPEN SETTINGS
===================================================== */

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


/* =====================================================
   CLOSE SETTINGS
===================================================== */

function closeSettings() {

  $("#settingsModal")
    .classList.add(
      "hidden"
    );

}


/* =====================================================
   RENDER SCHEDULE EDITOR
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
          "12:00",

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
   SAVE SCHEDULE
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
        "Please enter a meal name and time."
      );

      return;

    }


    result.push({

      name,

      time

    });

  }


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

}


/* =====================================================
   THEME SYSTEM
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
   APPLY THEME
===================================================== */

function applyTheme() {

  const body =
    document.body;


  body.dataset.theme =
    theme.mode;


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


  localStorage.setItem(

    THEME_KEY,

    JSON.stringify(
      theme
    )

  );


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


  $("#accentColor")
    .value =
    theme.accent;


  $("#backgroundColor")
    .value =
    theme.background;


  $("#cardColor")
    .value =
    theme.card;

}


/* =====================================================
   THEME BUTTON
===================================================== */

$("#themeBtn")
  .addEventListener(
    "click",
    () => {

      $("#themeModal")
        .classList.remove(
          "hidden"
        );


      applyTheme();

    }
  );


/* =====================================================
   CLOSE THEME
===================================================== */

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
   THEME OPTIONS
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
   COLOR INPUTS
===================================================== */

$("#accentColor")
  .addEventListener(
    "input",
    event => {

      theme.accent =
        event.target.value;


      if (
        theme.mode ===
        "custom"
      ) {

        applyTheme();

      }

    }
  );


$("#backgroundColor")
  .addEventListener(
    "input",
    event => {

      theme.background =
        event.target.value;


      if (
        theme.mode ===
        "custom"
      ) {

        applyTheme();

      }

    }
  );


$("#cardColor")
  .addEventListener(
    "input",
    event => {

      theme.card =
        event.target.value;


      if (
        theme.mode ===
        "custom"
      ) {

        applyTheme();

      }

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


      localStorage.setItem(

        THEME_KEY,

        JSON.stringify(
          theme
        )

      );


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
   START APP
===================================================== */

applyTheme();

render();


/*
   Check meal alerts every second.
*/

setInterval(
  checkAlerts,
  1000
);


/*
   Refresh the interface every
   30 seconds.
*/

setInterval(
  render,
  30000
);


checkAlerts();
