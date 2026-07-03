const metrics = [
  {
    id: 'ast', label: 'AST', group: 'liver', unit: 'U/L', placeholder: '예: 28',
    ref: () => '≤ 40', evaluate: v => upper(v, 40, 70),
    guide: 'AST 상승은 간세포 손상, 음주, 약물, 근육 손상 등과 관련될 수 있어 ALT, γ-GTP와 함께 확인합니다.'
  },
  {
    id: 'alt', label: 'ALT', group: 'liver', unit: 'U/L', placeholder: '예: 32',
    ref: () => '≤ 40', evaluate: v => upper(v, 40, 70),
    guide: 'ALT는 간세포 손상과 비교적 관련성이 높은 항목입니다. 지속 상승 시 재검 및 생활습관 점검이 필요합니다.'
  },
  {
    id: 'ggt', label: 'γ-GTP', group: 'liver', unit: 'U/L', placeholder: '예: 45',
    ref: sex => sex === 'female' ? '≤ 36' : '≤ 64', evaluate: (v, sex) => upper(v, sex === 'female' ? 36 : 64, sex === 'female' ? 60 : 100),
    guide: 'γ-GTP 상승은 음주, 지방간, 담도계 문제, 약물 영향과 연관될 수 있습니다.'
  },
  {
    id: 'glucose', label: '공복혈당', group: 'kidney', unit: 'mg/dL', placeholder: '예: 96',
    ref: () => '70–99', evaluate: v => glucose(v),
    guide: '공복혈당은 식사 상태의 영향을 크게 받습니다. 100 mg/dL 이상이면 생활습관과 HbA1c를 함께 확인합니다.'
  },
  {
    id: 'hba1c', label: 'HbA1c', group: 'kidney', unit: '%', placeholder: '예: 5.5',
    ref: () => '< 5.7', evaluate: v => hba1c(v),
    guide: 'HbA1c는 최근 2–3개월 혈당 경향을 반영합니다. 혈당과 함께 해석하면 좋습니다.'
  },
  {
    id: 'bun', label: 'BUN', group: 'kidney', unit: 'mg/dL', placeholder: '예: 14',
    ref: () => '7–20', evaluate: v => range(v, 7, 20, 5, 30),
    guide: 'BUN은 단백질 섭취, 탈수, 신장 기능 영향을 함께 받을 수 있습니다.'
  },
  {
    id: 'creatinine', label: 'Creatinine', group: 'kidney', unit: 'mg/dL', placeholder: '예: 0.9',
    ref: sex => sex === 'female' ? '0.6–1.1' : '0.7–1.3', evaluate: (v, sex) => sex === 'female' ? range(v, .6, 1.1, .45, 1.5) : range(v, .7, 1.3, .5, 1.7),
    guide: 'Creatinine은 신장 기능뿐 아니라 근육량의 영향을 받습니다. eGFR과 함께 보는 것이 적절합니다.'
  },
  {
    id: 'egfr', label: 'eGFR', group: 'kidney', unit: 'mL/min/1.73㎡', placeholder: '예: 92',
    ref: () => '≥ 90', evaluate: v => egfr(v),
    guide: 'eGFR이 낮으면 신장 여과 기능 저하 가능성을 평가합니다. 일회성 결과보다 반복 추세가 중요합니다.'
  },
  {
    id: 'uric', label: 'Uric acid', group: 'kidney', unit: 'mg/dL', placeholder: '예: 6.2',
    ref: sex => sex === 'female' ? '2.6–6.0' : '3.5–7.2', evaluate: (v, sex) => sex === 'female' ? range(v, 2.6, 6.0, 2.0, 7.5) : range(v, 3.5, 7.2, 2.5, 8.5),
    guide: '요산은 식이, 음주, 신장 배설, 약물 영향을 받을 수 있습니다. 통풍 증상 여부도 함께 확인합니다.'
  },
  {
    id: 'tc', label: 'Total cholesterol', group: 'lipid', unit: 'mg/dL', placeholder: '예: 185',
    ref: () => '< 200', evaluate: v => lipidUpper(v, 200, 240),
    guide: '총콜레스테롤은 LDL, HDL, 중성지방과 함께 종합적으로 해석해야 합니다.'
  },
  {
    id: 'tg', label: 'Triglyceride', group: 'lipid', unit: 'mg/dL', placeholder: '예: 120',
    ref: () => '< 150', evaluate: v => lipidUpper(v, 150, 200),
    guide: '중성지방은 식사, 음주, 당질 섭취 영향을 크게 받습니다. 공복 여부 확인이 중요합니다.'
  },
  {
    id: 'hdl', label: 'HDL-C', group: 'lipid', unit: 'mg/dL', placeholder: '예: 52',
    ref: sex => sex === 'female' ? '≥ 50' : '≥ 40', evaluate: (v, sex) => lower(v, sex === 'female' ? 50 : 40, sex === 'female' ? 40 : 35),
    guide: 'HDL-C가 낮으면 심혈관 위험 관리가 필요할 수 있습니다. 운동, 체중 관리와 관련됩니다.'
  },
  {
    id: 'ldl', label: 'LDL-C', group: 'lipid', unit: 'mg/dL', placeholder: '예: 115',
    ref: () => '< 130', evaluate: v => lipidUpper(v, 130, 160),
    guide: 'LDL-C는 심혈관 위험도 관리에서 핵심 항목입니다. 개인 위험도에 따라 목표치가 달라질 수 있습니다.'
  },
  {
    id: 'hemoglobin', label: 'Hemoglobin', group: 'blood', unit: 'g/dL', placeholder: '예: 14.2',
    ref: sex => sex === 'female' ? '12.0–16.0' : '13.5–17.5', evaluate: (v, sex) => sex === 'female' ? range(v, 12, 16, 10.5, 18) : range(v, 13.5, 17.5, 12, 19),
    guide: '혈색소는 빈혈, 탈수, 흡연, 만성질환 등과 관련될 수 있어 RBC index와 함께 보면 좋습니다.'
  }
];

const state = {
  activeFilter: 'all',
  lastResult: null
};

const $ = selector => document.querySelector(selector);
const metricGrid = $('#metricGrid');
const form = $('#reportForm');
const sexSelect = $('#sex');
const reportDate = $('#reportDate');

init();

function init() {
  reportDate.valueAsDate = new Date();
  renderMetrics();
  bindEvents();
}

function bindEvents() {
  form.addEventListener('submit', event => {
    event.preventDefault();
    analyze();
  });

  $('#resetBtn').addEventListener('click', () => {
    form.reset();
    reportDate.valueAsDate = new Date();
    $('#fileName').textContent = '선택된 파일 없음';
    $('#emptyResult').hidden = false;
    $('#resultContent').hidden = true;
    $('#heroScore').textContent = '--';
    $('#heroAbnormal').textContent = '0개';
    $('#heroPriority').textContent = '대기';
    $('#validationText').textContent = '검사 수치를 입력한 뒤 리포트 생성을 눌러주세요.';
    renderMetrics();
  });

  sexSelect.addEventListener('change', renderMetrics);

  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      state.activeFilter = button.dataset.filter;
      renderMetrics();
    });
  });

  $('#uploadBtn').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', event => {
    const file = event.target.files[0];
    $('#fileName').textContent = file ? file.name : '선택된 파일 없음';
  });
}

function renderMetrics() {
  const sex = sexSelect.value;
  const previousValues = collectRawValues();
  metricGrid.innerHTML = '';
  metrics
    .filter(metric => state.activeFilter === 'all' || metric.group === state.activeFilter)
    .forEach(metric => {
      const card = document.createElement('article');
      card.className = 'metric-card';
      card.dataset.group = metric.group;
      card.innerHTML = `
        <header>
          <div>
            <h3>${metric.label}</h3>
            <small>${groupName(metric.group)}</small>
          </div>
          <span class="metric-unit">${metric.unit}</span>
        </header>
        <div class="field">
          <input id="${metric.id}" name="${metric.id}" inputmode="decimal" type="number" step="0.01" placeholder="${metric.placeholder}" value="${previousValues[metric.id] ?? ''}">
        </div>
        <div class="reference-line"><span>참고 범위</span><strong>${metric.ref(sex)}</strong></div>
      `;
      metricGrid.appendChild(card);
    });
}

function collectRawValues() {
  const values = {};
  metrics.forEach(metric => {
    const input = document.getElementById(metric.id);
    if (input && input.value !== '') values[metric.id] = input.value;
  });
  return values;
}

function analyze() {
  const sex = sexSelect.value;
  const values = collectRawValues();
  const entered = metrics.filter(metric => values[metric.id] !== undefined && values[metric.id] !== '');

  if (!entered.length) {
    $('#validationText').textContent = '최소 1개 이상의 검사 수치를 입력해야 리포트가 생성됩니다.';
    return;
  }

  const findings = entered.map(metric => {
    const value = Number(values[metric.id]);
    const result = metric.evaluate(value, sex);
    return { ...metric, value, ...result };
  });

  const bmiFinding = makeBmiFinding();
  if (bmiFinding) findings.push(bmiFinding);

  const abnormal = findings.filter(item => item.status !== '정상');
  const score = Math.min(100, Math.round(findings.reduce((sum, item) => sum + item.weight, 0) / Math.max(findings.length, 1) * 16 + abnormal.length * 5));
  const risk = riskType(score, abnormal.length);
  const top = abnormal[0]?.label ?? '특이 이상 없음';

  const result = { findings, abnormal, score, risk, top };
  state.lastResult = result;
  renderResult(result);
}

function renderResult({ findings, abnormal, score, risk, top }) {
  $('#emptyResult').hidden = true;
  $('#resultContent').hidden = false;
  $('#riskBadge').textContent = risk.badge;
  $('#riskTitle').textContent = risk.title;
  $('#riskDescription').textContent = risk.description;
  $('#riskScore').textContent = score;
  $('#gaugeFill').style.width = `${score}%`;
  $('#enteredCount').textContent = `${findings.length}개`;
  $('#abnormalCount').textContent = `${abnormal.length}개`;
  $('#topPriority').textContent = top;
  $('#heroScore').textContent = score;
  $('#heroAbnormal').textContent = `${abnormal.length}개`;
  $('#heroPriority').textContent = top;
  $('#validationText').textContent = `총 ${findings.length}개 항목으로 리포트가 생성되었습니다.`;

  const meta = [];
  const name = $('#userName').value.trim() || '미기재';
  const age = $('#age').value.trim() || '미기재';
  const sexLabel = sexSelect.options[sexSelect.selectedIndex].textContent;
  const date = reportDate.value || new Date().toISOString().slice(0, 10);
  meta.push(`대상: ${name}`);
  meta.push(`나이: ${age}`);
  meta.push(`성별: ${sexLabel}`);
  meta.push(`검진일: ${date}`);
  $('#reportMeta').innerHTML = meta.map(item => `<span>${item}</span>`).join('');

  $('#findingList').innerHTML = findings
    .sort((a, b) => b.weight - a.weight)
    .map(item => `
      <article class="finding-card">
        <header>
          <div><strong>${item.label}</strong> <small>${item.value} ${item.unit}</small></div>
          <span class="status-pill ${statusClass(item.status)}">${item.status}</span>
        </header>
        <p>${item.message}</p>
      </article>
    `).join('');

  $('#guideList').innerHTML = makeGuides(findings, abnormal).map(text => `
    <article class="guide-card"><p>${text}</p></article>
  `).join('');

  $('#actionList').innerHTML = makeActions(abnormal, score).map(text => `
    <article class="action-card"><p>${text}</p></article>
  `).join('');
}

function makeGuides(findings, abnormal) {
  const groups = new Set(abnormal.map(item => item.group));
  const guides = [];

  if (!abnormal.length) {
    guides.push('입력된 항목에서는 뚜렷한 이상 신호가 적습니다. 현재 생활습관을 유지하면서 정기검진 결과를 누적해 추세를 확인하세요.');
  }
  if (groups.has('liver')) guides.push('간기능 항목이 주의 또는 위험으로 분류되었습니다. 최근 음주, 약물, 보충제, 격한 운동 여부를 확인하고 필요 시 재검을 고려하세요.');
  if (groups.has('kidney')) guides.push('혈당·신장·대사 관련 항목에 확인이 필요합니다. 공복 상태, 수분 섭취, 당질 섭취, 혈압과 함께 해석하는 것이 좋습니다.');
  if (groups.has('lipid')) guides.push('지질 항목은 심혈관 위험 관리와 연결됩니다. 포화지방·단순당 섭취를 줄이고 유산소 운동과 체중 관리를 병행하세요.');
  if (groups.has('blood')) guides.push('혈액 항목은 빈혈, 수분 상태, 만성질환 가능성과 연결될 수 있습니다. 증상이 있거나 반복 이상이면 추가 검사가 필요합니다.');

  findings.slice(0, 2).forEach(item => guides.push(item.guide));
  return [...new Set(guides)].slice(0, 5);
}

function makeActions(abnormal, score) {
  const actions = [];
  if (score >= 70) {
    actions.push('위험도가 높게 계산되었습니다. 가까운 시일 내 의료기관 상담 또는 재검 일정을 잡는 흐름으로 연결하는 것이 적절합니다.');
  } else if (score >= 35) {
    actions.push('주의 단계입니다. 1–3개월 내 생활습관 개선 후 재검하거나, 기존 질환이 있다면 담당 의료진과 결과를 공유하세요.');
  } else {
    actions.push('현재 입력값 기준 위험도는 낮습니다. 다음 정기검진까지 결과를 저장하고 전년도 대비 변화를 추적하세요.');
  }

  if (abnormal.some(item => item.group === 'liver')) actions.push('간기능 관련 항목은 소화기내과 또는 가정의학과 상담 연계 후보로 분류할 수 있습니다.');
  if (abnormal.some(item => item.id === 'glucose' || item.id === 'hba1c')) actions.push('혈당 관련 항목은 내분비내과 또는 가정의학과 상담 연계 후보로 분류할 수 있습니다.');
  if (abnormal.some(item => item.group === 'lipid')) actions.push('지질 관련 항목은 심혈관 위험 평가, 혈압, 흡연 여부, 가족력 정보와 함께 관리 우선순위를 정하면 좋습니다.');
  if (abnormal.some(item => item.id === 'creatinine' || item.id === 'egfr')) actions.push('신장기능 관련 항목은 eGFR 추세, 소변검사, 혈압 정보를 함께 확인하는 후속 리포트가 필요합니다.');

  return actions.slice(0, 5);
}

function makeBmiFinding() {
  const height = Number($('#height').value);
  const weight = Number($('#weight').value);
  if (!height || !weight) return null;
  const bmi = weight / Math.pow(height / 100, 2);
  let status = '정상', weightScore = 0, message = 'BMI가 일반적인 정상 범위에 해당합니다.';
  if (bmi < 18.5) { status = '주의'; weightScore = 2; message = 'BMI가 저체중 범위입니다. 식사량, 근육량, 최근 체중 변화 확인이 필요합니다.'; }
  else if (bmi >= 25 && bmi < 30) { status = '주의'; weightScore = 3; message = 'BMI가 비만 전단계 또는 1단계 비만 범위입니다. 혈당·지질·혈압과 함께 관리하세요.'; }
  else if (bmi >= 30) { status = '위험'; weightScore = 5; message = 'BMI가 높은 범위입니다. 대사증후군 위험 평가와 체중 관리 계획이 필요합니다.'; }
  return { id: 'bmi', label: 'BMI', group: 'kidney', unit: 'kg/㎡', value: bmi.toFixed(1), status, weight: weightScore, message, guide: 'BMI는 체중과 키만으로 계산되므로 근육량, 허리둘레, 혈압, 혈당과 함께 판단해야 합니다.' };
}

function upper(value, caution, danger) {
  if (value <= caution) return normal('참고 범위 안에 있습니다.');
  if (value <= danger) return cautionStatus('참고 범위를 넘었습니다. 최근 컨디션, 음주, 약물, 운동 영향을 확인하세요.', 3);
  return highStatus('상승 폭이 큽니다. 반복 검사 또는 의료진 상담이 필요할 수 있습니다.', 5);
}

function lower(value, caution, danger) {
  if (value >= caution) return normal('참고 범위 안에 있습니다.');
  if (value >= danger) return cautionStatus('기준보다 낮습니다. 생활습관과 관련 위험요인을 함께 확인하세요.', 3);
  return highStatus('낮은 정도가 큽니다. 추가 확인이 필요합니다.', 5);
}

function range(value, low, high, dangerLow, dangerHigh) {
  if (value >= low && value <= high) return normal('참고 범위 안에 있습니다.');
  if (value < dangerLow || value > dangerHigh) return highStatus('참고 범위에서 크게 벗어났습니다. 임상 상황과 함께 확인해야 합니다.', 5);
  return cautionStatus('참고 범위를 벗어났습니다. 일시적 변화인지 추세 확인이 필요합니다.', 3);
}

function lipidUpper(value, caution, danger) {
  if (value < caution) return normal('지질 참고 기준에서 양호한 범위입니다.');
  if (value < danger) return cautionStatus('경계 범위입니다. 식사, 운동, 체중, 가족력을 함께 점검하세요.', 3);
  return highStatus('높은 범위입니다. 심혈관 위험요인과 함께 의료진 상담을 고려하세요.', 5);
}

function glucose(value) {
  if (value >= 70 && value < 100) return normal('공복혈당이 일반적인 정상 범위입니다.');
  if (value >= 100 && value < 126) return cautionStatus('공복혈당장애 가능 범위입니다. HbA1c와 생활습관 확인이 필요합니다.', 4);
  if (value >= 126) return highStatus('당뇨병 진단 기준에 해당할 수 있는 범위입니다. 반복 검사와 의료진 판단이 필요합니다.', 6);
  return cautionStatus('혈당이 낮은 범위입니다. 증상과 식사 상태를 확인하세요.', 3);
}

function hba1c(value) {
  if (value < 5.7) return normal('HbA1c가 일반적인 정상 범위입니다.');
  if (value < 6.5) return cautionStatus('당뇨병 전단계 가능 범위입니다. 생활습관 관리와 추적 검사가 필요합니다.', 4);
  return highStatus('당뇨병 기준에 해당할 수 있는 범위입니다. 의료진 상담이 필요합니다.', 6);
}

function egfr(value) {
  if (value >= 90) return normal('eGFR이 양호한 범위입니다.');
  if (value >= 60) return cautionStatus('경도 감소 범위입니다. 나이, 기저질환, 반복 결과를 함께 확인하세요.', 3);
  return highStatus('eGFR이 낮은 범위입니다. 신장기능 평가가 필요합니다.', 6);
}

function normal(message) { return { status: '정상', weight: 0, message }; }
function cautionStatus(message, weight) { return { status: '주의', weight, message }; }
function highStatus(message, weight) { return { status: '위험', weight, message }; }

function riskType(score, abnormalCount) {
  if (score >= 70 || abnormalCount >= 6) {
    return {
      badge: 'High priority',
      title: '높은 관리 우선순위',
      description: '입력된 항목 중 여러 지표가 기준 범위를 벗어났습니다. 단순 생활 가이드보다 재검·상담 연결이 우선입니다.'
    };
  }
  if (score >= 35 || abnormalCount >= 2) {
    return {
      badge: 'Watch list',
      title: '주의 관리 필요',
      description: '일부 항목에서 주의 신호가 있습니다. 생활습관을 조정하고 추세를 확인하는 것이 좋습니다.'
    };
  }
  return {
    badge: 'Stable',
    title: '현재 입력값 기준 안정적',
    description: '입력된 수치에서는 큰 이상 신호가 적습니다. 정기검진 결과를 누적해 변화를 확인하세요.'
  };
}

function groupName(group) {
  return {
    liver: '간기능',
    kidney: '신장·대사',
    lipid: '지질',
    blood: '혈액'
  }[group] || group;
}

function statusClass(status) {
  if (status === '정상') return 'status-normal';
  if (status === '주의') return 'status-caution';
  return 'status-high';
}
