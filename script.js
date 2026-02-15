const timezoneOffset = 9 * 60; // JST

function getJSTDate() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + timezoneOffset * 60000);
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function getNextDailyReset(hour, minute) {
  const now = getJSTDate();
  let reset = new Date(now);
  reset.setHours(hour, minute, 0, 0);

  if (now >= reset) {
    reset.setDate(reset.getDate() + 1);
  }
  return reset;
}

function getNextWeeklyReset(startDay, hour, minute) {
  const now = getJSTDate();
  const map = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  const targetDay = map[startDay];

  let reset = new Date(now);
  let diff = targetDay - now.getDay();
  if (diff < 0) diff += 7;

  reset.setDate(now.getDate() + diff);
  reset.setHours(hour, minute, 0, 0);

  if (now >= reset) {
    reset.setDate(reset.getDate() + 7);
  }

  return reset;
}

function getStorageKey(eventId, resetTime) {
  return `${eventId}_${resetTime.getTime()}`;
}

async function loadEvents() {
  const response = await fetch("events.json");
  const events = await response.json();
  const container = document.getElementById("eventList");

  function update() {
    const now = getJSTDate();
    container.innerHTML = "";

    const calculated = events.map(event => {
      let nextReset;

      if (event.type === "daily") {
        const [h, m] = event.startTime.split(":").map(Number);
        nextReset = getNextDailyReset(h, m);
      }

      if (event.type === "weekly") {
        const [h, m] = event.startTime.split(":").map(Number);
        nextReset = getNextWeeklyReset(event.startDay, h, m);
      }

      return {
        ...event,
        nextReset,
        diff: nextReset - now
      };
    });

    calculated.sort((a,b) => a.diff - b.diff);

    calculated.forEach(event => {

      const key = getStorageKey(event.id, event.nextReset);
      const completed = localStorage.getItem(key) === "true";

      const div = document.createElement("div");
      div.className = `
        p-4 rounded-xl shadow-lg transition
        ${completed ? "bg-slate-700 opacity-60" : "bg-slate-800"}
      `;

      div.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <div class="text-lg font-semibold">
              ${event.name}
            </div>
            <div class="text-cyan-400 text-sm">
              剩餘時間：${formatTime(event.diff)}
            </div>
          </div>
          <input type="checkbox"
                 class="w-5 h-5 accent-cyan-400"
                 ${completed ? "checked" : ""}
          />
        </div>
      `;

      const checkbox = div.querySelector("input");

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          localStorage.setItem(key, "true");
        } else {
          localStorage.removeItem(key);
        }
        update();
      });

      container.appendChild(div);
    });
  }

  update();
  setInterval(update, 1000);
}

loadEvents();

