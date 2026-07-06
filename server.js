const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 8000);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");

const statusLabels = new Set(["requested", "confirmed", "completed", "cancelled"]);

const hospitals = [
  { id: "busan-med", name: "부산 메디체크 내과", dept: "내과", packages: ["종합검진", "간 기능", "당뇨"], slots: ["09:00", "10:30", "13:30", "15:00"] },
  { id: "centum-gi", name: "센텀 소화기클리닉", dept: "소화기내과", packages: ["간 기능", "종합검진"], slots: ["09:30", "11:00", "14:00", "16:00"] },
  { id: "seoul-endo", name: "서울 라이프내분비센터", dept: "내분비내과", packages: ["당뇨", "이상지질혈증"], slots: ["09:00", "10:00", "14:30", "16:30"] },
  { id: "daegu-kidney", name: "대구 신장건강의원", dept: "신장내과", packages: ["신장 기능", "종합검진"], slots: ["09:20", "10:40", "13:40", "15:20"] },
  { id: "online-lab", name: "온라인 검진상담 Lab", dept: "가정의학과", packages: ["종합검진", "빈혈", "당뇨"], slots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"] },
  { id: "seoul-heart", name: "서울 하트리스크 클리닉", dept: "심장내과", packages: ["이상지질혈증", "종합검진"], slots: ["09:10", "10:50", "14:10", "15:50"] }
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

ensureDataFile();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true });
    }

    if (url.pathname === "/api/bookings" && req.method === "GET") {
      return sendJson(res, 200, { bookings: readBookings() });
    }

    if (url.pathname === "/api/bookings" && req.method === "POST") {
      const body = await readJsonBody(req);
      return createBooking(res, body);
    }

    const bookingMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)$/);
    if (bookingMatch && req.method === "PATCH") {
      const body = await readJsonBody(req);
      return updateBookingStatus(res, decodeURIComponent(bookingMatch[1]), body.status);
    }

    if (url.pathname.startsWith("/api/")) {
      return sendJson(res, 404, { error: "API 경로를 찾을 수 없습니다." });
    }

    return serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "서버 처리 중 오류가 발생했습니다." });
  }
});

server.listen(PORT, () => {
  console.log(`LabInsight server running at http://localhost:${PORT}`);
});

function createBooking(res, payload) {
  const hospital = hospitals.find((item) => item.id === payload.hospitalId);
  const validationError = validateBooking(payload, hospital);
  if (validationError) return sendJson(res, 400, { error: validationError });

  const bookings = readBookings();
  const conflict = bookings.some((booking) =>
    booking.hospitalId === payload.hospitalId &&
    booking.date === payload.date &&
    booking.time === payload.time &&
    booking.status !== "cancelled"
  );
  if (conflict) return sendJson(res, 409, { error: "이미 예약된 시간입니다. 다른 시간을 선택해주세요." });

  const now = new Date().toISOString();
  const booking = {
    id: makeBookingId(),
    hospitalId: hospital.id,
    hospital: hospital.name,
    department: hospital.dept,
    name: String(payload.name || "").trim(),
    phone: String(payload.phone || "").trim(),
    birthDate: payload.birthDate,
    packageName: payload.packageName,
    date: payload.date,
    time: payload.time,
    purpose: String(payload.purpose || "").trim(),
    consent: Boolean(payload.consent),
    status: "requested",
    createdAt: now,
    updatedAt: now
  };

  bookings.unshift(booking);
  writeBookings(bookings);
  return sendJson(res, 201, booking);
}

function updateBookingStatus(res, id, status) {
  if (!statusLabels.has(status)) {
    return sendJson(res, 400, { error: "변경할 수 없는 예약 상태입니다." });
  }
  const bookings = readBookings();
  const target = bookings.find((booking) => booking.id === id);
  if (!target) return sendJson(res, 404, { error: "예약을 찾을 수 없습니다." });
  target.status = status;
  target.updatedAt = new Date().toISOString();
  writeBookings(bookings);
  return sendJson(res, 200, target);
}

function validateBooking(payload, hospital) {
  if (!hospital) return "선택한 병원을 찾을 수 없습니다.";
  if (!payload.name || !payload.phone || !payload.birthDate || !payload.packageName || !payload.date || !payload.time) {
    return "필수 예약 정보를 모두 입력해주세요.";
  }
  if (!payload.consent) return "개인정보 수집·이용 동의가 필요합니다.";
  if (!hospital.packages.includes(payload.packageName)) return "해당 병원에서 제공하지 않는 검진 항목입니다.";
  if (!hospital.slots.includes(payload.time)) return "해당 병원에서 제공하지 않는 예약 시간입니다.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) return "예약 날짜 형식이 올바르지 않습니다.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.birthDate)) return "생년월일 형식이 올바르지 않습니다.";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(`${payload.date}T00:00:00`);
  if (selectedDate <= today) return "예약 날짜는 내일부터 선택할 수 있습니다.";
  return "";
}

function serveStatic(requestPath, res) {
  const cleanPath = requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const filePath = path.normalize(path.join(ROOT_DIR, cleanPath));
  if (!filePath.startsWith(ROOT_DIR)) {
    return sendText(res, 403, "Forbidden");
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") return sendText(res, 404, "Not found");
      return sendText(res, 500, "Server error");
    }
    const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BOOKINGS_FILE)) fs.writeFileSync(BOOKINGS_FILE, "[]\n", "utf8");
}

function readBookings() {
  ensureDataFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function writeBookings(bookings) {
  ensureDataFile();
  fs.writeFileSync(BOOKINGS_FILE, `${JSON.stringify(bookings, null, 2)}\n`, "utf8");
}

function makeBookingId() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `LI-${stamp}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}
