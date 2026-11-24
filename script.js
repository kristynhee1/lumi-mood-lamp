// ============================================================
// LUMI – script.js
// Inputs: mood dial, coffee checkbox, time dropdown, hover.
// Each input changes ONE simple variable. getState() combines them.
// ============================================================

// ------------------------------------------------------------
// 1. VARIABLES – the "state" of the system
// ------------------------------------------------------------
let mood = 50;               // number from the dial (0-100)
let caffeinated = false;     // from the checkbox
let timeOfDay = "afternoon"; // from the dropdown
let touched = false;         // true while the mouse is on the lamp
let missCount = 0;           // how many times in a row Lumi misread you
let currentState = "";       // the lamp's current personality

// grab the HTML elements we need
const moodDial   = document.getElementById("moodDial");
const moodLabel  = document.getElementById("moodLabel");
const coffeeBox  = document.getElementById("coffee");
const timeSelect = document.getElementById("timeSelect");
const acrylic    = document.getElementById("acrylic");
const lampWrap   = document.getElementById("lampWrap");
const stageCard  = document.getElementById("stageCard");
const speech     = document.getElementById("speech");
const hint       = document.getElementById("hint");
const debug      = document.getElementById("debug");

// ------------------------------------------------------------
// 2. THE LAMP'S PERSONALITIES
//    color + brightness + a line to say + an animation class
// ------------------------------------------------------------
const states = {
  neutral:          { color: "#fff0d0", bright: 0.6,  say: "Hi.",                          anim: "" },
  toneDeaf:         { color: "#ffe600", bright: 1.0,  say: "Rise and shine!!",             anim: "" },
  overcompensating: { color: "#ffffff", bright: 1.0,  say: "Great! Let's keep it going!",  anim: "buzz" },
  jittery:          { color: "#ffd27a", bright: 0.85, say: "Okay, okay, okay...",          anim: "flicker" },
  gotIt:            { color: "#ff9a3c", bright: 0.45, say: "I'm here.",                    anim: "breathe" },
  leaningIn:        { color: "#ff9a3c", bright: 0.6,  say: "I'm not going anywhere.",      anim: "breathe" },
  flinch:           { color: "#ffffff", bright: 1.0,  say: "Too much?",                    anim: "" }
};

// ------------------------------------------------------------
// 3. LOGIC – decide which personality to show
//    The most specific combinations go FIRST. If a general rule
//    came first, it would "catch" the situation before the
//    special combo ever got a chance to run.
// ------------------------------------------------------------
// stateFor() takes the four inputs as parameters, so we can use the
// SAME logic for the live lamp AND for the calendar's old records.
function stateFor(m, t, c, touch) {
  const low  = m < 33;
  const high = m > 66;

  if (low && t === "night" && !c && touch) {
    return "leaningIn";                       // the best moment
  } else if (low && t === "night" && !c) {
    return "gotIt";
  } else if (low && t === "morning" && touch) {
    return "flinch";
  } else if (high && t === "night" && touch) {
    return "flinch";
  } else if (low && t === "morning") {
    return "toneDeaf";
  } else if (high && t === "night") {
    return "overcompensating";
  } else if (low && c) {
    return "jittery";
  } else {
    return "neutral";
  }
}

function getState() {
  return stateFor(mood, timeOfDay, caffeinated, touched);
}

// ------------------------------------------------------------
// 4. RENDER – show the current state on screen
// ------------------------------------------------------------
function render() {
  const newState = getState();
  const s = states[newState];

  // colors + brightness go to CSS through variables
  document.documentElement.style.setProperty("--glow", s.color);
  document.documentElement.style.setProperty("--bright", s.bright);

  // only change text / animation when the state actually changes
  if (newState !== currentState) {
    speech.textContent = s.say;
    stageCard.dataset.state = newState;      // CSS uses this for the eyes

    // restart the animation class on the glowing heart
    acrylic.classList.remove("flicker", "buzz", "breathe");
    if (s.anim) acrylic.classList.add(s.anim);

    // lamp leans toward you / flinches away
    lampWrap.classList.toggle("lean", newState === "leaningIn");
    lampWrap.classList.remove("flinch");
    if (newState === "flinch") {
      void lampWrap.offsetWidth;             // lets the animation replay
      lampWrap.classList.add("flinch");
    }

    // count misreads so we can offer a hint
    if (["toneDeaf", "overcompensating", "jittery", "flinch"].includes(newState)) {
      missCount++;
    } else if (newState === "gotIt" || newState === "leaningIn") {
      missCount = 0;
    }
    currentState = newState;
  }

  // the whole page changes with the time of day
  document.body.classList.remove("morning", "night");
  if (timeOfDay === "morning") document.body.classList.add("morning");
  if (timeOfDay === "night")   document.body.classList.add("night");

  // hint appears after 4 misreads
  if (missCount >= 4) {
    hint.textContent = "Lumi seems to listen differently when it's dark and quiet...";
    hint.style.opacity = 1;
  } else {
    hint.style.opacity = 0;
  }

  // show the state variables so you can SEE the logic working
  debug.textContent =
    "mood=" + mood + "  coffee=" + caffeinated +
    "  time=" + timeOfDay + "  touched=" + touched +
    "  →  " + currentState;
}

// ------------------------------------------------------------
// 4b. ROOM LIGHTING – the whole page gets darker or brighter
//     as the mood slider moves
//       mood 0   -> dark room (lamp is a spotlight in the dark)
//       mood 50  -> normal light
//       mood 100 -> sunny, bright room
// ------------------------------------------------------------
const darkness   = document.getElementById("darkness");
const brightness = document.getElementById("brightness");

function updateLight() {
  if (mood < 50) {
    // 0 -> 1 as mood goes from 50 down to 0
    darkness.style.opacity   = (50 - mood) / 50;
    brightness.style.opacity = 0;
  } else {
    darkness.style.opacity   = 0;
    brightness.style.opacity = (mood - 50) / 50;
  }

  // keep the spotlight centered on the lamp, even if the window resizes
  const r = lampWrap.getBoundingClientRect();
  document.documentElement.style.setProperty("--lx", (r.left + r.width / 2) + "px");
  document.documentElement.style.setProperty("--ly", (r.top + r.height / 3) + "px");
}
window.addEventListener("resize", updateLight);
window.addEventListener("scroll", updateLight);

// ------------------------------------------------------------
// 4c. MOOD CALENDAR
//     Each day keeps a record: how you felt (mood), coffee, time of
//     day, and what Lumi "heard". Today's record is YOURS (it updates
//     when you use the controls and is saved in the browser).
//     Earlier days are made-up sample entries so the calendar isn't empty.
// ------------------------------------------------------------
const calendar = document.getElementById("calendar");
const calTitle = document.getElementById("calTitle");

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();            // 0 = January
const todayNum = now.getDate();
const monthNames = ["January","February","March","April","May","June","July",
                    "August","September","October","November","December"];
const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// records[dayNumber] = { mood, coffee, time }
const records = {};

// sample past days (some days are skipped on purpose = "no record")
for (let d = 1; d < todayNum; d++) {
  if (d % 5 === 0) continue;                       // skipped day
  records[d] = {
    mood: (d * 37 + 11) % 101,                     // pseudo-random 0-100
    coffee: d % 3 === 0,
    time: ["morning", "afternoon", "night"][d % 3]
  };
}

// load today's saved record from the browser (if there is one)
const storageKey = "lumi-record-" + year + "-" + month + "-" + todayNum;
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) records[todayNum] = JSON.parse(saved);
} catch (err) { /* storage might be blocked; that's okay */ }

// called when the user changes an input: save today's record
function recordToday() {
  records[todayNum] = { mood: mood, coffee: caffeinated, time: timeOfDay };
  try { localStorage.setItem(storageKey, JSON.stringify(records[todayNum])); } catch (err) {}
  drawCalendar();
}

function drawCalendar() {
  calTitle.textContent = monthNames[month] + " " + year + " · Mood calendar";
  calendar.innerHTML = "";

  // weekday headers
  dayNames.forEach(function (n) {
    const h = document.createElement("div");
    h.className = "cal-head";
    h.textContent = n;
    calendar.appendChild(h);
  });

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // blank cells before the 1st
  for (let i = 0; i < firstWeekday; i++) {
    const blank = document.createElement("div");
    blank.className = "day empty";
    calendar.appendChild(blank);
  }

  // one cell per day
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement("div");
    cell.className = "day";
    const col = (firstWeekday + d - 1) % 7;         // 0-6 = column in the week
    if (col <= 1) cell.classList.add("left");
    if (col >= 5) cell.classList.add("right");
    if (d === todayNum) cell.classList.add("today");
    if (d > todayNum)   cell.classList.add("future");

    cell.innerHTML = "<span>" + d + "</span>";

    const rec = records[d];
    if (rec) {
      const st = stateFor(rec.mood, rec.time, rec.coffee, false);
      const s = states[st];
      const misread = ["toneDeaf", "overcompensating", "jittery", "flinch"].includes(st);
      const when = new Date(year, month, d);

      cell.classList.add("has-record");
      cell.innerHTML +=
        '<div class="dot" style="--dot:' + s.color + '"></div>' +
        '<div class="tip" style="--tip-color:' + s.color + '">' +
          '<div class="tip-date">' + dayNames[when.getDay()] + ", " + monthNames[month] + " " + d + "</div>" +
          "You felt: <b>" + rec.mood + "/100</b><br>" +
          "Coffee: " + (rec.coffee ? "yes" : "no") + " · " + rec.time + "<br>" +
          '<div class="tip-quote">Lumi said: “' + s.say + "”</div>" +
          '<div class="tip-verdict">' +
            (misread ? "Lumi misread you that day."
                     : (st === "neutral" ? "Lumi had nothing special to say."
                                         : "Lumi understood you.")) +
          "</div>" +
        "</div>";
    } else if (d <= todayNum) {
      cell.innerHTML +=
        '<div class="tip"><div class="tip-date">' + monthNames[month] + " " + d + "</div>" +
        "No record for this day.</div>";
    }
    calendar.appendChild(cell);
  }
}

// ------------------------------------------------------------
// 5. EVENT LISTENERS – one per input
// ------------------------------------------------------------
moodDial.addEventListener("input", function (e) {
  mood = Number(e.target.value);
  moodLabel.textContent = mood;
  updateLight();
  render();
  recordToday();
});

coffeeBox.addEventListener("change", function (e) {
  caffeinated = e.target.checked;
  render();
  recordToday();
});

timeSelect.addEventListener("change", function (e) {
  timeOfDay = e.target.value;
  render();
  recordToday();
});

acrylic.addEventListener("mouseenter", function () {
  touched = true;
  render();
});

acrylic.addEventListener("mouseleave", function () {
  touched = false;
  render();
});

// show the starting state
updateLight();
render();
drawCalendar();
