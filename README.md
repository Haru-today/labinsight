# LabInsight

LabInsight는 건강검진 결과 수치를 입력하거나 결과지 이미지를 업로드하면 주요 검사항목을 참고용으로 해석하고, 생활관리 가이드와 병원 예약 데모 흐름을 보여주는 GitHub Pages용 정적 웹사이트 MVP입니다.

## 배포 구조

GitHub Pages에서 별도 빌드 없이 바로 실행되도록 루트에 아래 파일만 둡니다.

```text
/
├── index.html
├── styles.css
├── app.js
└── README.md
```

CSS와 JavaScript는 하위 경로 배포에서도 깨지지 않도록 `./styles.css`, `./app.js` 상대경로로 연결되어 있습니다.

## 주요 기능

- 건강검진 수치 직접 입력
- 샘플 데이터 불러오기
- Tesseract.js CDN 기반 OCR 이미지 업로드 데모
- AST, ALT, γ-GTP, 공복혈당, HbA1c, 지질, 신장, 요산, 혈액 항목 판정
- 건강관리 위험도 점수와 등급 생성
- 결과 기반 추천 건강검진 카드 생성
- 생활관리, 운동, 식습관, 권장 검사, 의료진 상담 질문 제공
- 추천 검진에서 mock 병원 데이터 필터 자동 연결
- 예약 모달과 localStorage 기반 예약 내역 저장

## GitHub Pages 배포 방법

1. `index.html`, `styles.css`, `app.js`, `README.md`를 저장소 루트에 커밋합니다.
2. GitHub 저장소의 `Settings > Pages`로 이동합니다.
3. `Build and deployment`에서 `Deploy from a branch`를 선택합니다.
4. Branch를 `main`, folder를 `/ (root)`로 선택합니다.
5. 배포 후 `https://haru-today.github.io/labinsight/`에서 확인합니다.

## 로컬 확인

정적 파일이라 `index.html`을 브라우저로 열어도 동작합니다. OCR CDN 로딩과 GitHub Pages 경로까지 확인하려면 간단한 로컬 서버 사용을 권장합니다.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`으로 접속합니다.

## 주의 사항

- 실제 OCR 품질은 이미지 해상도, 기울기, 표 형태에 따라 달라질 수 있습니다.
- OCR이 실패해도 수동 입력과 리포트 생성 기능은 계속 사용할 수 있습니다.
- 예약 기능은 실제 병원 예약이 아닌 mock data와 localStorage 기반 데모입니다.
- 본 서비스의 의료 정보는 참고용이며 진단, 치료, 처방을 대신하지 않습니다.
