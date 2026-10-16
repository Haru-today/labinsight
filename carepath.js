(function () {
  "use strict";
  const api = window.LABINSIGHT_CAREPATH;
  if (!api || document.body?.dataset.page !== "carepath") return;
  const $ = id => document.getElementById(id);
  const svgNS = "http://www.w3.org/2000/svg";
  let demo = false;
  let memoryDemo = [];
  const today = new Date();
  const localToday = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") +
    "-" + String(today.getDate()).padStart(2, "0");
  $("carepathDate").max = localToday;
  $("carepathDate").value = localToday;
  const itemSelect = $("carepathItem");
  for (const item of api.ITEMS) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label + " (" + item.unit + ")";
    itemSelect.append(option);
  }
  function node(tag, content, cls) {
    const element = document.createElement(tag);
    if (content !== undefined) element.textContent = String(content);
    if (cls) element.className = cls;
    return element;
  }
  function activeRecords() { return demo ? memoryDemo : api.read(sessionStorage); }
  function message(msg) { $("carepathStatus").textContent = msg; }
  function fmt(num) { return Number(num).toLocaleString("ko-KR", { maximumFractionDigits: 3 }); }
  function renderChart(entries, item) {
    const area = $("carepathChart");
    area.replaceChildren();
    if (entries.length < 2) {
      area.append(node("p", "그래프를 그리려면 해당 항목이 포함된 검사 기록이 2개 이상 필요합니다."));
      return;
    }
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 640 260");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", item.label + ": " + entries.map(r => r.date + " " + fmt(r.value) + " " + item.unit).join(", "));
    const values = entries.map(r => r.value);
    let min = Math.min(...values), max = Math.max(...values);
    if (min === max) { const pad = Math.max(1, Math.abs(min) * .1); min -= pad; max += pad; }
    else { const pad = (max - min) * .2; min -= pad; max += pad; }
    const point = (r, i) => ({
      x: 58 + i * 525 / (entries.length - 1),
      y: 205 - (r.value - min) / (max - min) * 150
    });
    const pts = entries.map(point);
    const stroke = document.createElementNS(svgNS, "polyline");
    stroke.setAttribute("points", pts.map(p => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" "));
    stroke.setAttribute("fill", "none"); stroke.setAttribute("stroke", "#1769e0");
    stroke.setAttribute("stroke-width", "3"); stroke.setAttribute("stroke-linejoin", "round");
    svg.append(stroke);
    pts.forEach((p, i) => {
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", String(p.x)); dot.setAttribute("cy", String(p.y));
      dot.setAttribute("r", "5"); dot.setAttribute("fill", "#1769e0"); svg.append(dot);
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", String(p.x)); label.setAttribute("y", String(p.y - 12));
      label.setAttribute("font-size", "12"); label.setAttribute("fill", "#102b50");
      label.setAttribute("text-anchor", "middle"); label.textContent = fmt(entries[i].value); svg.append(label);
      const date = document.createElementNS(svgNS, "text");
      date.setAttribute("x", String(p.x)); date.setAttribute("y", "237");
      date.setAttribute("font-size", "12"); date.setAttribute("fill", "#435f73");
      date.setAttribute("text-anchor", "middle"); date.textContent = entries[i].date.slice(2); svg.append(date);
    });
    area.append(svg);
  }
  function renderTrend(records) {
    const id = itemSelect.value;
    const item = api.ITEMS.find(x => x.id === id);
    const result = api.compare(records, id);
    if (result.status !== "numeric-only") {
      $("carepathComparison").textContent = result.status === "unit-mismatch"
        ? "단위 불일치: 자동 환산이나 수치 비교를 하지 않습니다."
        : "해당 검사 항목에 대한 기록을 2개 이상 추가하면 수치 차이를 확인할 수 있습니다.";
    } else {
      const direction = result.difference > 0 ? "증가" : result.difference < 0 ? "감소" : "변화 없음";
      const difference = fmt(Math.abs(result.difference));
      $("carepathComparison").textContent = "처음 기록 대비 마지막 기록: " + difference + " " + item.unit +
        " " + direction + " (수치 차이만 표시, 진단·위험 판단 아님)." +
        (result.laboratoriesDiffer ? " 검사기관이 달라 비교에 주의가 필요합니다." : "") +
        (result.rangesDiffer ? " 검사기관 참고범위가 다르거나 확인되지 않은 기록이 있습니다." : "");
    }
    renderChart(result.entries, item);
    const tbody = $("carepathValues");
    tbody.replaceChildren();
    for (const e of result.entries) {
      const tr = node("tr");
      for (const cell of [e.date, e.laboratory, fmt(e.value) + " " + e.unit,
        e.range ? fmt(e.range.min) + "–" + fmt(e.range.max) + " " + e.unit : "원본 참고범위 미확인"]) {
        tr.append(node("td", cell));
      }
      tbody.append(tr);
    }
    if (!result.entries.length) {
      const tr = node("tr");
      const td = node("td", "선택한 항목의 기록이 없습니다.");
      td.colSpan = 4; tr.append(td); tbody.append(tr);
    }
  }
  function renderRecords(records) {
    $("carepathCount").textContent = records.length + "개 기록 · 최대 " + api.MAX_RECORDS + "개";
    $("carepathDemoNotice").hidden = !demo;
    $("carepathDemo").disabled = demo;
    $("carepathDeleteAll").disabled = demo || records.length === 0;
    const host = $("carepathRecords");
    host.replaceChildren();
    if (!records.length) host.append(node("p", "이 탭에 기록된 검사 결과가 없습니다. 원본 검사값을 입력하거나 가상 예시를 체험하세요."));
    for (const r of records) {
      const article = node("article", undefined, "carepath-record");
      const head = node("div", undefined, "carepath-record-head");
      const group = node("div");
      group.append(node("h3", r.date + " · " + r.laboratory));
      group.append(node("p", Object.keys(r.values).length + "개 검사 수치" +
        (r.note ? " · 메모: " + r.note : ""), "muted"));
      head.append(group);
      if (!demo) {
        const remove = node("button", "이 기록 삭제", "button ghost");
        remove.type = "button";
        remove.addEventListener("click", () => {
          if (!window.confirm(r.date + " " + r.laboratory + " 검사 기록을 이 탭에서 삭제할까요?")) return;
          try {
            api.write(sessionStorage, api.read(sessionStorage).filter(x => x.id !== r.id));
            message("선택한 날짜의 기록을 삭제했습니다."); render();
          } catch (_) { message("브라우저 저장소에서 삭제하지 못했습니다. 사이트 데이터를 직접 삭제해 주세요."); }
        });
        head.append(remove);
      }
      article.append(head); host.append(article);
    }
  }
  function render() {
    const records = activeRecords();
    renderRecords(records); renderTrend(records);
  }
  function makeDemo() {
    const examples = [
      { date: "2024-09-20", ast: 29, glucose: 94, hba1c: 5.4 },
      { date: "2025-09-22", ast: 35, glucose: 99, hba1c: 5.6 },
      { date: "2026-09-24", ast: 30, glucose: 97, hba1c: 5.5 }
    ];
    return examples.map((r, i) => api.createRecord(r, r.date, "가상 검사기관 " + (i + 1),
      "교육용 가상 수치", true, localToday));
  }
  $("carepathForm").addEventListener("submit", event => {
    event.preventDefault();
    if (demo) { message("가상 예시 화면에서는 실제 기록을 추가하지 않습니다. 내 기록으로 돌아가세요."); return; }
    try {
      const raw = sessionStorage.getItem("labinsight-latest-report");
      const current = raw && raw.length < 20000 ? JSON.parse(raw) : null;
      if (current?.provenance === "sample") throw new Error("가상 예시로 입력한 리포트는 CarePath에 추가할 수 없습니다. 실제 결과를 다시 입력하세요.");
      const record = api.createRecord(current, $("carepathDate").value, $("carepathLab").value,
        $("carepathNote").value, $("carepathConfirm").checked, localToday);
      api.write(sessionStorage, api.addRecord(api.read(sessionStorage), record));
      $("carepathConfirm").checked = false;
      $("carepathNote").value = "";
      message(record.date + " 기록을 이 브라우저 탭에만 추가했습니다."); render();
    } catch (error) { message(error?.message || "리포트를 읽을 수 없습니다. 다시 확인해 주세요."); }
  });
  $("carepathDemo").addEventListener("click", () => {
    demo = true; memoryDemo = makeDemo(); itemSelect.value = "glucose";
    message("가상 예시를 체험 중입니다. 실제 이력에 저장되지 않습니다."); render();
  });
  $("carepathExitDemo").addEventListener("click", () => {
    demo = false; memoryDemo = []; message("내 기록으로 돌아왔습니다."); render();
  });
  $("carepathDeleteAll").addEventListener("click", () => {
    if (!window.confirm("이 탭의 CarePath 검사 기록을 모두 삭제할까요? 최신 리포트는 별도로 남습니다.")) return;
    try { sessionStorage.removeItem(api.KEY); message("CarePath 기록을 모두 삭제했습니다."); render(); }
    catch (_) { message("저장소 삭제에 실패했습니다. 브라우저의 사이트 데이터를 직접 삭제해 주세요."); }
  });
  itemSelect.addEventListener("change", () => renderTrend(activeRecords()));
  $("navToggle")?.addEventListener("click", () => {
    const links = $("navLinks"), toggle = $("navToggle");
    const opening = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(opening));
    links?.classList.toggle("is-open", opening);
  });
  render();
})();
