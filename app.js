(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const storageKey = "labinsight-bookings";
  const statusLabels = {
    requested: "접수",
    confirmed: "확정",
    completed: "완료",
    cancelled: "취소"
  };

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
    gender: "male", age: 46, height: 172, weight: 78, bpSys: 132, bpDia: 86,
    ast: 48, alt: 72, ggtp: 135, glucose: 112, hba1c: 6.1,
    totalChol: 224, triglyceride: 210, hdl: 38, ldl: 151, creatinine: 1.08, egfr: 82,
    uricAcid: 7.8, hemoglobin: 14.3, wbc: 7200, platelet: 245
  };

  const hospitals = [
    { id: "busan-med", name: "부산 메디체크 내과", region: "부산", dept: "내과", address: "부산 부산진구 중앙대로 672", phone: "051-000-1100", packages: ["종합검진", "간 기능", "당뇨"], price: "90,000원~", rating: 4.7, duration: 50, slots: ["09:00", "10:30", "13:30", "15:00"] },
    { id: "centum-gi", name: "센텀 소화기클리닉", region: "부산", dept: "소화기내과", address: "부산 해운대구 센텀중앙로 48", phone: "051-000-2200", packages: ["간 기능", "종합검진"], price: "120,000원~", rating: 4.8, duration: 60, slots: ["09:30", "11:00", "14:00", "16:00"] },
    { id: "seoul-endo", name: "서울 라이프내분비센터", region: "서울", dept: "내분비내과", address: "서울 강남구 테헤란로 152", phone: "02-000-3300", packages: ["당뇨", "이상지질혈증"], price: "110,000원~", rating: 4.6, duration: 45, slots: ["09:00", "10:00", "14:30", "16:30"] },
    { id: "daegu-kidney", name: "대구 신장건강의원", region: "대구", dept: "신장내과", address: "대구 중구 달구벌대로 2095", phone: "053-000-4400", packages: ["신장 기능", "종합검진"], price: "100,000원~", rating: 4.5, duration: 50, slots: ["09:20", "10:40", "13:40", "15:20"] },
    { id: "online-lab", name: "온라인 검진상담 Lab", region: "온라인 상담", dept: "가정의학과", address: "비대면 상담", phone: "1588-0000", packages: ["종합검진", "빈혈", "당뇨"], price: "30,000원~", rating: 4.4, duration: 25, slots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"] },
    { id: "seoul-heart", name: "서울 하트리스크 클리닉", region: "서울", dept: "심장내과", address: "서울 송파구 올림픽로 300", phone: "02-000-5500", packages: ["이상지질혈증", "종합검진"], price: "150,000원~", rating: 4.9, duration: 70, slots: ["09:10", "10:50", "14:10", "15:50"] }
  ];

  let selectedHospital = null;
  let apiAvailable = false;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindNav();
    bindOcr();
    bindForm();
    bindBmiPreview();
    bindHospitals();
    bindBookingModal();
    detectBookingApi();
    renderHospitals();
    updateBookingSummary();
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
    byId("sampleBtn")?.addEventListener("click", () => {
      fillForm(sampleData);
      updateBmiPreview();
    });
    byId("clearBtn")?.addEventListener("click", () => {
      form?.reset();
      updateBmiPreview();
    });
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = collectFormData();
      renderReport(data);
      byId("report")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function bindBmiPreview() {
    ["height", "weight"].forEach((id) => byId(id)?.addEventListener("input", updateBmiPreview));
    updateBmiPreview();
  }

  function updateBmiPreview() {
    const preview = byId("bmiPreview");
    if (!preview) return;
    const bmi = calculateBmi(safeNumber(byId("height")?.value), safeNumber(byId("weight")?.value));
    if (bmi === null) {
      preview.textContent = "키와 몸무게를 입력하면 BMI가 자동 계산됩니다.";
      preview.className = "bmi-preview";
      return;
    }
    const status = bmi < 18.5 ? "저체중" : bmi < 23 ? "정상" : bmi < 25 ? "과체중" : "비만 관리 필요";
    preview.textContent = `자동 계산 BMI: ${bmi.toFixed(1)} (${status})`;
    preview.className = `bmi-preview ${bmi >= 25 ? "danger" : bmi >= 23 || bmi < 18.5 ? "caution" : "normal"}`;
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
      age: safeNumber(byId("age")?.value),
      height: safeNumber(byId("height")?.value),
      weight: safeNumber(byId("weight")?.value),
      bpSys: safeNumber(byId("bpSys")?.value),
      bpDia: safeNumber(byId("bpDia")?.value)
    };
    data.bmi = calculateBmi(data.height, data.weight);
    labItems.forEach((item) => data[item.id] = safeNumber(byId(item.id)?.value));
    return data;
  }

  function safeNumber(value) {
    const number = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(number) ? number : null;
  }

  function calculateBmi(height, weight) {
    if (!height || !weight || height <= 0 || weight <= 0) return null;
    return weight / Math.pow(height / 100, 2);
  }

  function judgeItem(item, value) {
    if (value === null) return { level: "missing", label: "미입력", points: 0 };
    const [nMin, nMax] = item.normal;
    const [cMin, cMax] = item.caution;
    const highDanger = value > cMax;
    const lowDanger = item.lowDanger && value < cMin;
    const bothHighDanger = item.bothSides && value > nMax;
    if (value >= nMin && value <= nMax) return { level: "normal", label: "참고 범위", points: 0 };
    if (value >= cMin && value <= cMax) return { level: "caution", label: "확인 필요", points: 6 };
    if (lowDanger || highDanger || bothHighDanger) return { level: "danger", label: "범위 벗어남", points: 12 };
    if (item.bothSides && value < cMin) return { level: "danger", label: "범위 벗어남", points: 12 };
    return { level: "caution", label: "확인 필요", points: 6 };
  }

  function renderReport(data) {
    const results = labItems.map((item) => ({ item, value: data[item.id], judge: judgeItem(item, data[item.id]) }));
    const abnormal = results.filter((result) => result.judge.level === "caution" || result.judge.level === "danger");
    const rawScore = results.reduce((sum, result) => sum + result.judge.points, 0);
    const score = Math.min(100, Math.round(rawScore * 100 / 120));
    const grade = score <= 30 ? "입력 범위 양호" : score <= 60 ? "추가 확인" : "상담 권장";
    const gradeClass = score <= 30 ? "normal" : score <= 60 ? "caution" : "danger";
    const guides = buildGuides(data);
    const checkups = buildRecommendedCheckups(data, score);
    const report = byId("report");
    if (!report) return;
    report.innerHTML = `
      <div class="report-wrap">
        <div class="report-top">
          <div class="score-box"><div><strong>${score}</strong><p>주의 항목 지수</p><span class="badge ${gradeClass}">${grade}</span></div></div>
          <div>
            <p class="eyebrow">Demo Report</p>
            <h2>현재 상태 요약</h2>
            <p>${abnormal.length ? `참고 범위를 추가로 확인할 항목은 ${abnormal.map((r) => r.item.name).join(", ")}입니다.` : "입력된 주요 항목이 설정된 참고 범위 안에 있습니다."}</p>
            <p class="notice">이 리포트는 참고용이며 진단이나 치료를 대신하지 않습니다.</p>
          </div>
        </div>
        <section class="recommendation-panel" aria-label="추천 건강검진">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Recommended Checkups</p>
              <h3>결과 기반 추천 건강검진</h3>
            </div>
            <p>입력된 이상 항목을 바탕으로 다음에 확인하면 좋은 검진 패키지를 제안합니다.</p>
          </div>
          <div class="checkup-grid">${checkups.map(renderCheckupCard).join("")}</div>
        </section>
        <div class="report-grid">
          <div class="report-card"><h3>주요 이상 항목</h3>${renderList(abnormal.map((r) => `${r.item.name}: ${r.value} ${r.item.unit} (${r.judge.label})`), "이상 항목이 없습니다.")}</div>
          <div class="report-card"><h3>기본 건강지표</h3>${renderBasicMetrics(data)}</div>
          <div class="report-card"><h3>권장 식습관</h3>${renderList(guides.food)}</div>
          <div class="report-card"><h3>운동 가이드</h3>${renderList(guides.exercise)}</div>
          <div class="report-card"><h3>생활습관 가이드</h3>${renderList(guides.lifestyle)}</div>
          <div class="report-card"><h3>의료진 상담 질문</h3>${renderList(guides.questions)}</div>
          <div class="report-card"><h3>권장 추가 검사</h3>${renderList(guides.tests)}<p><strong>재검 시점:</strong> 검사기관 참고치와 의료진 상담에 따라 결정하세요.</p></div>
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
    report.querySelectorAll("[data-recommend-package]").forEach((button) => {
      button.addEventListener("click", () => {
        applyHospitalFilter(button.dataset.recommendPackage || "all", button.dataset.recommendDept || "all");
      });
    });
  }

  function renderCheckupCard(checkup) {
    return `
      <article class="checkup-card">
        <div class="checkup-card-top">
          <span class="checkup-priority ${checkup.priorityClass}">${checkup.priority}</span>
          <span>${checkup.dept}</span>
        </div>
        <h4>${checkup.title}</h4>
        <p>${checkup.reason}</p>
        <div class="tag-list">${checkup.tests.map((test) => `<span class="tag">${test}</span>`).join("")}</div>
        <button class="button secondary" type="button" data-recommend-package="${checkup.package}" data-recommend-dept="${checkup.deptFilter}">관련 병원 보기</button>
      </article>
    `;
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

  function renderBasicMetrics(data) {
    const items = [];
    if (data.bmi !== null) {
      const bmiStatus = data.bmi < 18.5 ? "저체중" : data.bmi < 23 ? "정상" : data.bmi < 25 ? "과체중" : "비만 관리 필요";
      items.push(`BMI: ${data.bmi.toFixed(1)} (${bmiStatus})`);
    }
    if (data.bpSys !== null || data.bpDia !== null) {
      items.push(`혈압: ${data.bpSys ?? "-"} / ${data.bpDia ?? "-"} mmHg (${judgeBloodPressure(data.bpSys, data.bpDia)})`);
    }
    return renderList(items, "키, 몸무게, 혈압을 입력하면 기본 건강지표가 함께 표시됩니다.");
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
    if (data.bmi !== null && data.bmi >= 25) {
      guides.food.push("BMI가 높은 범위라면 총 섭취 열량, 야식, 음료 섭취를 함께 조절하세요.");
      guides.exercise.push("체중 관리를 위해 유산소 운동과 하체·코어 근력 운동을 병행하세요.");
      guides.tests.push("대사증후군 평가, 혈압, 허리둘레 확인");
    }
    if (judgeBloodPressure(data.bpSys, data.bpDia) !== "미입력" && judgeBloodPressure(data.bpSys, data.bpDia) !== "정상") {
      guides.lifestyle.push("혈압이 높은 편이면 가정혈압을 반복 측정하고 염분 섭취와 수면 상태를 함께 점검하세요.");
      guides.questions.push("혈압 재측정과 심혈관 위험도 평가가 필요한지 질문하세요.");
      guides.tests.push("혈압 재측정, 심전도, 신장 기능 확인");
    }
    return guides;
  }

  function buildRecommendedCheckups(data, score) {
    const recommendations = [];
    const add = (item) => recommendations.push(item);
    const priority = score > 60 ? ["빠른 상담", "danger"] : score > 30 ? ["추적 권장", "caution"] : ["정기 확인", "normal"];

    if (isHigh(data.ast, 40) || isHigh(data.alt, 40) || isHigh(data.ggtp, 60)) {
      add({
        title: "간 기능 정밀 검진",
        dept: "소화기내과",
        deptFilter: "소화기내과",
        package: "간 기능",
        priority: priority[0],
        priorityClass: priority[1],
        reason: "AST, ALT, γ-GTP 상승 가능성이 있어 지방간, 간염, 담도계 상태를 함께 확인하는 흐름이 적합합니다.",
        tests: ["복부초음파", "간염 바이러스", "간 기능 재검"]
      });
    }

    if (isHigh(data.glucose, 99) || isHigh(data.hba1c, 5.6)) {
      add({
        title: "당대사·당뇨 위험 검진",
        dept: "내분비내과",
        deptFilter: "내분비내과",
        package: "당뇨",
        priority: priority[0],
        priorityClass: priority[1],
        reason: "공복혈당 또는 HbA1c가 높으면 당뇨 전단계 여부와 생활습관 개입 필요성을 확인하는 것이 좋습니다.",
        tests: ["HbA1c 재검", "공복혈당", "소변 미세알부민"]
      });
    }

    if (isHigh(data.ldl, 129) || isHigh(data.triglyceride, 149) || isHigh(data.totalChol, 199) || isLow(data.hdl, 40)) {
      add({
        title: "심혈관·지질 위험 검진",
        dept: "심장내과",
        deptFilter: "심장내과",
        package: "이상지질혈증",
        priority: priority[0],
        priorityClass: priority[1],
        reason: "LDL, 중성지방, HDL 변화는 심혈관 위험도 평가와 함께 보는 것이 유용합니다.",
        tests: ["지질 재검", "혈압", "심전도"]
      });
    }

    if (isHigh(data.creatinine, 1.2) || isLow(data.egfr, 90)) {
      add({
        title: "신장 기능 추적 검진",
        dept: "신장내과",
        deptFilter: "신장내과",
        package: "신장 기능",
        priority: priority[0],
        priorityClass: priority[1],
        reason: "크레아티닌 상승 또는 eGFR 저하는 반복 검사와 소변 검사를 함께 확인하는 편이 안전합니다.",
        tests: ["eGFR 재검", "소변검사", "미세알부민뇨"]
      });
    }

    if (isHigh(data.uricAcid, 7.0)) {
      add({
        title: "요산·대사 상태 검진",
        dept: "내과",
        deptFilter: "내과",
        package: "종합검진",
        priority: "생활관리",
        priorityClass: "caution",
        reason: "요산 상승은 통풍 증상, 식습관, 신장 배설 상태와 함께 확인하면 좋습니다.",
        tests: ["요산 재검", "신장 기능", "통풍 증상 평가"]
      });
    }

    if (isLow(data.hemoglobin, 12) || isLow(data.wbc, 4000) || isLow(data.platelet, 150)) {
      add({
        title: "혈액·빈혈 원인 검진",
        dept: "가정의학과",
        deptFilter: "가정의학과",
        package: "빈혈",
        priority: "추적 권장",
        priorityClass: "caution",
        reason: "혈색소, 백혈구, 혈소판 이상은 빈혈, 염증, 면역 상태를 함께 확인해야 합니다.",
        tests: ["CBC 재검", "철분", "페리틴"]
      });
    }

    if ((data.bmi !== null && data.bmi >= 25) || judgeBloodPressure(data.bpSys, data.bpDia) === "고혈압 관리 필요") {
      add({
        title: "대사증후군·혈압 검진",
        dept: "가정의학과",
        deptFilter: "가정의학과",
        package: "종합검진",
        priority: priority[0],
        priorityClass: priority[1],
        reason: "BMI 또는 혈압이 높은 범위라면 혈당, 지질, 허리둘레, 심전도를 함께 확인하는 검진 흐름이 좋습니다.",
        tests: ["혈압 재측정", "심전도", "대사증후군 평가"]
      });
    }

    if (!recommendations.length) {
      add({
        title: "정기 종합검진 유지",
        dept: "가정의학과",
        deptFilter: "가정의학과",
        package: "종합검진",
        priority: "정기 확인",
        priorityClass: "normal",
        reason: "현재 입력값에서는 큰 이상 신호가 적어 정기 검진과 전년도 대비 변화 확인이 우선입니다.",
        tests: ["기본 혈액검사", "혈압", "생활습관 점검"]
      });
    }

    return recommendations.slice(0, 4);
  }

  function applyHospitalFilter(packageName, deptName) {
    const packageFilter = byId("packageFilter");
    const deptFilter = byId("deptFilter");
    if (packageFilter) packageFilter.value = packageName;
    if (deptFilter) deptFilter.value = deptName;
    renderHospitals();
    byId("hospitals")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function isHigh(value, limit) { return value !== null && value > limit; }
  function isLow(value, limit) { return value !== null && value < limit; }

  function judgeBloodPressure(sys, dia) {
    if (sys === null && dia === null) return "미입력";
    if ((sys !== null && sys >= 130) || (dia !== null && dia >= 85)) return "고혈압 관리 필요";
    if ((sys !== null && sys >= 120) || (dia !== null && dia >= 80)) return "주의";
    return "정상";
  }

  function bindHospitals() {
    ["regionFilter", "deptFilter", "packageFilter"].forEach((id) => byId(id)?.addEventListener("change", renderHospitals));
    byId("viewBookingsBtn")?.addEventListener("click", renderBookings);
    byId("exportBookingsBtn")?.addEventListener("click", exportBookingsCsv);
  }

  async function renderHospitals() {
    const list = byId("hospitalList");
    if (!list) return;
    const region = byId("regionFilter")?.value || "all";
    const dept = byId("deptFilter")?.value || "all";
    const pack = byId("packageFilter")?.value || "all";
    const bookings = await readBookings();
    const filtered = hospitals.filter((hospital) =>
      (region === "all" || hospital.region === region) &&
      (dept === "all" || hospital.dept === dept) &&
      (pack === "all" || hospital.packages.includes(pack))
    );
    list.innerHTML = filtered.length ? filtered.map((hospital) => {
      const availableCount = countAvailableSlots(hospital, bookings);
      return `
      <article class="hospital-card">
        <h3>샘플 · ${hospital.name}</h3>
        <p class="hospital-meta">${hospital.region} · ${hospital.dept} · 데모 평점 ${hospital.rating}</p>
        <p class="muted">${hospital.address} · ${hospital.phone}</p>
        <div class="tag-list">${hospital.packages.map((item) => `<span class="tag">${item}</span>`).join("")}</div>
        <p><strong>예상 가격:</strong> ${hospital.price}</p>
        <p><strong>소요 시간:</strong> 약 ${hospital.duration}분</p>
        <p><strong>14일 내 잔여 슬롯:</strong> ${availableCount}개</p>
        <div class="slot-preview">${hospital.slots.map((slot) => `<span>${slot}</span>`).join("")}</div>
        <button class="button primary" type="button" data-book="${hospital.id}">예약 흐름 체험</button>
      </article>
    `;
    }).join("") : `<p class="muted">조건에 맞는 병원이 없습니다.</p>`;
    list.querySelectorAll("[data-book]").forEach((button) => {
      button.addEventListener("click", () => openBookingModal(button.dataset.book || ""));
    });
    updateBookingSummary(bookings);
  }

  function bindBookingModal() {
    byId("closeModalBtn")?.addEventListener("click", closeBookingModal);
    byId("bookingModal")?.addEventListener("click", (event) => {
      if (event.target.id === "bookingModal") closeBookingModal();
    });
    byId("bookingForm")?.addEventListener("submit", saveBooking);
    byId("bookDate")?.addEventListener("change", updateTimeOptions);
  }

  async function openBookingModal(hospitalId) {
    selectedHospital = hospitals.find((hospital) => hospital.id === hospitalId) || null;
    if (!selectedHospital) return;
    const modal = byId("bookingModal");
    const selected = byId("selectedHospital");
    const status = byId("bookingStatus");
    const dateInput = byId("bookDate");
    const packageSelect = byId("bookPackage");
    if (selected) selected.textContent = `선택 병원: ${selectedHospital.name} · ${selectedHospital.dept} · ${selectedHospital.phone}`;
    if (packageSelect) {
      packageSelect.innerHTML = `<option value="">선택</option>${selectedHospital.packages.map((item) => `<option>${item}</option>`).join("")}`;
    }
    if (dateInput) {
      dateInput.min = formatDate(addDays(new Date(), 1));
      dateInput.max = formatDate(addDays(new Date(), 30));
      dateInput.value = dateInput.min;
    }
    if (status) status.textContent = "";
    await updateTimeOptions();
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

  async function saveBooking(event) {
    event.preventDefault();
    const booking = {
      hospitalId: selectedHospital?.id || "",
      hospital: selectedHospital?.name || "선택 병원",
      department: selectedHospital?.dept || "",
      name: byId("bookName")?.value.trim() || "",
      phone: byId("bookPhone")?.value.trim() || "",
      birthDate: byId("bookBirthDate")?.value || "",
      packageName: byId("bookPackage")?.value || "",
      date: byId("bookDate")?.value || "",
      time: byId("bookTime")?.value || "",
      purpose: byId("bookPurpose")?.value.trim() || "",
      consent: Boolean(byId("bookConsent")?.checked),
      status: "requested"
    };
    if (!booking.hospitalId || !booking.name || !booking.phone || !booking.birthDate || !booking.packageName || !booking.date || !booking.time) {
      setStatus("bookingStatus", "이름, 연락처, 생년월일, 검진 항목, 희망 날짜와 시간을 모두 입력해주세요.");
      return;
    }
    if (!booking.consent) {
      setStatus("bookingStatus", "예약 접수를 위해 개인정보 수집·이용 동의가 필요합니다.");
      return;
    }
    try {
      const saved = await createBooking(booking);
      setStatus("bookingStatus", `데모 예약이 저장되었습니다. 실제 병원에는 전송되지 않습니다. 예약번호: ${saved.id}`);
      byId("bookingForm")?.reset();
      await renderBookings();
      await renderHospitals();
      await updateTimeOptions();
    } catch (error) {
      console.error(error);
      setStatus("bookingStatus", error.message || "예약 정보를 저장하지 못했습니다. 다시 시도해주세요.");
    }
  }

  async function detectBookingApi() {
    if (window.location.protocol === "file:") {
      apiAvailable = false;
      updateBookingModeNotice();
      return;
    }
    try {
      await apiRequest("/api/bookings");
      apiAvailable = true;
    } catch (error) {
      apiAvailable = false;
    }
    updateBookingModeNotice();
    updateBookingSummary();
    renderHospitals();
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "요청 처리 중 오류가 발생했습니다.");
    }
    return payload;
  }

  async function createBooking(booking) {
    if (apiAvailable) {
      return apiRequest("/api/bookings", {
        method: "POST",
        body: JSON.stringify(booking)
      });
    }
    return createLocalBooking(booking);
  }

  async function updateBookingStatus(id, status) {
    if (apiAvailable) {
      await apiRequest(`/api/bookings/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      return;
    }
    const bookings = await readLocalBookings();
    const target = bookings.find((booking) => booking.id === id);
    if (target) {
      target.status = status;
      target.updatedAt = new Date().toISOString();
      writeLocalBookings(bookings);
    }
  }

  async function readBookings() {
    if (apiAvailable) {
      try {
        const payload = await apiRequest("/api/bookings");
        return Array.isArray(payload.bookings) ? payload.bookings : [];
      } catch (error) {
        apiAvailable = false;
        updateBookingModeNotice();
      }
    }
    return readLocalBookings();
  }

  async function readLocalBookings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeBooking) : [];
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function writeLocalBookings(bookings) {
    localStorage.setItem(storageKey, JSON.stringify(bookings));
  }

  async function createLocalBooking(booking) {
    const bookings = await readLocalBookings();
    const conflict = bookings.some((item) =>
      item.hospitalId === booking.hospitalId &&
      item.date === booking.date &&
      item.time === booking.time &&
      item.status !== "cancelled"
    );
    if (conflict) {
      throw new Error("이미 예약된 시간입니다. 다른 시간을 선택해주세요.");
    }
    const saved = normalizeBooking({
      ...booking,
      id: makeBookingId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    bookings.unshift(saved);
    writeLocalBookings(bookings);
    return saved;
  }

  function normalizeBooking(booking) {
    return {
      id: booking.id || makeBookingId(),
      hospitalId: booking.hospitalId || findHospitalIdByName(booking.hospital),
      hospital: booking.hospital || "선택 병원",
      department: booking.department || "",
      name: booking.name || "",
      phone: booking.phone || "",
      birthDate: booking.birthDate || "",
      packageName: booking.packageName || booking.package || "",
      date: booking.date || "",
      time: booking.time || "",
      purpose: booking.purpose || "",
      consent: booking.consent !== false,
      status: booking.status || "requested",
      createdAt: booking.createdAt || new Date().toISOString(),
      updatedAt: booking.updatedAt || booking.createdAt || new Date().toISOString()
    };
  }

  async function renderBookings() {
    const box = byId("bookingList");
    const items = byId("bookingItems");
    if (!box) return;
    const bookings = await readBookings();
    box.hidden = false;
    updateBookingModeNotice();
    if (!items) return;
    items.innerHTML = bookings.length ? bookings.map(renderBookingItem).join("") : `<p class="muted">저장된 예약 내역이 없습니다.</p>`;
    items.querySelectorAll("[data-status-id]").forEach((select) => {
      select.addEventListener("change", async () => {
        await updateBookingStatus(select.dataset.statusId || "", select.value);
        await renderBookings();
        await renderHospitals();
      });
    });
    updateBookingSummary(bookings);
  }

  function renderBookingItem(booking) {
    const status = booking.status || "requested";
    return `
      <div class="booking-item">
        <div class="booking-item-top">
          <div>
            <strong>${escapeHtml(booking.hospital)}</strong>
            <span class="booking-code">${escapeHtml(booking.id)}</span>
          </div>
          <span class="booking-status ${status}">${statusLabels[status] || status}</span>
        </div>
        <p>${escapeHtml(booking.name)} · ${escapeHtml(maskPhone(booking.phone))} · ${escapeHtml(booking.packageName || "검진 항목 미입력")}</p>
        <p><strong>${escapeHtml(booking.date)} ${escapeHtml(booking.time)}</strong> · ${escapeHtml(booking.department || "진료과 미지정")}</p>
        <p class="muted">${escapeHtml(booking.purpose || "상담 목적 미입력")}</p>
        <label class="status-control">상태 변경
          <select data-status-id="${escapeHtml(booking.id)}">
            ${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${value === status ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
      </div>
    `;
  }

  async function updateTimeOptions() {
    const timeSelect = byId("bookTime");
    const date = byId("bookDate")?.value || "";
    if (!timeSelect || !selectedHospital) return;
    if (!date) {
      timeSelect.innerHTML = `<option value="">날짜를 먼저 선택</option>`;
      return;
    }
    const bookings = await readBookings();
    const reserved = new Set(bookings
      .filter((booking) => booking.hospitalId === selectedHospital.id && booking.date === date && booking.status !== "cancelled")
      .map((booking) => booking.time));
    const options = selectedHospital.slots.map((slot) => {
      const disabled = reserved.has(slot);
      return `<option value="${slot}" ${disabled ? "disabled" : ""}>${slot}${disabled ? " 마감" : ""}</option>`;
    });
    timeSelect.innerHTML = `<option value="">선택</option>${options.join("")}`;
  }

  async function updateBookingSummary(bookings) {
    const box = byId("bookingSummary");
    if (!box) return;
    const list = bookings || await readBookings();
    const active = list.filter((booking) => booking.status !== "cancelled");
    const requested = active.filter((booking) => booking.status === "requested").length;
    const confirmed = active.filter((booking) => booking.status === "confirmed").length;
    box.innerHTML = `
      <article><strong>${active.length}</strong><span>활성 예약</span></article>
      <article><strong>${requested}</strong><span>접수 대기</span></article>
      <article><strong>${confirmed}</strong><span>확정 예약</span></article>
      <article><strong>${apiAvailable ? "API" : "Local"}</strong><span>저장 모드</span></article>
    `;
  }

  function updateBookingModeNotice() {
    const notice = byId("bookingModeNotice");
    if (!notice) return;
    notice.textContent = apiAvailable
      ? "Node 서버 API와 data/bookings.json에 예약을 저장합니다."
      : "정적 데모 환경이라 이 브라우저의 localStorage에만 예약을 저장하며 실제 병원에는 전송하지 않습니다.";
  }

  async function exportBookingsCsv() {
    const bookings = await readBookings();
    if (!bookings.length) {
      alert("내보낼 예약 내역이 없습니다.");
      return;
    }
    const headers = ["예약번호", "상태", "병원", "진료과", "검진항목", "이름", "연락처", "생년월일", "날짜", "시간", "상담목적", "접수일시"];
    const rows = bookings.map((booking) => [
      booking.id,
      statusLabels[booking.status] || booking.status,
      booking.hospital,
      booking.department,
      booking.packageName,
      booking.name,
      booking.phone,
      booking.birthDate,
      booking.date,
      booking.time,
      booking.purpose,
      booking.createdAt
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `labinsight-bookings-${formatDate(new Date())}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function countAvailableSlots(hospital, bookings) {
    let count = 0;
    for (let offset = 1; offset <= 14; offset += 1) {
      const date = formatDate(addDays(new Date(), offset));
      const reserved = new Set(bookings
        .filter((booking) => booking.hospitalId === hospital.id && booking.date === date && booking.status !== "cancelled")
        .map((booking) => booking.time));
      count += hospital.slots.filter((slot) => !reserved.has(slot)).length;
    }
    return count;
  }

  function findHospitalIdByName(name) {
    return hospitals.find((hospital) => hospital.name === name)?.id || "";
  }

  function makeBookingId() {
    const stamp = formatDate(new Date()).replaceAll("-", "");
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `LI-${stamp}-${random}`;
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function maskPhone(phone) {
    return String(phone || "").replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, "$1-****-$3");
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(id, message) {
    const element = byId(id);
    if (element) element.textContent = message;
  }
})();
