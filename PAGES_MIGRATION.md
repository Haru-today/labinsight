# LabInsight 공개 GitHub Pages 분리 절차

## 이유

GitHub Pages는 정적 호스팅이므로 Google OAuth와 D1 회원 승인 상태를 서버에서 검사할 수 없습니다. **루트 소스의 기존 `checkup.html` / `report.html`을 그대로 Pages에 배포하면 보호된 Worker가 정상이어도 우회 접근이 가능합니다.** JavaScript 리디렉션만으로는 보안 경계를 만들 수 없습니다.

이 PR에서 `docs/`는 로그인 안내와 보호된 Worker로 이어지는 정적 링크만 포함합니다. 원본 앱 소스와 Node/Electron/Capacitor 코드는 루트에 남아 있고, 실제 승인제 LabInsight는 아래 Worker에서 제공됩니다.

- 로그인 필요한 서비스: https://labdam-free-approval.jleegenomics.workers.dev/labinsight/
- 공개 레거시 주소: https://haru-today.github.io/labinsight/
- 공개 Caffeine Atlas: https://haru-today.github.io/caffeine-atlas/

## 사용자가 **한 번** 설정해야 할 항목

1. 이 변경이 LabInsight `main`에 병합되고 통과한 뒤, [LabInsight Pages 설정](https://github.com/Haru-today/labinsight/settings/pages)에서 **Build and deployment**로 이동합니다.
2. **Source: Deploy from a branch**, **Branch: main**, **Folder: /docs**를 선택하고 **Save**를 누릅니다.
3. GitHub Pages 배포가 완료된 뒤 기존 `/labinsight/`, `/labinsight/checkup.html`, `/labinsight/report.html`, `/labinsight/hospitals.html`, `/labinsight/app.js`를 시크릿 없는 새 시크릿 창에서 각각 검사합니다.
4. `*.html`은 로그인 안내만 표시한 뒤 Worker로 이동해야 하고, `app.js` 및 검사 앱 내부 JS/CSS는 더 이상 공개 Pages에서 HTTP 200으로 제공되면 안 됩니다. 예상치 못한 파일이 200으로 남아 있으면 배포 설정을 재확인하고 운영 완료로 표시하지 마세요.
5. 기존 방문자는 브라우저 서비스워커가 이전 앱 셸을 캐시했을 수 있습니다. 새 `service-worker.js`가 이전 `labinsight-app-` 캐시를 삭제하도록 설계돼 있으나 사용자 브라우저 업데이트/오프라인 상태에 따라 전환 시점은 달라집니다. **기존 사용자 입력값은 새 Workers 도메인으로 자동 이전되지 않습니다.**
6. 추가로 Google 계정 2개로 관리자 가입→일반 가입 대기→승인→철회 테스트를 진행합니다. 이 과정에서 실제 건강검진 자료를 사용하지 마세요.

## 보안·배포 범위

- 이 변경은 GitHub Pages가 배포하는 정적 콘텐츠만 분리합니다. GitHub 공개 저장소의 과거 앱 소스나 이미 설치된 오프라인 앱을 비공개로 만들지는 않습니다.
- Pages Source가 **`main /docs`로 실제 전환되기 전에는 기존 공개 서비스가 계속 작동**합니다. 이 PR 병합만으로 완료를 주장하지 않습니다.
- LABDAM 루트 포털의 공개 브랜드 페이지와 Caffeine Atlas 공개 QR 주소는 별도로 유지합니다.
- Workers 배포 workflow는 검토된 LabInsight 커밋을 핀 고정해 이용하므로, 이 변경으로 현재 승인제 Worker가 다시 배포되지는 않습니다.
