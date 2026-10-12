# LabInsight

LabInsight는 LABDAM(Personal Health Atlas) 통합 포털에서 연결되는 건강검진 결과 서비스입니다. 건강검진 결과 입력, 결과 해석 리포트, 병원·검진 패키지 비교와 샘플 예약을 각각의 독립 페이지로 제공하며 단계별로 이어서 사용할 수 있습니다.

- LABDAM 통합 포털 (Personal Health Atlas): <https://haru-today.github.io/>
- Caffeine Atlas 검사: <https://haru-today.github.io/caffeine-atlas/caffeine-sensitivity-app/analyzer.html>

## 6단계 보안 강화 — 서비스워커·OCR·브라우저 정책 (2026-10-12)

- **서비스워커:** 공개 앱 셸 파일만 사전 캐시하고, 임의의 요청 URL·쿼리 문자열·서드파티 리소스·API 응답은 캐시하지 않습니다. 네트워크 탐색 응답도 런타임 캐시에 저장하지 않습니다. 오프라인에서는 사전 캐시된 공개 HTML만 제공합니다.
- **캐시 분리:** 업데이트 시 `labinsight-app-` 접두사 캐시만 정리하며 같은 GitHub Pages 출처의 LABDAM 또는 Caffeine Atlas 캐시는 건드리지 않습니다.
- **OCR:** 건강정보 입력 페이지에 들어왔다는 이유만으로 CDN의 OCR 코드를 실행하지 않습니다. 이미지 선택 후 **이미지 글자 인식**을 누른 경우에만 정확한 버전 `tesseract.js@5.1.1`을 로드합니다. 외부 스크립트 요청의 리퍼러를 차단하며 실패 시 수동 입력을 이용할 수 있습니다.
- **로컬 Node/Electron 서버:** 클릭재킹 방지, 콘텐츠 스니핑 차단, 불필요한 카메라·마이크·위치 권한 제한 등의 HTTP 응답 헤더를 적용합니다.
- **GitHub Pages:** 서버 보안 헤더는 `server.js`가 실행되는 환경에만 적용됩니다. GitHub Pages 정적 HTML에는 `referrer` 메타 정책을 추가했습니다. 실제 호스팅 플랫폼의 응답 헤더를 임의로 제어했다고 주장하지 않습니다.
- **남은 점검:** CDN에서 전달되는 OCR 라이브러리와 worker·언어 모델의 공급망 위험은 남습니다. 운영 출시 전 SRI 또는 파일 자체 호스팅, CSP와 의존성 감사, 실제 브라우저·모바일 보안 검증이 필요합니다.
- **주의:** 서비스워커 캐시는 의료정보 입력 화면의 **정적 HTML**을 사전 저장하지만, 실제 검사 수치나 동적으로 생성된 리포트 내용은 캐시하지 않습니다. 결과값은 별도의 `sessionStorage`에 보관되며 사용자가 직접 삭제해야 합니다.

## 2026-10-12 보안 개편 — 예약 기능은 개인정보 없는 체험만 제공

**중요:** LabInsight 예약 흐름은 실제 병원 예약 기능이 아니라 **브라우저 탭 내부의 기능 데모**입니다.

- 성명·연락처·생년월일·상담 목적 입력란을 제거했습니다. 검사 패키지, 샘플 센터, 날짜·시간 및 데모 상태만 저장합니다.
- 데모 정보는 해당 탭의 `sessionStorage`에만 저장됩니다. 탭/브라우저 세션 복원 환경에서는 남아 있을 수 있어 **샘플 내역 삭제** 버튼을 추가했습니다.
- 기존 `localStorage`에 있던 `labinsight-bookings` 항목은 페이지 시작 시 삭제하며, 개인정보를 새 데모 저장소로 이전하지 않습니다.
- 미인증 개인 예약 목록 노출 위험이 있던 서버의 `GET/POST/PATCH /api/bookings` 기능을 폐지하고 **HTTP 410 Gone**으로 응답합니다. 실시간 예약 가능 시간과 병원 접수는 지원하지 않습니다.
- Node/Electron HTTP 서버는 공개 HTML·JS·CSS·앱 에셋을 허용 목록으로 제공하고 `data/`, `server.js`, 환경변수 파일 및 테스트 파일을 외부에서 읽지 못하도록 제한합니다.
- 공개 GitHub 저장소에서 빈 `data/bookings.json`을 제거하고 로컬 `data/` 디렉터리를 `.gitignore` 처리했습니다.
- **주의:** 이전에 로컬 서버·데스크톱 앱에 저장된 `bookings.json`의 실제 예약 개인정보는 코드 업데이트만으로 삭제되지 않습니다. 로컬 서버의 `LABINSIGHT_DATA_DIR` 및 Electron 운영체제별 사용자 데이터 폴더에서 남아 있는 예약 파일을 직접 확인하고 안전하게 삭제해야 합니다. 실제 개인정보가 있었는지는 이 저장소 검사만으로 확인할 수 없습니다.
- 오래된 설치 앱이나 이미 배포된 다운로드 패키지는 이전 코드가 남아 있을 수 있습니다. 새로운 네이티브 설치 패키지 제작·교체, 브라우저별 저장 정보 및 모바일 보안 검증은 별도 배포 절차가 필요합니다.

## 배포 구조

GitHub Pages에서는 별도 빌드 없이 정적 화면을 실행합니다. 로컬 Node 서버는 정적 에셋 제공에만 사용하며 개인 예약 API는 폐지했습니다.

```text
/
├── index.html              # 서비스 홈
├── checkup.html            # STEP 1 결과 입력
├── report.html             # STEP 2 결과 리포트
├── hospitals.html          # STEP 3 병원·패키지 비교/예약
├── hospital-data.js        # 공식 공개 병원·검진 패키지 데이터
├── styles.css
├── app.js
├── manifest.webmanifest
├── service-worker.js
├── icons/
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── downloads/
│   ├── mac/
│   │   ├── LabInsight.command
│   │   └── README.txt
│   └── windows/
│       ├── LabInsight.bat
│       └── README.txt
├── server.js
└── README.md
```

CSS와 JavaScript는 하위 경로 배포에서도 깨지지 않도록 `./styles.css`, `./app.js` 상대경로로 연결되어 있습니다.
데모 예약 기록은 현재 브라우저 탭의 `sessionStorage`에서만 관리하며 실제 병원으로 전송되지 않습니다. `node server.js` 실행 시 예약 관련 API는 HTTP 410으로 차단됩니다.

## 앱 형태 실행

LabInsight는 PWA 구조를 포함합니다. 지원 브라우저에서는 홈 화면 또는 데스크톱 앱으로 설치할 수 있고, 핵심 화면 파일은 서비스워커 캐시에 저장되어 오프라인에서도 앱 화면을 열 수 있습니다.

- `manifest.webmanifest`: 앱 이름, 색상, 아이콘, 바로가기 정의
- `service-worker.js`: 앱 셸 캐시와 오프라인 화면 재사용
- `icons/`: 설치 앱 아이콘 SVG와 PNG
- 모바일 화면 하단에는 입력, 리포트, 예약으로 이동하는 앱형 탭바가 표시됩니다.

## 네이티브 데스크톱 앱

Electron 기반 데스크톱 앱은 별도의 Node.js 설치 없이 로컬 정적 웹서버를 실행합니다. 예약 데모는 현재 탭의 임시 저장소만 사용합니다. 이전 버전의 사용자 데이터 폴더에 있던 예약 개인정보는 자동으로 삭제되지 않으므로 별도 점검이 필요합니다.

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

예약 흐름은 서버와 동기화되지 않는 로컬 데모입니다. 실사용자 예약을 받거나 저장하지 마세요.

```bash
pnpm mobile:sync:android
pnpm mobile:sync:ios
```

다음 설정은 이전 버전의 API URL 옵션 예시로, 현재 폐지된 예약 API를 활성화하지 않습니다. 개인정보 처리 시스템의 정식 구축 전까지 예약 서버 연결을 시도하지 마세요.

```bash
LABINSIGHT_API_URL="https://api.example.com" pnpm mobile:sync:android
LABINSIGHT_API_URL="https://api.example.com" pnpm mobile:sync:ios
```

- Android: Android Studio와 JDK를 설치한 뒤 `pnpm mobile:android`
- iOS: 전체 Xcode를 설치한 뒤 `pnpm mobile:ios`
- GitHub Actions: `.github/workflows/mobile-build.yml`에서 Android 디버그 APK와 iOS 시뮬레이터 앱을 자동 검증
- GitHub 저장소 변수 `LABINSIGHT_API_URL`을 등록하면 CI 앱에도 운영 API 주소가 반영됩니다.

실기기 배포 및 스토어 출시는 Google Play Console과 Apple Developer 계정, 앱 서명 인증서, 개인정보처리방침이 추가로 필요합니다.

## Mac / Windows 다운로드 (임시 중단)

- 구형 Mac·Windows용 ZIP은 2026-10-12 개인정보 보호 개편보다 이전 코드가 포함되었을 수 있어 공개 다운로드에서 제외했습니다.
- Git 이력에는 변경 전 코드가 남아 있으나 안전한 최신 설치 파일로 재빌드되기 전에는 이전 패키지를 설치하거나 배포하지 않는 것을 권장합니다.
- 데스크톱 설치본과 기존 사용자의 개인 데이터 파일에 대해서는 추가 보안 검증, 서명·공증, 마이그레이션 또는 삭제 절차가 필요합니다.
- 최신 웹 버전은 https://haru-today.github.io/labinsight/ 에서 이용할 수 있습니다.


## OCR 검사결과지 인식 — 검토 후 입력 (2026-10-12)

OCR은 **글자 인식 보조 기능**이며 검사 수치를 자동 판정하거나 원본 검사를 대체하지 않습니다.

1. 건강검진 결과지 이미지에서 이름·생년월일·환자번호 등 불필요한 정보를 미리 가립니다.
2. `checkup.html`의 **검사결과지 이미지 인식**을 열어 JPG/PNG/WEBP/BMP 파일(8MB 이하)을 선택합니다.
3. **이미지 글자 인식** 후 OCR 원문 텍스트를 확인합니다. 텍스트만 붙여넣은 경우 **검사 후보 분석**을 누릅니다.
4. 각 항목의 원문·값·단위가 일치하는지 원본 결과지와 비교하고 **확인한 항목만 체크**합니다. 후보값을 직접 수정할 수 있습니다.
5. **확인한 항목만 입력 폼에 반영**을 눌러 수동으로 적용합니다. 중복 인식과 단위 불일치 항목은 자동 적용할 수 없고, 기존 수동 입력값을 덮어쓰지 않습니다.
6. 리포트 생성 전에 모든 항목을 다시 확인합니다. **OCR 내용 지우기**는 이미지와 추출 텍스트만 초기화하며 이미 입력한 검사값은 별도로 초기화해야 합니다.

- Tesseract.js는 외부 CDN에서 JavaScript 및 언어 데이터를 받아 브라우저에서 인식 작업을 수행하도록 구현했습니다. 해당 파일은 LabInsight 예약 API로 업로드하지 않습니다.
- OCR 문서·추출 텍스트·검토 후보를 별도 서버나 브라우저 저장소에 저장하는 코드는 두지 않았지만, **검증 후 실제 결과 폼에 반영된 검사값은 기존 서비스 정책에 따라 브라우저 localStorage에 저장될 수 있습니다.** 공용 기기를 피하고 개인정보를 가리세요.
- PDF 문서, HEIC 원본, 스캔 표의 여러 항목이 한 행에 있는 경우는 이 버전에서 지원하지 않거나 자동 추출이 생략될 수 있습니다. **수동 입력이 기본 대안**입니다.
- 검사기관별 혈구 수치의 /µL vs ×10³/µL 등 단위가 다르면 자동 변환하지 않습니다. 단위를 검토한 뒤 직접 입력해야 합니다.

## 검사기관 참고범위 및 결과 해석 (2026-10-12)

- **검사기관 참고범위 직접 입력(선택)** 영역에 검사결과지에 표시된 항목별 하한·상한을 입력할 수 있습니다. 검사값과 동일한 단위를 사용해야 하며, 한쪽만 입력하거나 하한 > 상한이면 리포트 제출이 차단됩니다.
- 입력한 검사기관 참고범위는 **사용자 제공 정보**로 분류하며, 측정값이 범위 안/밖에 있는지 단순 비교합니다. 사용자가 입력한 참고치가 의학적으로 적절한 범위라는 보증은 아닙니다.
- 검사기관 범위가 없으면 **일반 예시 기준** 또는 **개별 참고치 확인 필요**로 표시합니다. 특히 eGFR, 크레아티닌, 혈색소, γ-GTP, 요산, HDL 등은 단일 고정 성인 범위로 상태를 확정하지 않습니다. 연령이 없거나 18세 미만인 경우에도 성인 기준을 적용하지 않습니다.
- 리포트에는 검사값, 적용 기준 및 출처 종류(검사지 직접 입력/일반 예시), 상태, 설명/의학적 근거 페이지 링크를 구분합니다.
- 임상적 타당성이 확인되지 않은 **숫자형 위험 지수**는 사용자에게 표시하지 않습니다. 검사값 부족 또는 개인별 참고치 미확인 시 전체 정상 판정도 표시하지 않습니다.
- 기존 생활수칙 및 패키지 추천은 **일반적인 정보성 안내**로 유지되며 개별 환자의 진단·치료·검사 우선순위를 결정하는 기능이 아닙니다.
- 검사값과 직접 입력한 참고치는 기존 리포트 데이터와 함께 브라우저 로컬 저장소에 저장됩니다. 공유 컴퓨터에서는 사용을 피하고 원본 개인정보가 공개되지 않도록 주의하세요.

**해석 근거:** [MedlinePlus](https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/) · [CDC](https://www.cdc.gov/diabetes/diabetes-testing/) · [NIDDK](https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/identify-manage-patients/evaluate-ckd).

## 리포트 인쇄 및 개인정보 정리 (2026-10-12)

- 결과 리포트 상단의 **인쇄 · PDF 저장**을 누르면 브라우저 인쇄 대화상자가 열립니다. PDF로 저장할 때는 운영체제/브라우저의 **PDF로 저장** 기능을 선택합니다. 서버에서 PDF를 만들거나 보내지 않습니다.
- 개인용 출력에는 항목별 검사지 참고범위·비교 상태·해석 근거가 포함되며, 병원 패키지 홍보와 사이트 이동 메뉴 등은 출력에서 제외됩니다. A4 기준 인쇄 스타일을 제공합니다.
- 리포트는 기존의 오래 보관되는 `localStorage` 대신 **`sessionStorage`에 임시 저장**합니다. 동일 탭에서 검사값 입력 → 리포트 이동이 가능하며, 이전 버전에 저장된 결과는 읽을 때 한 번 `sessionStorage`로 옮기고 `localStorage` 원본을 삭제합니다.
- **이 탭의 검사 결과 삭제** 버튼은 확인 후 현재 임시 리포트와 남아 있을 수 있는 구버전 저장 항목을 지웁니다. 검사결과 입력 화면의 **초기화**도 두 저장소의 검사결과를 삭제합니다.
- `sessionStorage`라도 브라우저가 세션을 복원하거나 같은 기기를 공유하면 접근될 수 있습니다. 공유 기기에서는 사용을 피하고 명시적으로 삭제해주세요. PDF 저장 파일, 스크린샷, 인쇄물은 별도로 관리·삭제해야 합니다.
- 검색엔진용 `noindex`는 결과 입력/리포트 페이지에만 적용되며, **접근 제어나 개인정보 보호 장치는 아닙니다.** 공개 GitHub 저장소에 검사결과나 환자 개인정보를 커밋하지 마세요.

## 주요 기능

- 건강검진 수치 직접 입력
- STEP 1·2·3 독립 페이지 이동 및 검사 결과 탭별 임시 저장·삭제
- 샘플 데이터 불러오기
- 접이식 검사 카테고리와 BMI 자동 계산
- 혈압, BMI 기반 생활관리 및 검진 추천 보강
- Tesseract.js CDN 기반 OCR 이미지 업로드 데모
- AST, ALT, γ-GTP, 공복혈당, HbA1c, 지질, 신장, 요산, 혈액 항목 판정
- 검사기관 참고범위 입력 및 검사 항목별 결과 비교(일반 예시와 실제 검사지 참고치 구별)
- 결과 기반 추천 건강검진 카드 생성
- 생활관리, 운동, 식습관, 권장 검사, 의료진 상담 질문 제공
- 추천 검진에서 병원 비교 페이지의 검진·진료과 필터 자동 연결
- 공식 홈페이지에서 가격을 공개한 4개 기관의 78개 검진·선택검사 비교
- 병원별 출처, 정보 확인일, 가격 기준과 공식 문의 링크 표시
- 지역·진료분야·검진·가격·검색 필터와 추천/가격/패키지 수/병원명 정렬
- 최대 3개 병원·패키지 비교표
- 실제 병원 정보 조회와 LabInsight 샘플 예약 흐름 분리
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
- 병원·패키지·가격은 각 기관 공식 홈페이지의 공개정보를 2026-07-29에 확인해 정리했습니다. 구성과 가격은 변경될 수 있으므로 신청 전 공식 페이지에서 다시 확인해야 합니다.
- 예약 저장 기능은 LabInsight 흐름 확인용 샘플이며 실제 병원으로 전송되지 않습니다. 실제 예약 연동, SMS 발송, 결제, EMR/CRM 연동은 별도 외부 API 계약과 보안 검토가 필요합니다.
- 본 서비스의 의료 정보는 참고용이며 진단, 치료, 처방을 대신하지 않습니다.
\n## LABDAM 사이트 구조 (2026-10-13)\n\n- LABDAM = Personal Health Atlas 통합 포털: <https://haru-today.github.io/>\n- LabInsight 서비스: <https://haru-today.github.io/labinsight/>\n- Caffeine Atlas 서비스: <https://haru-today.github.io/caffeine-atlas/>\n- Caffeine Atlas 내부 검사·리포트는 Caffeine Atlas 사이트의 하위 경로로 유지합니다. 별도의 네 번째 포털은 없습니다.\n
## 8단계 개인정보·이용 안내 연결 (2026-10-13)
- LABDAM 공통 개인정보 처리 안내: <https://haru-today.github.io/privacy.html>
- LABDAM 공통 서비스 이용 안내: <https://haru-today.github.io/terms.html>
- LabInsight는 리포트·검사기관 참고범위를 브라우저 세션에 보관하고 사용자의 삭제 버튼을 제공합니다. 서버의 예약 API는 종료한 상태입니다.
- 개인정보처리방침의 운영자 신원·보호책임자·비공개 권리 행사 창구와 타 서비스의 Google Sheets 보관 정책 등은 실제 운영자 확인 및 별도 법률 검토가 필요합니다.

## 9단계 — 의학적 근거가 불충분한 일반 참고치 축소 (2026-10-13)

- 사용자가 **원본 검사결과지의 참고범위**를 정확한 단위로 입력한 경우에만 개별 검사지 기준의 범위 안/밖 단순 비교를 수행합니다. 입력한 참고범위 자체의 유효성을 인증하지 않습니다.
- 검사기관 참고범위가 없다면 AST·ALT·지질·CBC 등에는 보편적인 성인 임상 정상 판정을 적용하지 않습니다. 검사방법·성별·연령·검체 조건에 따라 달라질 수 있어 **검사기관 참고치 필요**로 표시합니다.
- 공복혈당·HbA1c의 성인 선별 구간은 [CDC](https://www.cdc.gov/diabetes/diabetes-testing/) 근거에 따라 *참고 정보로만* 제공하며 개인의 진단·확진·안전 판정이 아닙니다. 특히 공복혈당은 실제 금식 여부와 임신 여부 등을 확인해야 하며 HbA1c는 빈혈·수혈·임신 등의 영향을 받을 수 있습니다.
- eGFR는 단일 검사로 만성콩팥병을 진단할 수 없으며, [NIDDK](https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/identify-manage-patients/evaluate-ckd)에 따라 지속성·소변 알부민 등의 맥락이 필요합니다.
- 예약 데모의 가상 센터에 실제 주소와 검증되지 않은 평점·후기를 표시하지 않도록 수정했습니다. 샘플 요금과 예약시간은 실제 병원의 가격·재고·예약 가능 여부가 아닙니다.
- **남은 개선**: 특정 검사항목으로 검진 패키지를 추천하는 기존 휴리스틱과 병원 가격·프로그램 정보는 별도 임상·출처 검토가 필요하며 확정적인 개인 추천으로 쓰면 안 됩니다.

