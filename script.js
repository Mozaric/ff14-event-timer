let currentTimezone = 9;

function getServerDate() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + currentTimezone * 60000);
}

function getNextDailyTimes(hour, minute, rangeStart, rangeEnd) {
  const times = [];
  let cursor = new Date(rangeStart);

  cursor.setHours(hour, minute, 0, 0);

  while (cursor <= rangeEnd) {
    if (cursor >= rangeStart) {
      times.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return times;
}

function getNextWeeklyTimes(startDay, hour, minute, rangeStart, rangeEnd) {
  const times = [];
  const map = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };

  let cursor = new Date(rangeStart);
  cursor.setHours(hour, minute, 0, 0);

  while (cursor.getDay() !== map[startDay]) {
    cursor.setDate(cursor.getDate() + 1);
  }

  while (cursor <= rangeEnd) {
    times.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return times;
}

function renderTimeline(events) {

  const container = document.getElementById("timelineContainer");
  container.innerHTML = "";

  const now = getServerDate();

  const rangeStart = new Date(now);
  rangeStart.setDate(now.getDate() - 1);

  const rangeEnd = new Date(now);
  rangeEnd.setDate(now.getDate() + 6);

  const totalRange = rangeEnd - rangeStart;

  events.forEach(event => {

    const row = document.createElement("div");
    row.className = "relative";

    const title = document.createElement("div");
    title.className = "mb-2 text-sm text-cyan-300";
    title.textContent = event.name;

    const bar = document.createElement("div");
    bar.className = "relative h-6 bg-slate-700 rounded";

    let times = [];

    if (event.type === "daily") {
      const [h,m] = event.startTime.split(":").map(Number);
      times = getNextDailyTimes(h,m,rangeStart,rangeEnd);
    }

    if (event.type === "weekly") {
      const [h,m] = event.startTime.split(":").map(Number);
      times = getNextWeeklyTimes(event.startDay,h,m,rangeStart,rangeEnd);
    }

    times.forEach(t => {
      const percent = ((t - rangeStart) / totalRange) * 100;

      const dot = document.createElement("div");
      dot.className = "absolute top-0 w-2 h-6 bg-cyan-400 rounded";
      dot.style.left = percent + "%";

      bar.appendChild(dot);
    });

    // 現在時間線
    const nowPercent = ((now - rangeStart) / totalRange) * 100;

    const nowLine = document.createElement("div");
    nowLine.className = "absolute top-0 bottom-0 w-0.5 bg-red-500";
    nowLine.style.left = nowPercent + "%";

    bar.appendChild(nowLine);

    row.appendChild(title);
    row.appendChild(bar);
    container.appendChild(row);
  });
}

async function loadEvents() {
  const res = await fetch("events.json");
  const events = await res.json();

  function update() {
    renderTimeline(events);
  }

  update();
  setInterval(update,1000);
}

loadEvents();

