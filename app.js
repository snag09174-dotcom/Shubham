const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => [
  ...document.querySelectorAll(selector)
];


/* =========================
   DEFAULT SCHEDULE
========================= */

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


/* =========================
   STORAGE
========================= */

const SETTINGS_KEY =
  "dailyfuel-settings-v1";


function todayKey() {

  return (
    "dailyfuel-day-" +
    new Date().toISOString().slice(0, 10)
  );

}


let settings = loadSettings();

let dayState = loadDay();

let editingTab = "weekday";

let lastAlertKey = "";


/* =========================
   LOAD SETTINGS
========================= */

function loadSettings() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(SETTINGS_KEY)
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


/* =========================
   LOAD TODAY
========================= */

function loadDay() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(todayKey())
      );

    if (saved) {

      return {

        meals: saved.meals || {},

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


/* =========================
   SAVE
========================= */

function saveDay() {

  localStorage.setItem(

    todayKey(),

    JSON.stringify(dayState)

  );

}


function saveSettingsData() {

  localStorage.setItem(

    SETTINGS_KEY,

    JSON.stringify(settings)

  );

}


/* =========================
   DAY TYPE
========================= */

function isCollegeDay() {

  const day =
    new Date().getDay();

  return day >= 1 && day <= 5;

}


function activeSchedule() {

  if (isCollegeDay()) {

    return settings.weekday;

  }

  return settings.weekend;

}


/* =========================
   DATE
========================= */

function formatDate() {

  return new Intl.DateTimeFormat(

    undefined,

    {

      weekday: "long",

      year: "numeric",

      month: "long",

      day: "numeric"

    }

  ).format(new Date());

}


/* =========================
   RENDER APP
========================= */

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


  list.innerHTML = "";


  const now = new Date();

  const nowMinutes =
    now.getHours() * 60 +
    now.getMinutes();


  let next = null;


  schedule.forEach(
    (meal) => {

      const [hours, minutes] =
        meal.time
          .split(":")
          .map(Number);


      const mealMinutes =
        hours * 60 + minutes;


      const key =
        meal.time +
        "|" +
        meal.name;


      const completed =
        !!dayState.meals[key];


      if (
        !completed &&
        mealMinutes > nowMinutes &&
        !next
      ) {

        next = meal;

      }


      const row =
        document.createElement("label");


      row.className =
        "meal" +
        (completed ? " done" : "");


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

          ${
            completed
              ? "checked"
              : ""
          }

          aria-label="Mark ${
            escapeHtml(meal.name)
          } complete"

        >

      `;


      row
        .querySelector("input")
        .addEventListener(
          "change",
          (event) => {

            dayState.meals[key] =
              event.target.checked;

            saveDay();

            render();

          }
        );


      list.appendChild(row);

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
    Math.max(0, dayState.water);


  const target = 2500;


  $("#waterValue").textContent =
    water;


  const percentage =
    Math.min(
      100,
      (water / target) * 100
    );


  $("#waterBar").style.width =
    percentage + "%";


  $("#waterPercent").textContent =
    Math.round(percentage) + "%";

}


/* =========================
   TIME FORMAT
========================= */

function to12Hour(time) {

  const [hours, minutes] =
    time.split(":").map(Number);


  const suffix =
    hours >= 12
      ? "PM"
      : "AM";


  const hour =
    hours % 12 || 12;


  return (

    hour +
    ":" +
    String(minutes).padStart(2, "0") +
    " " +
    suffix

  );

}


/* =========================
   SECURITY
========================= */

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


/* =========================
   SOUND
========================= */

function beep() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;


    if (!AudioContext) return;


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
      [880, 660, 880];


    frequencies.forEach(
      (frequency, index) => {

        const oscillator =
          context.createOscillator();


        oscillator.frequency.value =
          frequency;


        oscillator.type =
          "sine";


        oscillator.connect(gain);


        const start =
          context.currentTime +
          index * 0.18;


        oscillator.start(start);


        oscillator.stop(
          start + 0.12
        );

      }
    );

  } catch (error) {}

}


/* =========================
   NOTIFICATION
========================= */

function showNotification(meal) {

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
            to12Hour(meal.time) +
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


/* =========================
   CHECK ALERTS
========================= */

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

    date
      .toISOString()
      .slice(0, 10)

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
      meal.time +
      "|" +
      meal.name;


    if (
      !dayState.meals[key]
    ) {

      showNotification(meal);

    }

  }

}


/* =========================
   WATER BUTTONS
========================= */

$$("[data-water]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        dayState.water =
          Math.max(

            0,

            dayState.water +
            Number(
              button.dataset.water
            )

          );


        saveDay();

        render();

      }
    );

  });


/* =========================
   TEST SOUND
========================= */

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
          .catch(() => {});

      }

    }
  );


/* =========================
   RESET
========================= */

$("#resetBtn")
  .addEventListener(
    "click",
    () => {

      const answer =
        confirm(

          "Reset today's meals and water?"

        );


      if (!answer) return;


      dayState = {

        meals: {},

        water: 0

      };


      saveDay();

      render();

    }
  );


/* =========================
   SETTINGS
========================= */

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


/* TABS */

$$(".tab")
  .forEach(tab => {

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

                item === tab

              );

            }
          );


        renderEditor();

      }
    );

  });


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


/* =========================
   SETTINGS EDITOR
========================= */

function renderEditor() {

  const editor =
    $("#scheduleEditor");


  editor.innerHTML = "";


  const rows =
    settings[editingTab]
      .map(meal => ({
        ...meal
      }));


  rows.forEach(
    (meal, index) => {

      const row =
        document.createElement("div");


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
            ] = rows;


            renderEditor();

          }
        );


      editor.appendChild(row);

    }
  );


  const add =
    document.createElement("button");


  add.type = "button";

  add.className =
    "secondary";


  add.textContent =
    "+ Add meal";


  add.addEventListener(
    "click",
    () => {

      rows.push({

        time: "12:00",

        name: "New meal"

      });


      settings[
        editingTab
      ] = rows;


      renderEditor();

    }
  );


  editor.appendChild(add);

}


/* =========================
   SAVE SCHEDULE
========================= */

function saveEditedSettings() {

  const rows =
    [
      ...document.querySelectorAll(
        "#scheduleEditor .editor-row"
      )
    ];


  const result = [];


  for (const row of rows) {

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


    if (!name || !time) {

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
    (a, b) =>
      a.time.localeCompare(
        b.time
      )
  );


  settings[
    editingTab
  ] = result;


  saveSettingsData();


  closeSettings();

  render();

}


/* =========================
   START APP
========================= */

render();


setInterval(
  checkAlerts,
  1000
);


setInterval(
  render,
  30000
);


checkAlerts();
