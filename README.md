# LabInsight

LabInsight는 건강검진 결과 수치를 입력하거나 결과지 이미지를 업로드하면 주요 검사항목을 참고용으로 해석하고, 생활관리 가이드와 병원 예약 접수·관리 흐름을 제공하는 건강검진 예약 시스템 MVP입니다.

## 배포 구조

GitHub Pages에서는 별도 빌드 없이 정적 화면을 실행할 수 있고, 로컬에서는 Node 서버로 예약 API까지 실행할 수 있습니다.

```text
/
├── index.html
├── styles.css
├── app.js
├── server.js
├── README.md
└── data/
    └── bookings.json
```

CSS와 JavaScript는 하위 경로 배포에서도 깨지지 않도록 `./styles.css`, `./app.js` 상대경로로 연결되어 있습니다.
정적으로 열면 예약 데이터는 브라우저 `localStorage`에 저장됩니다. `node server.js`로 실행하면 `/api/bookings` API와 `data/bookings.json` 파일 저장소를 사용합니다.

## 주요 기능

- 건강검진 수치 직접 입력
- 샘플 데이터 불러오기
- 접이식 검사 카테고리와 BMI 자동 계산
- 혈압, BMI 기반 생활관리 및 검진 추천 보강
- Tesseract.js CDN 기반 OCR 이미지 업로드 데모
- AST, ALT, γ-GTP, 공복혈당, HbA1c, 지질, 신장, 요산, 혈액 항목 판정
- 건강관리 위험도 점수와 등급 생성
- 결과 기반 추천 건강검진 카드 생성
- 생활관리, 운동, 식습관, 권장 검사, 의료진 상담 질문 제공
- 추천 검진에서 병원 필터 자동 연결
- 병원별 예약 가능 시간표와 잔여 슬롯 표시
- 예약번호 생성, 중복 시간 예약 차단, 예약 상태 변경
- 예약 관리 목록과 CSV 내보내기
- Node 서버 실행 시 JSON 파일 기반 예약 API 저장

## GitHub Pages 배포 방법

1. `index.html`, `styles.css`, `app.js`, `README.md`를 저장소 루트에 커밋합니다.
2. GitHub 저장소의 `Settings > Pages`로 이동합니다.
3. `Build and deployment`에서 `Deploy from a branch`를 선택합니다.
4. Branch를 `main`, folder를 `/ (root)`로 선택합니다.
5. 배포 후 `https://haru-today.github.io/labinsight/`에서 확인합니다.

## 로컬 확인

정적 파일이라 `index.html`을 브라우저로 열어도 동작합니다. 실제 예약 API 저장까지 확인하려면 Node 서버 실행을 권장합니다.

```bash
node server.js
```

브라우저에서 `http://localhost:8000`으로 접속합니다.

API 상태 확인:

```bash
curl http://localhost:8000/api/health
```

예약 목록 확인:

```bash
curl http://localhost:8000/api/bookings
```

## 주의 사항

- 실제 OCR 품질은 이미지 해상도, 기울기, 표 형태에 따라 달라질 수 있습니다.
- OCR이 실패해도 수동 입력과 리포트 생성 기능은 계속 사용할 수 있습니다.
- 이 저장소의 병원 목록은 샘플 데이터입니다. 실제 병원 연동, SMS 발송, 결제, EMR/CRM 연동은 별도 외부 API 계약과 보안 검토가 필요합니다.
- 본 서비스의 의료 정보는 참고용이며 진단, 치료, 처방을 대신하지 않습니다.
