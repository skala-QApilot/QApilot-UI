Create a React-based interactive dashboard prototype for an AI-powered QA automation service. 

## Design System
- Base background: white (#ffffff)
- Accent gradient (use sparingly for buttons, badges, highlights, active states only):
  linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%)
- Primary text: #1a1a2e
- Secondary text: #6b7280
- Border/divider: #f0f0f0
- Card background: #ffffff with subtle box-shadow
- Success: #10b981, Error: #ef4444, Warning: #f59e0b, Neutral: #9ca3af
- Font: Inter or system-ui
- Overall tone: clean, minimal, professional. Gradient used only as accent — not as background.

## Global Layout
- Top navigation bar (white): 
  - Left: service logo + step tabs [HOME / 시나리오 / 테스트 / 결과 / 설정]
  - Right: bell icon (notification badge) + chatbot floating button (bottom-right)
- Notification bell: shows unread count badge with gradient color. Clicking opens dropdown list of notifications (test complete, HITL request, scenario generated, file version changed, overnight result, etc.)

## Page 1 — HOME Dashboard
Three summary cards at top:
- 요구사항 반영률 (e.g. 87%) → clicking navigates to RTM matrix in 시나리오 page
- RTM 건수 (e.g. 42건) → same navigation
- 에러 건수 (e.g. 7건, red accent) → navigates to Error tab in 결과 page

Left panel — HISTORY:
- List of past test runs (TEST #1, #2, #3...)
- Each item has a horizontal progress bar: green(pass) / red(fail) / gray(not run) proportions
- Clicking red portion of bar navigates to that run's error case list

Right panel split into two sections vertically:

Upper — FILES:
- List of uploaded domain files: PRD v1.0 / 인터페이스 정의서 v1.1 / WBS v1.0
- Each file row has:
  - File name + version tag
  - An [업데이트 +] button next to each existing file (for uploading new version — LLM detects diff and auto-triggers scenario update)
  - A global [+ 파일 추가] button at top-right of panel
  - Domain file reflection tag on each file: e.g. [시나리오 반영됨] in green or [미반영] in gray/red
- On new version upload: trigger notification + scenario auto-update flow

Lower — HITL 처리:
- Pending HITL request list (from AI low-confidence decisions)
- Each item: description of judgment point + [승인] [거절] [수정 후 승인] buttons (gradient accent on 승인)
- Connected to notification bell

## Page 2 — 시나리오
Initial state (no scenarios yet):
- Center of page: large trigger button "시나리오 최초 생성" with gradient accent
- Subtitle: "코드베이스 / 도메인 파일 / GitHub 이력을 기반으로 자동 생성합니다"

After generation — split layout:
Left sidebar:
- Scenario list: TS1, TS2, TS3...
- Active scenario highlighted with gradient left border

Right main area:
- Top: FR-XXX ↔ TS mapping result display (requirements from spec mapped to test scenarios)
- Top-right: [연관 파일 보기] button → opens popup showing linked PRD/policy files
- RTM matrix table below: columns = FR-ID / 요구사항 내용 / TS / TC / 결과
  - Uncovered requirements highlighted in red/orange
  - [CSV 내보내기] button at top-right of table

TC tree structure:
- Expandable tree: TS > TC#1 > TV#1~TV#4, TC#2 > TV#1~TV#4
- Each TC row: [+ 추가] [삭제] drag handle for reorder
- Natural language scenario creation/edit: chatbot only

## Page 3 — 테스트
Left sidebar:
- Scenario list with checkboxes (for selective execution)
- Status icon per scenario: 실행중 (spinner) / 완료 (green check) / 실패 (red X) / 대기 (gray)
- Bottom of sidebar:
  - Execution control buttons: [▶ 실행] [■ 중단]
  - Mode toggle: [Headed] [Headless]

Center — Test Runtime Panel:
- Shows Playwright actions + code sequentially
- Current executing action is highlighted
- Side-by-side: left = UI action/code, right = backend API log (method, endpoint, status, response time)
- On error: HITL flag appears inline, test continues

Right — Test UI Panel:
- Live browser view (Playwright controlled screen)
- Real-time screenshot updates

## Page 4 — 결과
Top tabs with count badges:
[요구사항 변경문서] [Error 케이스 (7)] [PASS 케이스 (23)]
Tabs use gradient underline for active state

Left sidebar:
- Scenario result list with status icons

Center — REPORT:
- 장애 분류 (UI오류 / API오류 / 데이터불일치 / 환경문제)
- 세부사항 및 상세 내용
- Cross-check 비교 테이블: UI 노출값 vs API 응답값, mismatches highlighted in red
- 원인 분석
- 해결 방안 후보 1 / 2 / 3 (ranked list)

Right panel:
- UI screenshot capture
- Runtime Error log

Bottom:
- [PDF 내보내기] [CSV 내보내기] [TEST 재실행] buttons (gradient on primary action)

## Page 5 — 설정
Clean form layout:
- Git 연동: GitHub Repository URL input + API Key input (masked)
- 야간 자동 루프: time picker for start time, repeat interval selector
- 실행 대상 시나리오 범위: multi-select checklist of TS list
- 결과 수신 방법: toggle options (알림 / 이메일) + email input field
- [저장] button with gradient

## Global Chatbot (Floating)
- Bottom-right floating button with gradient background + chat icon
- Badge shows unread count
- On open: chat panel slides up
- Shows context-aware action chip buttons dynamically:
  - Default: [시나리오 생성] [테스트 실행] [결과 보기] [리포트 내보내기]
  - After scenario generation: [시나리오에 추가] [기존 시나리오에 수정 반영] [다시 생성]
  - On HITL request: [승인] [거절] [수정 후 승인]
  - After test complete: [결과 화면으로 이동] [PDF 내보내기] [CSV 내보내기] [재실행]
  - On error detected: [원인 분석 보기] [해결 방안 보기] [관련 케이스 보기]
- Supports both natural language input and button-click-only interaction
- All service actions available: page navigation, test execution, scenario creation, report export, HITL handling, file registration

## Implementation Notes
- Use React with useState for page/tab navigation
- Show all 5 pages navigable via top nav tabs
- Use realistic mock data throughout
- All interactions should be functional (tab switching, button clicks, sidebar selection, progress bars, checkboxes)
- Keep all code in a single JSX file
- No external dependencies beyond what's available (recharts, lucide-react, tailwind core)