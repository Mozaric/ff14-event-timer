const canvas = document.getElementById("timelineCanvas");
const ctx = canvas.getContext("2d");

let currentTimezone = 9;
let eventsData = [];
let hoverSegment = null;

const rowHeight = 70;
const leftPadding = 200;
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
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + currentTimezone * 60000);
}

function getRange() {
  const now = getServerDate();
  const start = new Date(now);
  start.setDate(now.getDate() - 1);

  const end = new Date(now);
  end.setDate(now.getDate() + 6);

  return { start, end, now };
}

// --- 取得每日區段
function getDailySegments(event, rangeStart, rangeEnd) {
  const segments = [];
  const [h,m] = event.startTime.split(":").map(Number);

  let cursor = new Date(rangeStart);
  cursor.setHours(h,m,0,0);

  while (cursor <= rangeEnd) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate()+1);

    segments.push({start,end});
    cursor.setDate(cursor.getDate()+1);
  }

  return segments;
}

// --- 取得每週區段
function getWeeklySegments(event, rangeStart, rangeEnd) {
  const map = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  const segments = [];
  const [h,m] = event.startTime.split(":").map(Number);

  let cursor = new Date(rangeStart);
  cursor.setHours(h,m,0,0);

  while (cursor.getDay() !== map[event.startDay]) {
    cursor.setDate(cursor.getDate()+1);
  }

  while (cursor <= rangeEnd) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate()+7);

    if (start <= rangeEnd)
      segments.push({start,end});

    cursor.setDate(cursor.getDate()+7);
  }

  return segments;
}

// --- 畫每日日期刻度
function drawScales(start,end,totalRange) {
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";

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

    ctx.fillText(`${cursor.getMonth()+1}/${cursor.getDate()}`, x+2, 15);

    cursor.setDate(cursor.getDate()+1);
  }
}

// --- 畫 Canvas
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const {start,end,now} = getRange();
  const totalRange = end - start;

  drawScales(start,end,totalRange);

  eventsData.forEach((event,index)=>{
    const y = index*rowHeight + 60;
    const color = categoryColors[event.category] || "#38bdf8";

    ctx.fillStyle = "white";
    ctx.font = "14px sans-serif";
    ctx.fillText(event.name, 10, y);

    const segments = event.type==="daily"
      ? getDailySegments(event,start,end)
      : getWeeklySegments(event,start,end);

    segments.forEach(seg=>{
      const x1 = leftPadding + ((seg.start-start)/totalRange)*(canvas.width-leftPadding-rightPadding);
      const x2 = leftPadding + ((seg.end-start)/totalRange)*(canvas.width-leftPadding-rightPadding);

      const key = `${event.id}_${seg.start.getTime()}`;
      const done = localStorage.getItem(key) === "true";

      const isHover = hoverSegment &&
        hoverSegment.eventId===event.id &&
        hoverSegment.start.getTime()===seg.start.getTime();

      ctx.strokeStyle = done ? "#64748b" : color;
      ctx.lineWidth = isHover ? 6 : 3;

      // 畫區段線
      ctx.beginPath();
      ctx.moveTo(x1,y);
      ctx.lineTo(x2,y);
      ctx.stroke();

      // start dot
      ctx.fillStyle = done ? "#64748b" : color;
      ctx.beginPath();
      ctx.arc(x1,y,6,0,Math.PI*2);
      ctx.fill();

      // end dot
      ctx.beginPath();
      ctx.arc(x2,y,6,0,Math.PI*2);
      ctx.fill();

      if (isHover) {
        ctx.fillStyle = "white";
        ctx.fillText(`${seg.start.toLocaleString()} ~ ${seg.end.toLocaleString()}`, x1, y-15);
      }
    });
  });

  // 現在時間紅線 + 顯示 HH:MM
  const nowX = leftPadding + ((now-start)/totalRange)*(canvas.width-leftPadding-rightPadding);
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(nowX,30);
  ctx.lineTo(nowX,canvas.height);
  ctx.stroke();

  ctx.fillStyle = "red";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    now.getHours().toString().padStart(2,'0') + ':' +
    now.getMinutes().toString().padStart(2,'0'),
    nowX,
    20
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
  const res = await fetch("events.json");
  eventsData = await res.json();
  resizeCanvas();
  draw(); // 先畫一次
  setInterval(draw, 60*1000); // 每分鐘更新紅線
}

loadEvents();

