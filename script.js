const timezoneOffset = 9 * 60; // JST

function getJSTDate() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + timezoneOffset * 60000);
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

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

async function loadEvents() {
  const response = await fetch("events.json");
  const events = await response.json();

  const container = document.getElementById("eventList");

  function update() {
    container.innerHTML = "";

    events.forEach(event => {
      let nextReset;

      if (event.type === "daily") {
        const [hour, minute] = event.startTime.split(":").map(Number);
        nextReset = getNextDailyReset(hour, minute);
      } else {
        return; // 先不處理 weekly
      }

      const now = getJSTDate();
      const diff = nextReset - now;

      const div = document.createElement("div");
      div.className = "event";
      div.innerHTML = `
        <div class="event-name">${event.name}</div>
        <div class="timer">剩餘時間：${formatTime(diff)}</div>
      `;
      container.appendChild(div);
    });
  }

  update();
  setInterval(update, 1000);
}

loadEvents();

