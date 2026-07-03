(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const storageKey = "labinsight-bookings";

  const labItems = [
    { id: "ast", name: "AST", unit: "U/L", normal: [0, 40], caution: [41, 80], desc: "간세포 손상과 관련된 효소입니다." },
    { id: "alt", name: "ALT", unit: "U/L", normal: [0, 40], caution: [41, 80], desc: "간세포 손상과 관련된 효소이며 지방간, 간염 등에서 상승할 수 있습니다." },
    { id: "ggtp", name: "γ-GTP", unit: "U/L", normal: [0, 60], caution: [61, 120], desc: "간담도계, 음주, 지방간과 관련 가능성이 있습니다." },
    { id: "glucose", name: "공복혈당", unit: "mg/dL", normal: [70, 99], caution: [100, 125], desc: "당대사 및 당뇨 위험도 평가에 참고합니다." },
    { id: "hba1c", name: "HbA1c", unit: "%", normal: [0, 5.6], caution: [5.7, 6.4], desc: "최근 2~3개월 평균 혈당 상태를 반영합니다." },
    { id: "totalChol", name: "총콜레스테롤", unit: "mg/dL", normal: [0, 199], caution: [200, 239], desc: "심혈관 및 대사 위험도 평가에 참고합니다." },
    { id: "triglyceride", name: "중성지방", unit: "mg/dL", normal: [0, 149], caution: [150, 199], desc: "이상지질혈증, 지방간, 대사 상태와 관련됩니다." },
    { id: "hdl", name: "HDL 콜레스테롤", unit: "mg/dL", normal: [40, 999], caution: [35, 39], lowDanger: true, desc: "낮을수록 심혈관 위험 관리가 필요할 수 있습니다." },
    { id: "ldl", name: "LDL 콜레스테롤", unit: "mg/dL", normal: [0, 129], caution: [130, 159], desc: "심혈관 위험도 평가에서 중요한 지표입니다." },
    { id: "creatinine", name: "크레아티닌", unit: "mg/dL", normal: [0.5, 1.2], caution: [1.21, 1.5], desc: "신장 기능 평가에 참고합니다." },
    { id: "egfr", name: "eGFR", unit: "mL/min/1.73㎡", normal: [90, 200], caution: [60, 89], lowDanger: true, desc: "신장 여과 기능을 추정하는 지표입니다." },
    { id: "uricAcid", name: "요산", unit: "mg/dL", normal: [2.5, 7.0], caution: [7.1, 8.9], desc: "통풍 및 대사 상태와 관련될 수 있습니다." },
    { id: "hemoglobin", name: "혈색소", unit: "g/dL", normal: [12, 17.5], caution: [10, 11.9], lowDanger: true, desc: "빈혈 또는 다혈증 가능성 평가에 참고합니다." },
    { id: "wbc", name: "백혈구", unit: "/µL", normal: [4000, 10000], caution: [3000, 3999], bothSides: true, desc: "염증, 감염, 면역 상태를 참고하는 지표입니다." },
    { id: "platelet", name: "혈소판", unit: "×10³/µL", normal: [150, 450], caution: [100, 149], bothSides: true, desc: "출혈 및 혈전 관련 상태를 참고하는 지표입니다." }
  ];

  const sampleData = {
    gender: "male", age: 46, ast: 48, alt: 72, ggtp: 135, glucose: 112, hba1c: 6.1,
    totalChol: 224, triglyceride: 210, hdl: 38, ldl: 151, creatinine: 1.08, egfr: 82,
    uricAcid: 7.8, hemoglobin: 14.3, wbc: 7200, platelet: 245
  };

  const hospitals = [
    { name: "부산 메디체크 내과", region: "부산", dept: "내과", packages: ["종합검진", "간 기능", "당뇨"], price: "90,000원~", rating: 4.7, date: "7월 8일" },
    { name: "센텀 소화기클리닉", region: "부산", dept: "소화기내과", packages: ["간 기능", "종합검진"], price: "120,000원~", rating: 4.8, date: "7월 10일" },
    { name: "서울 라이프내분비센터", region: "서울", dept: "내분비내과", packages: ["당뇨", "이상지질혈증"], price: "110,000원~", rating: 4.6, date: "7월 9일" },
    { name: "대구 신장건강의원", region: "대구", dept: "신장내과", packages: ["신장 기능", "종합검진"], price: "100,000원~", rating: 4.5, date: "7월 12일" },
    { name: "온라인 검진상담 Lab", region: "온라인 상담", dept: "가정의학과", packages: ["종합검진", "빈혈", "당뇨"], price: "30,000원~", rating: 4.4, date: "오늘 가능" },
    { name: "서울 하트리스크 클리닉", region: "서울", dept: "심장내과", packages: ["이상지질혈증", "종합검진"], price: "150,000원~", rating: 4.9, date: "7월 11일" }
  ];

  let selectedHospitalName = "";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindNav();
    bindOcr();
    bindForm();
    bindHospitals();
    bindBookingModal();
    renderHospitals();
  }

  function bindNav() {
    const toggle = byId("navToggle") || $(".nav-toggle");
    const links = byId("navLinks");
    if (!toggle || !links) return;
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", (event) => {
      if (event.target.tagName === "A") {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  function bindOcr() {
    const runBtn = byId("runOcrBtn");
    const applyBtn = byId("applyOcrBtn");
    if (runBtn) runBtn.addEventListener("click", runOcr);
    if (applyBtn) applyBtn.addEventListener("click", () => {
      const text = byId("ocrText")?.value || "";
      const count = applyValuesFromText(text);
      setStatus("ocrStatus", count ? `${count}개 항목을 입력 폼에 반영했습니다.` : "인식 가능한 수치를 찾지 못했습니다. 수동 입력을 이용하세요.");
    });
  }

  async function runOcr() {
    const fileInput = byId("ocrFile");
    const textArea = byId("ocrText");
    const runBtn = byId("runOcrBtn");
    if (!fileInput || !textArea) return;
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      setStatus("ocrStatus", "먼저 이미지 파일을 선택해주세요.");
      return;
    }
    if (!window.Tesseract || typeof window.Tesseract.recognize !== "function") {
      setStatus("ocrStatus", "OCR 라이브러리를 불러오지 못했습니다. 네트워크를 확인하거나 수동 입력을 이용하세요.");
      return;
    }
    try {
      runBtn.disabled = true;
      setStatus("ocrStatus", "OCR을 실행 중입니다. 이미지 품질에 따라 시간이 걸릴 수 있습니다.");
      const result = await window.Tesseract.recognize(file, "kor+eng", {
        logger: (message) => {
          if (message.status) setStatus("ocrStatus", `OCR 진행: ${message.status} ${Math.round((message.progress || 0) * 100)}%`);
        }
      });
      const text = result?.data?.text || "";
      textArea.value = text;
      const count = applyValuesFromText(text);
      setStatus("ocrStatus", `OCR 완료. ${count}개 항목을 자동 반영했습니다. 필요한 값은 직접 수정하세요.`);
    } catch (error) {
      console.error(error);
      setStatus("ocrStatus", "OCR 처리 중 오류가 발생했습니다. 수동 입력은 계속 사용할 수 있습니다.");
    } finally {
      runBtn.disabled = false;
    }
  }

  function applyValuesFromText(text) {
    if (!text || typeof text !== "string") return 0;
    const aliases = {
      ast: ["AST", "GOT"], alt: ["ALT", "GPT"], ggtp: ["γ-GTP", "감마지티피", "GGT", "r-GTP"],
      glucose: ["공복혈당", "FBS", "Glucose"], hba1c: ["HbA1c", "당화혈색소"],
      totalChol: ["총콜레스테롤", "Total Cholesterol", "T-CHO"], triglyceride: ["중성지방", "Triglyceride", "TG"],
      hdl: ["HDL", "HDL 콜레스테롤"], ldl: ["LDL", "LDL 콜레스테롤"],
      creatinine: ["크레아티닌", "Creatinine"], egfr: ["eGFR", "EGFR"], uricAcid: ["요산", "Uric Acid"],
      hemoglobin: ["혈색소", "Hemoglobin", "Hb"], wbc: ["백혈구", "WBC"], platelet: ["혈소판", "Platelet", "PLT"]
    };
    let count = 0;
    Object.entries(aliases).forEach(([id, names]) => {
      const value = findFirstNumberAfter(text, names);
      const input = byId(id);
      if (input && Number.isFinite(value)) {
        input.value = value;
        count += 1;
      }
    });
    return count;
  }

  function findFirstNumberAfter(text, names) {
    for (const name of names) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`${escaped}[^0-9]{0,18}([0-9]+(?:[.,][0-9]+)?)`, "i");
      const match = text.match(regex);
      if (match) return Number(match[1].replace(",", "."));
    }
    return NaN;
  }

  function bindForm() {
    const form = byId("healthForm");
    byId("sampleBtn")?.addEventListener("click", () => fillForm(sampleData));
    byId("clearBtn")?.addEventListener("click", () => form?.reset());
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = collectFormData();
      renderReport(data);
      byId("report")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function fillForm(data) {
    Object.entries(data).forEach(([id, value]) => {
      const input = byId(id);
      if (input) input.value = value;
    });
  }

  function collectFormData() {
    const data = {
      gender: byId("gender")?.value || "female",
      age: safeNumber(byId("age")?.value)
    };
    labItems.forEach((item) => data[item.id] = safeNumber(byId(item.id)?.value));
    return data;
  }

  function safeNumber(value) {
    const number = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(number) ? number : null;
  }

  function judgeItem(item, value) {
    if (value === null) return { level: "missing", label: "미입력", points: 0 };
    const [nMin, nMax] = item.normal;
    const [cMin, cMax] = item.caution;
    const highDanger = value > cMax;
    const lowDanger = item.lowDanger && value < cMin;
    const bothHighDanger = item.bothSides && value > nMax;
    if (value >= nMin && value <= nMax) return { level: "normal", label: "정상", points: 0 };
    if (value >= cMin && value <= cMax) return { level: "caution", label: "주의", points: 6 };
    if (lowDanger || highDanger || bothHighDanger) return { level: "danger", label: "위험", points: 12 };
    if (item.bothSides && value < cMin) return { level: "danger", label: "위험", points: 12 };
    return { level: "caution", label: "주의", points: 6 };
  }

  function renderReport(data) {
    const results = labItems.map((item) => ({ item, value: data[item.id], judge: judgeItem(item, data[item.id]) }));
    const abnormal = results.filter((result) => result.judge.level === "caution" || result.judge.level === "danger");
    const rawScore = results.reduce((sum, result) => sum + result.judge.points, 0);
    const score = Math.min(100, Math.round(rawScore * 100 / 120));
    const grade = score <= 30 ? "안정" : score <= 60 ? "주의" : "관리 필요";
    const gradeClass = score <= 30 ? "normal" : score <= 60 ? "caution" : "danger";
    const guides = buildGuides(data);
    const report = byId("report");
    if (!report) return;
    report.innerHTML = `
      <div class="report-wrap">
        <div class="report-top">
          <div class="score-box"><div><strong>${score}</strong><p>위험도 점수</p><span class="badge ${gradeClass}">${grade}</span></div></div>
          <div>
            <p class="eyebrow">Demo Report</p>
            <h2>현재 상태 요약</h2>
            <p>${abnormal.length ? `주의가 필요한 항목은 ${abnormal.map((r) => r.item.name).join(", ")}입니다.` : "입력된 주요 항목에서 뚜렷한 이상 신호가 적습니다."}</p>
            <p class="notice">이 리포트는 참고용이며 진단이나 치료를 대신하지 않습니다.</p>
          </div>
        </div>
        <div class="report-grid">
          <div class="report-card"><h3>주요 이상 항목</h3>${renderList(abnormal.map((r) => `${r.item.name}: ${r.value} ${r.item.unit} (${r.judge.label})`), "이상 항목이 없습니다.")}</div>
          <div class="report-card"><h3>권장 식습관</h3>${renderList(guides.food)}</div>
          <div class="report-card"><h3>운동 가이드</h3>${renderList(guides.exercise)}</div>
          <div class="report-card"><h3>생활습관 가이드</h3>${renderList(guides.lifestyle)}</div>
          <div class="report-card"><h3>의료진 상담 질문</h3>${renderList(guides.questions)}</div>
          <div class="report-card"><h3>권장 추가 검사</h3>${renderList(guides.tests)}<p><strong>다음 검진 권장 시기:</strong> ${score > 60 ? "1~3개월 내 재검 또는 진료 상담" : score > 30 ? "3~6개월 내 추적 확인" : "정기 검진 주기에 맞춰 확인"}</p></div>
        </div>
        <div class="report-card">
          <h3>검사항목별 판정표</h3>
          <table class="result-table">
            <thead><tr><th>항목</th><th>입력값</th><th>판정</th><th>설명</th></tr></thead>
            <tbody>${results.map(renderResultRow).join("")}</tbody>
          </table>
        </div>
      </div>
    `;
    report.querySelectorAll("[data-desc-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const row = report.querySelector(`[data-desc-row="${button.dataset.descToggle}"]`);
        if (row) row.hidden = !row.hidden;
      });
    });
  }

  function renderResultRow(result) {
    const key = result.item.id;
    const badgeClass = result.judge.level === "danger" ? "danger" : result.judge.level === "caution" ? "caution" : "normal";
    const value = result.value === null ? "-" : `${result.value} ${result.item.unit}`;
    return `
      <tr>
        <td>${result.item.name}</td>
        <td>${value}</td>
        <td><span class="badge ${badgeClass}">${result.judge.label}</span></td>
        <td><button type="button" data-desc-toggle="${key}">설명 보기</button></td>
      </tr>
      <tr class="desc-row" data-desc-row="${key}" hidden><td colspan="4">${result.item.desc}</td></tr>
    `;
  }

  function renderList(items, emptyText) {
    const list = (items || []).filter(Boolean);
    if (!list.length) return `<p class="muted">${emptyText || "해당 권장 사항이 없습니다."}</p>`;
    return `<ul>${list.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  }

  function buildGuides(data) {
    const guides = {
      food: ["채소, 단백질, 통곡물 중심으로 식사를 구성하세요."],
      exercise: ["주 3~5회, 30분 이상 걷기나 가벼운 유산소 운동을 권장합니다."],
      lifestyle: ["수면, 음주, 흡연, 체중 변화를 함께 기록하세요."],
      questions: ["현재 수치가 제 나이와 성별에서 어떤 의미인지 질문하세요."],
      tests: ["이상 항목은 의료진 판단에 따라 재검을 고려하세요."]
    };
    if (isHigh(data.ast, 40) || isHigh(data.alt, 40) || isHigh(data.ggtp, 60)) {
      guides.food.push("간 기능 관리를 위해 음주와 야식을 줄이고 고지방 식사를 조절하세요.");
      guides.exercise.push("지방간 평가가 필요한 경우 무리한 운동보다 꾸준한 체중 관리를 우선하세요.");
      guides.questions.push("간수치 상승 원인과 복부초음파 필요성을 상담하세요.");
      guides.tests.push("복부초음파, 간염 바이러스 검사, 간 기능 재검");
    }
    if (isHigh(data.glucose, 99) || isHigh(data.hba1c, 5.6)) {
      guides.food.push("단순당, 음료, 과자 섭취를 줄이고 식후 혈당 변화를 관찰하세요.");
      guides.exercise.push("식후 10~20분 걷기를 생활화하세요.");
      guides.questions.push("당뇨 전단계 또는 당뇨 평가가 필요한지 질문하세요.");
      guides.tests.push("HbA1c 재검, 공복혈당, 인슐린 저항성 평가");
    }
    if (isHigh(data.ldl, 129) || isHigh(data.triglyceride, 149) || isLow(data.hdl, 40)) {
      guides.food.push("포화지방, 튀김, 가공육을 줄이고 불포화지방과 섬유질 섭취를 늘리세요.");
      guides.exercise.push("유산소 운동과 근력 운동을 병행해 지질 개선을 목표로 하세요.");
      guides.questions.push("심혈관 위험도 평가와 약물치료 필요성을 상담하세요.");
      guides.tests.push("지질 재검, 혈압, 심전도, 경동맥초음파");
    }
    if (isHigh(data.creatinine, 1.2) || isLow(data.egfr, 90)) {
      guides.food.push("단백질 보충제나 과도한 염분 섭취는 의료진과 상의하세요.");
      guides.questions.push("신장 기능 추적 검사와 소변 검사가 필요한지 질문하세요.");
      guides.tests.push("소변검사, 미세알부민뇨, 신장 기능 재검");
    }
    if (isHigh(data.uricAcid, 7.0)) {
      guides.food.push("요산 관리를 위해 과음, 내장류, 과당 음료를 줄이세요.");
      guides.tests.push("요산 재검, 통풍 증상 평가");
    }
    if (isLow(data.hemoglobin, 12)) {
      guides.questions.push("빈혈 원인 평가와 철분 검사 필요성을 상담하세요.");
      guides.tests.push("철분, 페리틴, 비타민 B12, 엽산 검사");
    }
    return guides;
  }

  function isHigh(value, limit) { return value !== null && value > limit; }
  function isLow(value, limit) { return value !== null && value < limit; }

  function bindHospitals() {
    ["regionFilter", "deptFilter", "packageFilter"].forEach((id) => byId(id)?.addEventListener("change", renderHospitals));
    byId("viewBookingsBtn")?.addEventListener("click", renderBookings);
  }

  function renderHospitals() {
    const list = byId("hospitalList");
    if (!list) return;
    const region = byId("regionFilter")?.value || "all";
    const dept = byId("deptFilter")?.value || "all";
    const pack = byId("packageFilter")?.value || "all";
    const filtered = hospitals.filter((hospital) =>
      (region === "all" || hospital.region === region) &&
      (dept === "all" || hospital.dept === dept) &&
      (pack === "all" || hospital.packages.includes(pack))
    );
    list.innerHTML = filtered.length ? filtered.map((hospital) => `
      <article class="hospital-card">
        <h3>${hospital.name}</h3>
        <p class="hospital-meta">${hospital.region} · ${hospital.dept} · 평점 ${hospital.rating}</p>
        <div class="tag-list">${hospital.packages.map((item) => `<span class="tag">${item}</span>`).join("")}</div>
        <p><strong>예상 가격:</strong> ${hospital.price}</p>
        <p><strong>가능 예약 날짜:</strong> ${hospital.date}</p>
        <button class="button primary" type="button" data-book="${hospital.name}">예약하기</button>
      </article>
    `).join("") : `<p class="muted">조건에 맞는 병원이 없습니다.</p>`;
    list.querySelectorAll("[data-book]").forEach((button) => {
      button.addEventListener("click", () => openBookingModal(button.dataset.book || ""));
    });
  }

  function bindBookingModal() {
    byId("closeModalBtn")?.addEventListener("click", closeBookingModal);
    byId("bookingModal")?.addEventListener("click", (event) => {
      if (event.target.id === "bookingModal") closeBookingModal();
    });
    byId("bookingForm")?.addEventListener("submit", saveBooking);
  }

  function openBookingModal(hospitalName) {
    selectedHospitalName = hospitalName;
    const modal = byId("bookingModal");
    const selected = byId("selectedHospital");
    const status = byId("bookingStatus");
    if (selected) selected.textContent = `선택 병원: ${hospitalName}`;
    if (status) status.textContent = "";
    if (modal) {
      modal.hidden = false;
      modal.classList.add("is-open");
    }
    byId("bookName")?.focus();
  }

  function closeBookingModal() {
    const modal = byId("bookingModal");
    if (modal) {
      modal.classList.remove("is-open");
      modal.hidden = true;
    }
  }

  function saveBooking(event) {
    event.preventDefault();
    const booking = {
      hospital: selectedHospitalName || "선택 병원",
      name: byId("bookName")?.value.trim() || "",
      phone: byId("bookPhone")?.value.trim() || "",
      date: byId("bookDate")?.value || "",
      time: byId("bookTime")?.value || "",
      purpose: byId("bookPurpose")?.value.trim() || "",
      createdAt: new Date().toISOString()
    };
    if (!booking.name || !booking.phone || !booking.date || !booking.time) {
      setStatus("bookingStatus", "이름, 연락처, 희망 날짜, 희망 시간을 입력해주세요.");
      return;
    }
    const bookings = readBookings();
    bookings.unshift(booking);
    try {
      localStorage.setItem(storageKey, JSON.stringify(bookings));
      setStatus("bookingStatus", "예약 신청이 완료되었습니다. 실제 예약이 아닌 데모 기능입니다.");
      byId("bookingForm")?.reset();
      renderBookings();
    } catch (error) {
      console.error(error);
      setStatus("bookingStatus", "예약 정보를 저장하지 못했습니다. 브라우저 저장소 설정을 확인해주세요.");
    }
  }

  function readBookings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function renderBookings() {
    const box = byId("bookingList");
    if (!box) return;
    const bookings = readBookings();
    box.hidden = false;
    box.innerHTML = `<h3>예약 내역</h3><p class="notice">아래 내역은 실제 예약이 아닌 데모 저장 데이터입니다.</p>` +
      (bookings.length ? bookings.map((booking) => `
        <div class="booking-item">
          <strong>${booking.hospital}</strong>
          <p>${booking.name} · ${booking.phone} · ${booking.date} ${booking.time}</p>
          <p class="muted">${booking.purpose || "상담 목적 미입력"}</p>
        </div>
      `).join("") : `<p class="muted">저장된 예약 내역이 없습니다.</p>`);
  }

  function setStatus(id, message) {
    const element = byId(id);
    if (element) element.textContent = message;
  }
})();
