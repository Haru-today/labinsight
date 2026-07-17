# LabInsight

LabInsight는 건강검진 결과 수치를 입력하거나 결과지 이미지를 업로드하면 주요 검사항목을 참고용으로 해석하고, 생활관리 가이드와 병원 예약 접수·관리 흐름을 제공하는 건강검진 예약 시스템 MVP입니다.

## 배포 구조

GitHub Pages에서는 별도 빌드 없이 정적 화면을 실행할 수 있고, 로컬에서는 Node 서버로 예약 API까지 실행할 수 있습니다.

```text
/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── service-worker.js
├── icons/
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── downloads/
│   ├── LabInsight-mac.zip
│   ├── LabInsight-windows.zip
│   ├── mac/
│   │   ├── LabInsight.command
│   │   └── README.txt
│   └── windows/
│       ├── LabInsight.bat
│       └── README.txt
├── server.js
├── README.md
└── data/
    └── bookings.json
```

CSS와 JavaScript는 하위 경로 배포에서도 깨지지 않도록 `./styles.css`, `./app.js` 상대경로로 연결되어 있습니다.
정적으로 열면 예약 데이터는 브라우저 `localStorage`에 저장됩니다. `node server.js`로 실행하면 `/api/bookings` API와 `data/bookings.json` 파일 저장소를 사용합니다.

## 앱 형태 실행

LabInsight는 PWA 구조를 포함합니다. 지원 브라우저에서는 홈 화면 또는 데스크톱 앱으로 설치할 수 있고, 핵심 화면 파일은 서비스워커 캐시에 저장되어 오프라인에서도 앱 화면을 열 수 있습니다.

- `manifest.webmanifest`: 앱 이름, 색상, 아이콘, 바로가기 정의
- `service-worker.js`: 앱 셸 캐시와 오프라인 화면 재사용
- `icons/`: 설치 앱 아이콘 SVG와 PNG
- 모바일 화면 하단에는 입력, 리포트, 예약으로 이동하는 앱형 탭바가 표시됩니다.

## 네이티브 데스크톱 앱

Electron 기반 데스크톱 앱은 별도의 Node.js 설치 없이 자체 예약 서버를 실행합니다. 예약 데이터는 운영체제의 LabInsight 사용자 데이터 폴더에 보관되며 앱 업데이트 후에도 유지됩니다.

```bash
pnpm install
pnpm run desktop
pnpm test
pnpm run dist -- --mac
```

Windows 설치 파일은 Windows 환경에서 `pnpm run dist -- --win`으로 생성합니다. `v1.0.0`처럼 `v`로 시작하는 태그를 GitHub에 푸시하면 `.github/workflows/desktop-release.yml`이 macOS 범용 DMG와 Windows x64 설치 파일을 각각 빌드해 GitHub Release에 첨부합니다.

보안 경고가 없는 정식 배포에는 코드서명이 필요합니다. GitHub Actions에 `CSC_LINK`, `CSC_KEY_PASSWORD`를 등록하면 인증서 서명이 적용됩니다. macOS 공증은 추가로 `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` 또는 App Store Connect API 키 환경변수를 등록하면 자동 수행됩니다.

## iOS / Android 모바일 앱

Capacitor 기반 네이티브 프로젝트가 `ios/`, `android/`에 포함되어 있습니다. 모바일 앱은 다운로드·PWA 설치 영역을 숨기고 iPhone 노치와 Android 시스템 영역을 고려한 안전영역 레이아웃을 사용합니다.

예약 서버 없이 동기화하면 예약은 기기 내부에 저장됩니다.

```bash
pnpm mobile:sync:android
pnpm mobile:sync:ios
```

여러 기기에서 같은 예약 데이터를 사용하려면 HTTPS로 배포한 예약 서버 주소를 지정합니다.

```bash
LABINSIGHT_API_URL="https://api.example.com" pnpm mobile:sync:android
LABINSIGHT_API_URL="https://api.example.com" pnpm mobile:sync:ios
```

- Android: Android Studio와 JDK를 설치한 뒤 `pnpm mobile:android`
- iOS: 전체 Xcode를 설치한 뒤 `pnpm mobile:ios`
- GitHub Actions: `.github/workflows/mobile-build.yml`에서 Android 디버그 APK와 iOS 시뮬레이터 앱을 자동 검증
- GitHub 저장소 변수 `LABINSIGHT_API_URL`을 등록하면 CI 앱에도 운영 API 주소가 반영됩니다.

실기기 배포 및 스토어 출시는 Google Play Console과 Apple Developer 계정, 앱 서명 인증서, 개인정보처리방침이 추가로 필요합니다.

## Mac / Windows 다운로드

홈페이지의 `앱 다운하기` 영역에서 OS별 패키지를 받을 수 있습니다.

- Mac: `downloads/LabInsight-mac.zip`
- Windows: `downloads/LabInsight-windows.zip`

각 압축 파일에는 `LabInsight/` 앱 본체와 OS별 실행 파일이 들어 있습니다. Node.js가 설치된 환경에서는 `server.js`가 실행되어 예약 API와 JSON 저장소를 사용하고, Node.js가 없는 환경에서는 `index.html`을 열어 브라우저 저장 모드로 실행합니다.

macOS에서 `Apple은 LabInsight.command에 악성 코드가 없음을 확인할 수 없습니다` 경고가 뜨면 개발용 패키지가 아직 Apple 공증을 받지 않았기 때문입니다. 압축 해제한 폴더에서 아래 명령을 실행한 뒤 다시 여세요.

```bash
xattr -dr com.apple.quarantine "$HOME/Downloads/LabInsight-mac"
```

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
- 설치 가능한 PWA 앱 셸, 모바일 하단 탭, 오프라인 캐시 상태 표시

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
