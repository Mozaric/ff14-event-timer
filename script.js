const canvas = document.getElementById("timelineCanvas");
const ctx = canvas.getContext("2d");

let currentTimezone = 8;
let eventsData = [];
let hoverSegment = null;

const rowHeight = 60;
const leftPadding = 300;
const rightPadding = 40;

const categoryColors = {
  gold_saucer: "#06b6d4",
  gc: "#22c55e",
  roulette: "#f59e0b",
  weekly: "#a78bfa"
};

function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = eventsData.length * rowHeight + 80;
}
window.addEventListener("resize", resizeCanvas);

function getServerDate() {
  // currentTimezone = 9 代表 UTC+9
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000; // 轉成 UTC
  const serverTime = new Date(utc + currentTimezone * 3600 * 1000); // 再加上伺服器時區
  return serverTime;
}

function getRange() {
  const now = getServerDate();

  // 前一天
  const start = new Date(now);
  start.setDate(now.getDate() - 1);
  start.setHours(0, 0, 0, 0); // 設定成 00:00

  const end = new Date(now);
  end.setDate(now.getDate() + 8);
  end.setHours(0, 0, 0, 0); // 設定成 00:00

  return { start, end, now };
}

// --- 取得每日區段
function getDailySegments(event, rangeStart, rangeEnd) {
  const segments = [];

  const [sh, sm] = event.startTime.split(":").map(Number);
  const [eh, em] = event.endTime.split(":").map(Number);

  // 找到 rangeStart 當天的 startTime
  let cursor = new Date(rangeStart);
  cursor.setHours(sh, sm, 0, 0);

  // 如果這個 startTime 在 rangeStart 之後
  // 代表我們少算了一段，要往前一天
  if (cursor > rangeStart) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (cursor < rangeEnd) {
    const start = new Date(cursor);

    const end = new Date(cursor);
    end.setDate(end.getDate() + 1);
    end.setHours(eh, em, 0, 0);

    // 判斷是否有 overlap
    if (end > rangeStart && start < rangeEnd) {
      segments.push({
        start: new Date(Math.max(start, rangeStart)),
        end: new Date(Math.min(end, rangeEnd))
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return segments;
}

// --- 取得每週區段
function getWeeklySegments(event, rangeStart, rangeEnd) {
  const dayMap = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  const segments = [];

  const startDay = dayMap[event.startDay];
  const endDay = dayMap[event.endDay];

  const [startH, startM] = event.startTime.split(":").map(Number);
  const [endH, endM] = event.endTime.split(":").map(Number);

  // 從 rangeStart 前一週開始找，避免漏掉跨週事件
  let cursor = new Date(rangeStart);
  cursor.setDate(cursor.getDate() - 7);
  cursor.setHours(0,0,0,0);

  // 找到第一個 startDay
  while (cursor.getDay() !== startDay) {
    cursor.setDate(cursor.getDate() + 1);
  }

  while (cursor <= rangeEnd) {

    // === 計算該週 start ===
    const eventStart = new Date(cursor);
    eventStart.setHours(startH, startM, 0, 0);

    // === 計算該週 end ===
    const eventEnd = new Date(eventStart);

    let dayDiff = endDay - startDay;

    // 🔥 核心修正
    if (
      dayDiff < 0 ||
      (dayDiff === 0 && (endH < startH || (endH === startH && endM <= startM)))
    ) {
      dayDiff += 7;
    }

    eventEnd.setDate(eventEnd.getDate() + dayDiff);
    eventEnd.setHours(endH, endM, 0, 0);

    // ========= overlap 判斷 =========
    if (eventEnd > rangeStart && eventStart < rangeEnd) {

      const displayStart = eventStart < rangeStart
        ? new Date(rangeStart)
        : eventStart;

      const displayEnd = eventEnd > rangeEnd
        ? new Date(rangeEnd)
        : eventEnd;

      segments.push({
        start: displayStart,
        end: displayEnd,
        originalStart: eventStart
      });
    }

    cursor.setDate(cursor.getDate() + 7);
  }

  return segments;
}

// --- 畫每日日期刻度
function drawScales(start,end,totalRange) {
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";

  const weekMap = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  let cursor = new Date(start);
  cursor.setHours(0,0,0,0);

  while (cursor <= end) {
    const percent = (cursor - start)/totalRange;
    const x = leftPadding + percent*(canvas.width-leftPadding-rightPadding);

    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x,25);
    ctx.lineTo(x,canvas.height);
    ctx.stroke();

    const month = cursor.getMonth()+1;
    const date = cursor.getDate();
    const weekday = weekMap[cursor.getDay()];

    ctx.fillText(`${month}/${date} ${weekday}`, x+2, 15);

    cursor.setDate(cursor.getDate()+1);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { start, end, now } = getRange();
  const totalRange = end - start;

  // =========================
  // ① 日期垂直刻度線
  // =========================
  drawScales(start, end, totalRange);

  // =========================
  // ② 橫向基準細線（對齊名字與 timeline）
  // =========================
  eventsData.forEach((event, index) => {
    const y = index * rowHeight + 60;
    const lineStartX = leftPadding - 10;
    ctx.strokeStyle = "#475569"; // 細線顏色
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lineStartX, y);
    ctx.lineTo(canvas.width - rightPadding, y);
    ctx.stroke();
  });

  // =========================
  // ③ 畫事件 timeline
  // =========================
  eventsData.forEach((event, index) => {
    const y = index * rowHeight + 60;
    const color = categoryColors[event.category] || "#38bdf8";

    // 畫事件名稱
    ctx.fillStyle = "white";
    ctx.font = "14px sans-serif";
    ctx.fillText(event.name, 10, y);

    let segments = [];
    if (event.type === "daily") {
      segments = getDailySegments(event, start, end);
    } else if (event.type === "weekly") {
      segments = getWeeklySegments(event, start, end);
    }

    segments.forEach((seg, segIndex) => {
      const x1 = leftPadding + ((seg.start - start) / totalRange) * (canvas.width - leftPadding - rightPadding);
      const x2 = leftPadding + ((seg.end - start) / totalRange) * (canvas.width - leftPadding - rightPadding);

      const key = `${event.id}_${seg.start.getTime()}`;
      const done = localStorage.getItem(key) === "true";

      const isHover = hoverSegment &&
        hoverSegment.eventId === event.id &&
        hoverSegment.start.getTime() === seg.start.getTime();

      // 畫區段線
      ctx.strokeStyle = done ? "#64748b" : color;
      // if (done) {
      //   ctx.strokeStyle = "#64748b";
      //   ctx.strokeStyle = segIndex % 2 === 0 ? "#AAAAAA" : "#494949";
      // } else {
      //   ctx.strokeStyle = color;
      //   ctx.strokeStyle = segIndex % 2 === 0 ? "#00CC16" : "#A300CC";
      // }
      ctx.lineWidth = isHover ? 10 : 3;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();

      // 起點圓點
      ctx.fillStyle = done ? "#64748b" : color;
      ctx.beginPath();
      ctx.arc(x1, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // 終點圓點
      ctx.beginPath();
      ctx.arc(x2, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // // hover 顯示時間
      // if (isHover) {
      //   ctx.fillStyle = "white";
      //   ctx.font = "12px sans-serif";
      //   ctx.fillText(
      //     `${seg.start.toLocaleString()} ~ ${seg.end.toLocaleString()}`,
      //     x1,
      //     y - 15
      //   );
      // }
    });
  });

  // =========================
  // ④ 現在時間紅線 + HH:MM
  // =========================
  const nowX = leftPadding + ((now - start) / totalRange) * (canvas.width - leftPadding - rightPadding);

  ctx.strokeStyle = "red";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(nowX, 30);
  ctx.lineTo(nowX, canvas.height);
  ctx.stroke();

  ctx.fillStyle = "red";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    now.getHours().toString().padStart(2, '0') + ':' +
    now.getMinutes().toString().padStart(2, '0'),
    nowX,
    27
  );
  ctx.textAlign = "start";
}

// --- hover 判斷
canvas.addEventListener("mousemove",(e)=>{
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const {start,end} = getRange();
  const totalRange = end - start;

  hoverSegment = null;

  eventsData.forEach((event,index)=>{
    if (event.type !== "daily" && event.type !== "weekly") return;
    const y = index*rowHeight + 60;
    const segments = event.type==="daily"
      ? getDailySegments(event,start,end)
      : getWeeklySegments(event,start,end);

    segments.forEach(seg=>{
      const x1 = leftPadding + ((seg.start-start)/totalRange)*(canvas.width-leftPadding-rightPadding);
      const x2 = leftPadding + ((seg.end-start)/totalRange)*(canvas.width-leftPadding-rightPadding);

      if (mouseX>=x1 && mouseX<=x2 && Math.abs(mouseY-y)<10) {
        hoverSegment={eventId:event.id,start:seg.start};
      }
    });
  });

  draw(); // mouse move 立即 redraw，保持 hover 高亮
});

// --- 點擊標記完成
canvas.addEventListener("click",()=>{
  if (hoverSegment) {
    const key = `${hoverSegment.eventId}_${hoverSegment.start.getTime()}`;
    if (localStorage.getItem(key)) localStorage.removeItem(key);
    else localStorage.setItem(key,"true");
    draw(); // 立即更新線條顏色
  }
});

// --- 載入事件
async function loadEvents() {
  const res = await fetch("./events.json");
  eventsData = await res.json();
  resizeCanvas();
  draw(); // 先畫一次
  setInterval(draw, 60*1000); // 每分鐘更新紅線
}

loadEvents();

