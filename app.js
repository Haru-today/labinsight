(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const storageKey = "labinsight-bookings";
  const reportStorageKey = "labinsight-latest-report";
  const apiBaseUrl = String(window.LABINSIGHT_CONFIG?.apiBaseUrl || "").trim().replace(/\/$/, "");
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

  const bookingHospitals = [
    {
      id: "busan-med", name: "LabInsight 예약 데모 센터", region: "온라인 데모", area: "실제 병원 전송 없음", dept: "샘플 건강상담",
      address: "기능 확인용 가상 센터", phone: "연락처 없음", packages: ["종합검진", "간 기능", "당뇨"],
      rating: 0, reviewCount: 0, duration: 50, badges: ["기능 확인용"], slots: ["09:00", "10:30", "13:30", "15:00"],
      plans: [
        { category: "종합검진", name: "베이직 종합검진", price: 90000, originalPrice: 120000, includes: ["혈액 40종", "흉부 X-ray", "심전도"] },
        { category: "간 기능", name: "간 기능 집중검진", price: 65000, originalPrice: 80000, includes: ["간 기능 8종", "B·C형 간염", "상담"] },
        { category: "당뇨", name: "당대사 체크", price: 55000, originalPrice: 70000, includes: ["공복혈당", "HbA1c", "소변검사"] }
      ]
    },
    {
      id: "centum-gi", name: "센텀 소화기클리닉", region: "부산", area: "센텀시티역 7분", dept: "소화기내과",
      address: "부산 해운대구 센텀중앙로 48", phone: "051-000-2200", packages: ["간 기능", "종합검진"],
      rating: 4.8, reviewCount: 512, duration: 60, badges: ["전문의 결과 설명", "초음파 포함"], slots: ["09:30", "11:00", "14:00", "16:00"],
      plans: [
        { category: "간 기능", name: "간·복부 정밀 패키지", price: 120000, originalPrice: 160000, includes: ["복부초음파", "간 기능 10종", "간염 검사"] },
        { category: "종합검진", name: "소화기 안심 종합검진", price: 190000, originalPrice: 240000, includes: ["위 검사 상담", "복부초음파", "혈액 45종"] }
      ]
    },
    {
      id: "seoul-endo", name: "서울 라이프내분비센터", region: "서울", area: "강남역 3분", dept: "내분비내과",
      address: "서울 강남구 테헤란로 152", phone: "02-000-3300", packages: ["당뇨", "이상지질혈증"],
      rating: 4.6, reviewCount: 741, duration: 45, badges: ["강남권 인기", "평일 야간"], slots: ["09:00", "10:00", "14:30", "16:30"],
      plans: [
        { category: "당뇨", name: "당뇨 위험 정밀검진", price: 110000, originalPrice: 145000, includes: ["HbA1c", "인슐린", "미세알부민뇨"] },
        { category: "이상지질혈증", name: "대사·지질 체크", price: 85000, originalPrice: 110000, includes: ["지질 4종", "공복혈당", "의료진 상담"] }
      ]
    },
    {
      id: "daegu-kidney", name: "대구 신장건강의원", region: "대구", area: "반월당역 4분", dept: "신장내과",
      address: "대구 중구 달구벌대로 2095", phone: "053-000-4400", packages: ["신장 기능", "종합검진"],
      rating: 4.5, reviewCount: 186, duration: 50, badges: ["신장 전문 상담", "빠른 결과"], slots: ["09:20", "10:40", "13:40", "15:20"],
      plans: [
        { category: "신장 기능", name: "신장 기능 정밀검진", price: 100000, originalPrice: 135000, includes: ["eGFR", "미세알부민뇨", "신장초음파 상담"] },
        { category: "종합검진", name: "대사·신장 종합검진", price: 175000, originalPrice: 220000, includes: ["혈액 42종", "소변검사", "심전도"] }
      ]
    },
    {
      id: "online-lab", name: "온라인 검진상담 Lab", region: "온라인 상담", area: "전국 비대면", dept: "가정의학과",
      address: "비대면 결과 상담", phone: "1588-0000", packages: ["종합검진", "빈혈", "당뇨"],
      rating: 4.4, reviewCount: 92, duration: 25, badges: ["방문 전 상담", "결과지 리뷰"], slots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
      plans: [
        { category: "종합검진", name: "결과지 종합 상담", price: 30000, originalPrice: 40000, includes: ["결과지 검토", "질문 정리", "추가 검진 안내"] },
        { category: "빈혈", name: "혈액·빈혈 결과 상담", price: 35000, originalPrice: 45000, includes: ["CBC 결과 검토", "식생활 안내", "추적검사 안내"] },
        { category: "당뇨", name: "당대사 결과 상담", price: 35000, originalPrice: 45000, includes: ["혈당 추이 검토", "생활관리", "추적검사 안내"] }
      ]
    },
    {
      id: "seoul-heart", name: "서울 하트리스크 클리닉", region: "서울", area: "잠실역 6분", dept: "심장내과",
      address: "서울 송파구 올림픽로 300", phone: "02-000-5500", packages: ["이상지질혈증", "종합검진"],
      rating: 4.9, reviewCount: 624, duration: 70, badges: ["평점 상위", "심혈관 집중"], slots: ["09:10", "10:50", "14:10", "15:50"],
      plans: [
        { category: "이상지질혈증", name: "심혈관·지질 정밀검진", price: 150000, originalPrice: 195000, includes: ["지질 4종", "심전도", "경동맥초음파 상담"] },
        { category: "종합검진", name: "하트 안심 종합검진", price: 210000, originalPrice: 270000, includes: ["심전도", "혈액 45종", "심혈관 위험 상담"] }
      ]
    }
  ];

  const hospitals = Array.isArray(window.LABINSIGHT_HOSPITALS) ? window.LABINSIGHT_HOSPITALS : [];
  let selectedHospital = null;
  let apiAvailable = false;
  let deferredInstallPrompt = null;
  const comparedHospitalIds = new Set();
  const expandedHospitalIds = new Set();

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindNav();
    bindOcr();
    bindForm();
    bindBmiPreview();
    bindHospitals();
    bindBookingModal();
    bindAppShell();
    restoreSavedReport();
    applyMarketplaceQuery();
    detectBookingApi();
    renderHospitals();
    updateBookingSummary();
  }

  function bindAppShell() {
    const installButtons = [byId("installAppBtn"), byId("tabInstallBtn")].filter(Boolean);
    const mode = byId("appModeStatus");
    const network = byId("networkStatus");
    const cache = byId("cacheStatus");
    const desktop = new URLSearchParams(window.location.search).get("desktop") === "1";
    const nativeMobile = Boolean(window.Capacitor?.isNativePlatform?.());
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone;

    if (desktop) document.body.classList.add("desktop-app");
    if (nativeMobile) document.body.classList.add("native-mobile");
    if (mode) mode.textContent = desktop ? "데스크톱 앱 모드" : nativeMobile ? "모바일 앱 모드" : standalone ? "설치된 앱 모드" : "브라우저 앱 모드";

    const setNetworkStatus = () => {
      if (!network) return;
      network.textContent = navigator.onLine ? "온라인" : "오프라인";
      network.className = navigator.onLine ? "" : "is-offline";
    };
    setNetworkStatus();
    window.addEventListener("online", setNetworkStatus);
    window.addEventListener("offline", setNetworkStatus);

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      installButtons.forEach((button) => {
        button.hidden = false;
      });
    });

    installButtons.forEach((button) => {
      button.addEventListener("click", promptInstallApp);
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      if (mode) mode.textContent = "설치된 앱 모드";
      installButtons.forEach((button) => {
        button.hidden = true;
      });
    });

    if (desktop || nativeMobile) {
      installButtons.forEach((button) => {
        button.hidden = true;
      });
      if (cache) cache.textContent = apiBaseUrl ? "예약 서버 연결 준비" : "기기 내 데이터 저장";
    } else if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js")
        .then(() => {
          if (cache) cache.textContent = "오프라인 준비 완료";
        })
        .catch((error) => {
          console.error(error);
          if (cache) cache.textContent = "오프라인 캐시 대기";
        });
    } else if (cache) {
      cache.textContent = "오프라인 미지원";
    }
  }

  async function promptInstallApp() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    [byId("installAppBtn"), byId("tabInstallBtn")].filter(Boolean).forEach((button) => {
      button.hidden = true;
    });
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
    const ocrOption = byId("ocr");
    document.querySelectorAll('a[href="#ocr"]').forEach((link) => {
      link.addEventListener("click", () => {
        if (ocrOption) ocrOption.open = true;
      });
    });
    if (window.location.hash === "#ocr" && ocrOption) ocrOption.open = true;
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
    const showSampleReport = () => {
      saveReport(sampleData);
      window.location.href = "./report.html";
    };
    byId("heroSampleBtn")?.addEventListener("click", showSampleReport);
    byId("emptySampleBtn")?.addEventListener("click", showSampleReport);
    byId("sampleBtn")?.addEventListener("click", () => {
      fillForm(sampleData);
      updateBmiPreview();
    });
    byId("clearBtn")?.addEventListener("click", () => {
      form?.reset();
      localStorage.removeItem(reportStorageKey);
      updateBmiPreview();
    });
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = collectFormData();
      const hasLabs = labItems.some((item) => data[item.id] !== null);
      const hasBloodPressure = data.bpSys !== null && data.bpDia !== null;
      if (!hasLabs && !hasBloodPressure && data.bmi === null) {
        setStatus("formStatus", "검사값, 혈압(수축기·이완기), 키·몸무게 중 한 가지 이상을 입력한 뒤 리포트를 생성하세요.");
        return;
      }
      setStatus("formStatus", "");
      saveReport(data);
      window.location.href = "./report.html";
    });
  }

  function saveReport(data) {
    const reportData = { ...data };
    reportData.bmi = calculateBmi(reportData.height, reportData.weight);
    reportData.reportSchemaVersion = 2;
    localStorage.setItem(reportStorageKey, JSON.stringify(reportData));
  }

  function readSavedReport() {
    try {
      const parsed = JSON.parse(localStorage.getItem(reportStorageKey) || "null");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      const numericFields = ["age", "height", "weight", "bpSys", "bpDia", ...labItems.map((item) => item.id)];
      numericFields.forEach((field) => { parsed[field] = safeNumber(parsed[field]); });
      parsed.bmi = calculateBmi(parsed.height, parsed.weight);
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function restoreSavedReport() {
    const saved = readSavedReport();
    if (byId("healthForm") && saved) {
      fillForm(saved);
      updateBmiPreview();
    }
    if (byId("report") && saved) renderReport(saved);
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
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().replace(",", ".");
    if (!normalized || !/^(?:\+?)(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) return null;
    const number = Number(normalized);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function calculateBmi(height, weight) {
    if (!height || !weight || height <= 0 || weight <= 0) return null;
    return weight / Math.pow(height / 100, 2);
  }

  function judgeItem(item, value) {
    if (!Number.isFinite(value) || value < 0) return { level: "missing", label: "미입력", points: 0 };
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
    const results = labItems.map((item) => {
      const value = safeNumber(data[item.id]);
      return { item, value, judge: judgeItem(item, value) };
    });
    const enteredCount = results.filter((result) => result.value !== null).length;
    const incomplete = enteredCount !== labItems.length;
    const abnormal = results.filter((result) => result.judge.level === "caution" || result.judge.level === "danger");
    const rawScore = results.reduce((sum, result) => sum + result.judge.points, 0);
    const score = Math.min(100, Math.round(rawScore * 100 / 120));
    const grade = enteredCount === 0 ? "검사 수치 미입력" : incomplete ? "부분 입력 · 해석 제한" : score <= 30 ? "입력 범위 양호" : score <= 60 ? "추가 확인" : "상담 권장";
    const gradeClass = incomplete ? "caution" : score <= 30 ? "normal" : score <= 60 ? "caution" : "danger";
    const summaryText = enteredCount === 0
      ? "입력된 혈액검사 수치가 없어 검사결과를 판정할 수 없습니다."
      : abnormal.length
        ? `확인이 필요한 입력 항목은 ${abnormal.map((r) => r.item.name).join(", ")}입니다.`
        : incomplete
          ? `입력한 ${enteredCount}개 검사 항목은 설정된 참고 범위 안에 있으나, 미입력 항목은 평가되지 않았습니다.`
          : "입력된 검사 항목이 설정된 참고 범위 안에 있습니다.";
    const guides = buildGuides(data);
    const checkups = buildRecommendedCheckups(data, score);
    const primaryCheckup = checkups[0] || { package: "종합검진", deptFilter: "all" };
    const compareUrl = buildHospitalUrl(primaryCheckup.package, primaryCheckup.deptFilter);
    const report = byId("report");
    if (!report) return;
    report.innerHTML = `
      <div class="report-wrap">
        <div class="report-top">
          <div class="score-box"><div><strong>${incomplete ? "—" : score}</strong><p>주의 항목 지수 · ${enteredCount}/${labItems.length}개 입력</p><span class="badge ${gradeClass}">${grade}</span></div></div>
          <div>
            <p class="eyebrow">검진 리포트</p>
            <h2>현재 상태 요약</h2>
            <p>${summaryText}</p>
            ${incomplete ? '<p class="notice">일부 검사항목이 비어 있어 주의 항목 지수를 표시하지 않습니다. 미입력은 정상 판정을 의미하지 않습니다.</p>' : ""}
            ${data.reportSchemaVersion !== 2 ? '<p class="notice">이전 버전에서 저장한 결과는 빈칸이 0으로 기록되었을 수 있습니다. 원본 결과지와 대조하여 다시 입력하세요.</p>' : ""}
            <p class="notice">이 리포트는 참고용이며 진단이나 치료를 대신하지 않습니다.</p>
          </div>
        </div>
        <section class="recommendation-panel" aria-label="추천 건강검진">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">결과 기반 추천 검진</p>
              <h3>결과 기반 추천 건강검진</h3>
            </div>
            <p>입력된 이상 항목을 바탕으로 다음에 확인하면 좋은 검진 패키지를 제안합니다.</p>
          </div>
          <div class="checkup-grid">${checkups.map(renderCheckupCard).join("")}</div>
        </section>
        <div class="report-next-actions">
          <div>
            <p class="eyebrow">NEXT STEP</p>
            <h3>권고 검진을 제공하는 병원과 가격을 비교해 보세요.</h3>
            <p>추천 조건을 적용한 병원 목록에서 패키지 구성, 예상 가격과 예약 가능 시간을 확인합니다.</p>
          </div>
          <div>
            <a class="button primary large" href="${compareUrl}">STEP 3 병원·가격 비교하기</a>
            <a class="button ghost" href="./checkup.html">입력값 수정하기</a>
          </div>
        </div>
        <div class="report-grid">
          <div class="report-card"><h3>주요 이상 항목</h3>${renderList(abnormal.map((r) => `${r.item.name}: ${r.value} ${r.item.unit} (${r.judge.label})`), "이상 항목이 없습니다.")}</div>
          <div class="report-card"><h3>기본 건강지표</h3>${renderBasicMetrics(data)}</div>
          <div class="report-card"><h3>권장 식습관</h3>${renderList(guides.food)}</div>
          <div class="report-card"><h3>운동 가이드</h3>${renderList(guides.exercise)}</div>
          <div class="report-card"><h3>생활습관 가이드</h3>${renderList(guides.lifestyle)}</div>
          <div class="report-card"><h3>의료진 상담 질문</h3>${renderList(guides.questions)}</div>
          <div class="report-card"><h3>권장 추가 검사</h3>${renderList(guides.tests)}<p><strong>재검 시점:</strong> 검사기관 참고치와 의료진 상담에 따라 결정하세요.</p></div>
        </div>
        <div class="report-card report-table-card">
          <h3>검사항목별 참고 범위 확인표</h3>
          <div class="table-scroll" role="region" aria-label="검사항목별 참고 범위 확인표" tabindex="0">
            <table class="result-table">
              <thead><tr><th>항목</th><th>입력값</th><th>상태</th><th>설명</th></tr></thead>
              <tbody>${results.map(renderResultRow).join("")}</tbody>
            </table>
          </div>
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
        <button class="button secondary" type="button" data-recommend-package="${checkup.package}" data-recommend-dept="${checkup.deptFilter}">이 검진의 병원·가격 보기</button>
      </article>
    `;
  }

  function renderResultRow(result) {
    const key = result.item.id;
    const badgeClass = result.judge.level === "danger" ? "danger" : result.judge.level === "caution" ? "caution" : result.judge.level === "missing" ? "missing" : "normal";
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
    if (Number.isFinite(data.bmi)) {
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
    if (!packageFilter || !byId("hospitalList")) {
      window.location.href = buildHospitalUrl(packageName, deptName);
      return;
    }
    if (packageFilter) packageFilter.value = packageName;
    if (deptFilter) deptFilter.value = deptName;
    syncPackageShortcuts();
    renderHospitals();
    byId("marketplace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildHospitalUrl(packageName, deptName) {
    const params = new URLSearchParams();
    if (packageName && packageName !== "all") params.set("package", packageName);
    if (deptName && deptName !== "all") params.set("dept", deptName);
    return `./hospitals.html${params.toString() ? `?${params}` : ""}`;
  }

  function applyMarketplaceQuery() {
    if (!byId("hospitalList")) return;
    const params = new URLSearchParams(window.location.search);
    const packageName = params.get("package") || "all";
    const deptName = params.get("dept") || "all";
    const regionName = params.get("region") || "all";
    setSelectValue("packageFilter", packageName);
    setSelectValue("deptFilter", deptName);
    setSelectValue("regionFilter", regionName);
    syncPackageShortcuts();
    const context = byId("recommendationContext");
    if (context && (packageName !== "all" || deptName !== "all")) {
      context.hidden = false;
      context.innerHTML = `
        <div><span class="context-icon" aria-hidden="true">✓</span><div><strong>리포트 추천 조건이 적용되었습니다.</strong><p>${escapeHtml(packageName === "all" ? "전체 검진" : packageName)} · ${escapeHtml(deptName === "all" ? "전체 진료과" : deptName)} 중심으로 먼저 보여드립니다.</p></div></div>
        <a href="./report.html">리포트로 돌아가기</a>
      `;
    }
  }

  function setSelectValue(id, value) {
    const select = byId(id);
    if (!select) return;
    const exists = Array.from(select.options).some((option) => option.value === value);
    if (exists) select.value = value;
  }

  function isHigh(value, limit) { return Number.isFinite(value) && value >= 0 && value > limit; }
  function isLow(value, limit) { return Number.isFinite(value) && value >= 0 && value < limit; }

  function judgeBloodPressure(sys, dia) {
    if (sys === null && dia === null) return "미입력";
    if ((sys !== null && sys >= 130) || (dia !== null && dia >= 85)) return "고혈압 관리 필요";
    if ((sys !== null && sys >= 120) || (dia !== null && dia >= 80)) return "주의";
    return "정상";
  }

  function bindHospitals() {
    ["regionFilter", "deptFilter", "packageFilter", "priceFilter", "sortFilter"].forEach((id) => {
      byId(id)?.addEventListener("change", () => {
        syncPackageShortcuts();
        renderHospitals();
      });
    });
    byId("keywordFilter")?.addEventListener("input", renderHospitals);
    document.querySelectorAll("[data-package-shortcut]").forEach((button) => {
      button.addEventListener("click", () => {
        setSelectValue("packageFilter", button.dataset.packageShortcut || "all");
        syncPackageShortcuts();
        renderHospitals();
      });
    });
    byId("resetFiltersBtn")?.addEventListener("click", () => {
      ["regionFilter", "deptFilter", "packageFilter", "priceFilter"].forEach((id) => setSelectValue(id, "all"));
      setSelectValue("sortFilter", "recommended");
      if (byId("keywordFilter")) byId("keywordFilter").value = "";
      const context = byId("recommendationContext");
      if (context) context.hidden = true;
      window.history.replaceState({}, "", "./hospitals.html");
      syncPackageShortcuts();
      renderHospitals();
    });
    byId("clearCompareBtn")?.addEventListener("click", () => {
      comparedHospitalIds.clear();
      renderHospitals();
      renderComparePanel();
    });
    byId("tryBookingBtn")?.addEventListener("click", () => openBookingModal("busan-med", "종합검진"));
    byId("viewBookingsBtn")?.addEventListener("click", renderBookings);
    byId("exportBookingsBtn")?.addEventListener("click", exportBookingsCsv);
  }

  function syncPackageShortcuts() {
    const current = byId("packageFilter")?.value || "all";
    document.querySelectorAll("[data-package-shortcut]").forEach((button) => {
      const active = button.dataset.packageShortcut === current;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderHospitals() {
    const list = byId("hospitalList");
    if (!list) return;
    const region = byId("regionFilter")?.value || "all";
    const dept = byId("deptFilter")?.value || "all";
    const pack = byId("packageFilter")?.value || "all";
    const maxPrice = byId("priceFilter")?.value === "all" ? Infinity : Number(byId("priceFilter")?.value);
    const sort = byId("sortFilter")?.value || "recommended";
    const keyword = String(byId("keywordFilter")?.value || "").trim().toLowerCase();
    const withPlans = hospitals.map((hospital) => {
      const hospitalKeywords = `${hospital.name} ${hospital.region} ${hospital.area} ${hospital.dept} ${hospital.address}`.toLowerCase();
      const hospitalMatchesKeyword = !keyword || hospitalKeywords.includes(keyword);
      const plans = hospital.plans.filter((plan) => {
        const price = Number(plan.price);
        const planKeywords = `${plan.name} ${plan.category} ${(plan.tags || []).join(" ")} ${(plan.includes || []).join(" ")}`.toLowerCase();
        return planMatchesPackage(plan, pack) &&
          Number.isFinite(price) &&
          price <= maxPrice &&
          (hospitalMatchesKeyword || planKeywords.includes(keyword));
      });
      return { hospital, plans };
    });
    const filtered = withPlans.filter(({ hospital, plans }) => {
      return plans.length &&
        (region === "all" || hospital.region === region) &&
        (dept === "all" || hospital.dept === dept || hospital.departments?.includes(dept));
    });
    filtered.sort((left, right) => {
      if (sort === "price") return minPlanPrice(left.plans) - minPlanPrice(right.plans);
      if (sort === "packages") return right.plans.length - left.plans.length || minPlanPrice(left.plans) - minPlanPrice(right.plans);
      if (sort === "name") return left.hospital.name.localeCompare(right.hospital.name, "ko");
      const queryBoost = pack === "all" ? 0 : Number(right.plans.some((plan) => plan.category === pack)) - Number(left.plans.some((plan) => plan.category === pack));
      return queryBoost || right.plans.length - left.plans.length || minPlanPrice(left.plans) - minPlanPrice(right.plans);
    });
    const resultCount = byId("resultCount");
    if (resultCount) resultCount.textContent = `병원 ${filtered.length}곳 · 패키지 ${filtered.reduce((sum, item) => sum + item.plans.length, 0)}개`;
    list.innerHTML = filtered.length
      ? filtered.map(({ hospital, plans }) => renderHospitalCard(hospital, plans)).join("")
      : `<div class="no-results"><span aria-hidden="true">⌕</span><h3>조건에 맞는 공개 패키지가 없습니다.</h3><p>지역이나 가격 조건을 넓혀 다시 찾아보세요.</p><button class="button secondary" type="button" data-reset-empty>조건 초기화</button></div>`;
    list.querySelectorAll("[data-compare]").forEach((input) => {
      input.addEventListener("change", () => toggleHospitalCompare(input.dataset.compare || "", input.checked, input));
    });
    list.querySelectorAll("[data-expand-hospital]").forEach((button) => {
      button.addEventListener("click", () => {
        const hospitalId = button.dataset.expandHospital || "";
        if (expandedHospitalIds.has(hospitalId)) expandedHospitalIds.delete(hospitalId);
        else expandedHospitalIds.add(hospitalId);
        renderHospitals();
      });
    });
    list.querySelector("[data-reset-empty]")?.addEventListener("click", () => {
      byId("resetFiltersBtn")?.click();
    });
    renderComparePanel();
  }

  function renderHospitalCard(hospital, plans) {
    const minimumPrice = minPlanPrice(plans);
    const compareChecked = comparedHospitalIds.has(hospital.id);
    const expanded = expandedHospitalIds.has(hospital.id);
    const visiblePlans = expanded ? plans : plans.slice(0, 5);
    const hiddenCount = plans.length - visiblePlans.length;
    const sourceUrl = escapeHtml(hospital.sourceUrl);
    return `
      <article class="hospital-card marketplace-card">
        <div class="hospital-identity">
          <div class="hospital-symbol" aria-hidden="true">${escapeHtml(hospital.name.slice(0, 1))}</div>
          <div>
            <div class="hospital-card-head"><span class="official-label">공식 출처 확인</span><h3>${escapeHtml(hospital.name)}</h3></div>
            <p class="hospital-location">${escapeHtml(hospital.region)} · ${escapeHtml(hospital.area)} · ${escapeHtml(hospital.dept)}</p>
            <p class="hospital-source-status"><strong>${escapeHtml(hospital.priceBasis)}</strong><span>확인 ${escapeHtml(hospital.verifiedAt)}</span></p>
          </div>
          <label class="compare-check"><input type="checkbox" data-compare="${hospital.id}" ${compareChecked ? "checked" : ""}><span>비교함</span></label>
        </div>
        <div class="hospital-badges">${hospital.badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}</div>
        <div class="hospital-overview">
          <div><span>공개 최저가</span><strong>${formatPlanPrice(plans.find((plan) => plan.price === minimumPrice))}</strong></div>
          <div><span>현재 검색 결과</span><strong>${plans.length}개 패키지</strong></div>
          <div><span>예약·문의</span><strong>${escapeHtml(hospital.phone)}</strong></div>
        </div>
        ${hospital.note ? `<p class="hospital-data-note">${escapeHtml(hospital.note)}</p>` : ""}
        <div class="package-list">
          ${visiblePlans.map((plan) => `
            <div class="package-row">
              <div class="package-copy">
                <span class="package-category">${escapeHtml(plan.category)} · ${escapeHtml(plan.type || "검진 패키지")}</span>
                <strong>${escapeHtml(plan.name)}</strong>
                <p>${plan.includes.map(escapeHtml).join(" · ")}</p>
              </div>
              <div class="package-price">
                <strong>${formatPlanPrice(plan)}</strong>
                <small>${escapeHtml(hospital.priceBasis)}</small>
              </div>
              <a class="button primary" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">공식 정보 확인</a>
            </div>
          `).join("")}
        </div>
        ${plans.length > 5 ? `<button class="package-expand" type="button" data-expand-hospital="${hospital.id}" aria-expanded="${expanded}">${expanded ? "패키지 접기" : `나머지 ${hiddenCount}개 패키지 전체 보기`}</button>` : ""}
        <div class="hospital-card-foot">
          <span>${escapeHtml(hospital.address)}</span>
          <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(hospital.sourceLabel)} ↗</a>
        </div>
      </article>
    `;
  }

  function minPlanPrice(plans) {
    const prices = plans.map((plan) => Number(plan.price)).filter(Number.isFinite);
    return prices.length ? Math.min(...prices) : Infinity;
  }

  function formatWon(value) {
    return `${Number(value || 0).toLocaleString("ko-KR")}원`;
  }

  function formatPlanPrice(plan) {
    if (!plan || !Number.isFinite(Number(plan.price))) return "공식 문의";
    return `${plan.pricePrefix || ""}${formatWon(plan.price)}`;
  }

  function planMatchesPackage(plan, packageName) {
    if (packageName === "all") return true;
    return plan.category === packageName || plan.tags?.includes(packageName);
  }

  function toggleHospitalCompare(hospitalId, checked, input) {
    if (!hospitalId) return;
    if (checked && comparedHospitalIds.size >= 3 && !comparedHospitalIds.has(hospitalId)) {
      input.checked = false;
      alert("병원 비교는 최대 3곳까지 선택할 수 있습니다.");
      return;
    }
    if (checked) comparedHospitalIds.add(hospitalId);
    else comparedHospitalIds.delete(hospitalId);
    renderComparePanel();
  }

  function renderComparePanel() {
    const panel = byId("comparePanel");
    const items = byId("compareItems");
    if (!panel || !items) return;
    const selected = hospitals.filter((hospital) => comparedHospitalIds.has(hospital.id));
    panel.hidden = !selected.length;
    if (!selected.length) {
      items.innerHTML = "";
      return;
    }
    const pack = byId("packageFilter")?.value || "all";
    const selectedPlans = selected.map((hospital) => {
      const matching = pack === "all" ? hospital.plans : hospital.plans.filter((plan) => planMatchesPackage(plan, pack));
      return { hospital, plan: [...matching].sort((a, b) => a.price - b.price)[0] || hospital.plans[0] };
    });
    items.innerHTML = `
      <table class="compare-table">
        <thead><tr><th>비교 항목</th>${selectedPlans.map(({ hospital }) => `<th>${escapeHtml(hospital.name)}</th>`).join("")}</tr></thead>
        <tbody>
          <tr><th>선택 패키지</th>${selectedPlans.map(({ plan }) => `<td><strong>${escapeHtml(plan.name)}</strong><small>${escapeHtml(plan.category)}</small></td>`).join("")}</tr>
          <tr><th>공개 가격</th>${selectedPlans.map(({ plan }) => `<td class="compare-price">${formatPlanPrice(plan)}</td>`).join("")}</tr>
          <tr><th>포함 검사</th>${selectedPlans.map(({ plan }) => `<td>${plan.includes.map(escapeHtml).join("<br>")}</td>`).join("")}</tr>
          <tr><th>가격 기준</th>${selectedPlans.map(({ hospital }) => `<td>${escapeHtml(hospital.priceBasis)}<small>확인 ${escapeHtml(hospital.verifiedAt)}</small></td>`).join("")}</tr>
          <tr><th>문의</th>${selectedPlans.map(({ hospital }) => `<td>${escapeHtml(hospital.phone)}</td>`).join("")}</tr>
          <tr><th>공식 출처</th>${selectedPlans.map(({ hospital }) => `<td><a class="button primary" href="${escapeHtml(hospital.sourceUrl)}" target="_blank" rel="noopener noreferrer">공식 페이지</a></td>`).join("")}</tr>
        </tbody>
      </table>
    `;
  }

  function bindBookingModal() {
    byId("closeModalBtn")?.addEventListener("click", closeBookingModal);
    byId("bookingModal")?.addEventListener("click", (event) => {
      if (event.target.id === "bookingModal") closeBookingModal();
    });
    byId("bookingForm")?.addEventListener("submit", saveBooking);
    byId("bookDate")?.addEventListener("change", updateTimeOptions);
  }

  async function openBookingModal(hospitalId, packageName = "") {
    selectedHospital = bookingHospitals.find((hospital) => hospital.id === hospitalId) || null;
    if (!selectedHospital) return;
    const modal = byId("bookingModal");
    const selected = byId("selectedHospital");
    const status = byId("bookingStatus");
    const dateInput = byId("bookDate");
    const packageSelect = byId("bookPackage");
    if (selected) selected.textContent = `선택 병원: ${selectedHospital.name} · ${selectedHospital.dept} · ${selectedHospital.area}`;
    if (packageSelect) {
      packageSelect.innerHTML = `<option value="">선택</option>${selectedHospital.plans.map((plan) => `<option value="${escapeHtml(plan.category)}" ${plan.category === packageName ? "selected" : ""}>${escapeHtml(plan.name)} · ${formatWon(plan.price)}</option>`).join("")}`;
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
      setStatus("bookingStatus", `예약 요청이 저장되었습니다. 실제 병원에는 전송되지 않습니다. 예약번호: ${saved.id}`);
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
    const nativeMobile = Boolean(window.Capacitor?.isNativePlatform?.());
    if (window.location.protocol === "file:" || (nativeMobile && !apiBaseUrl)) {
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
    const response = await fetch(`${apiBaseUrl}${path}`, {
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
      : "정적 실행 환경에서는 이 브라우저의 localStorage에만 예약을 저장하며 실제 병원에는 전송하지 않습니다.";
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
    return bookingHospitals.find((hospital) => hospital.name === name)?.id || "";
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
