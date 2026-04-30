# QApilot-UI

QApilot UI 프로젝트입니다.  
초기 UI 번들은 아래 Figma 기반으로 생성되었습니다.

https://www.figma.com/design/sOPWbDxmpMlkxhTmJoB2uL/QAsys

## 실행 방법

의존성 설치:

```bash
npm i
```

개발 서버 실행:

```bash
npm run dev
```

프로덕션 빌드:

```bash
npm run build
```

## 현재 프론트엔드 구조

기존에는 `src/app/App.tsx`에 대부분의 화면과 mock 데이터가 모여 있었지만, 현재는 페이지 단위로 분리되어 있습니다.  
`App.tsx`는 전역 상태, 좌측/상단 네비게이션, 공통 모달, 챗바, 페이지 라우팅을 중심으로 관리합니다.

```text
src/app/                                      # 앱 UI 소스 루트
├── App.tsx                                  # 전역 상태, 네비게이션, 공통 오버레이, 페이지 라우팅
├── components/                              # 여러 화면에서 재사용하는 컴포넌트
│   ├── ScenarioNetworkGraph.tsx             # 시나리오 화면 중앙 네트워크 그래프
│   └── common/                              # 공통 소형 UI 컴포넌트 모음
│       ├── FourColorBar.tsx                 # PASS/FAIL/HITL/미실행 4색 비율 바
│       ├── PageTitle.tsx                    # 페이지 상단 타이틀 컴포넌트
│       └── StatusIcon.tsx                   # 상태값별 아이콘 렌더링 컴포넌트
├── data/                                    # 임시/mock 데이터 모음
│   └── mockData.ts                          # 페이지 전반에서 사용하는 mock 데이터와 타입
└── pages/                                   # 주요 화면 단위 컴포넌트
    ├── ExecutionHistoryPage.tsx             # 테스트 실행 이력 목록과 PASS/FAIL 상세 화면
    ├── HomePage.tsx                         # 홈 대시보드 화면
    ├── RTMPage.tsx                          # RTM/FR 추적성 화면
    ├── ScenarioPage.tsx                     # 시나리오 목록, 상세, 네트워크 그래프 화면
    ├── SettingsPage.tsx                     # 설정 화면
    ├── TestGroupPage.tsx                    # 시나리오 그룹 관리 및 그룹 실행 화면
    └── TestPage.tsx                         # 테스트 진행중 화면과 실행 이력 탭 호스트
```

## 페이지별 역할

- `HomePage.tsx`: 대시보드 요약, 최근 테스트 이력, 연결 파일, HITL 요약을 보여줍니다.
- `ScenarioPage.tsx`: 시나리오 목록, 변경/보류 항목, 상세 패널, 네트워크 그래프, 시나리오 생성/수정 흐름을 담당합니다.
- `TestGroupPage.tsx`: 시나리오 그룹 목록 관리와 그룹 단위 테스트 실행 화면을 담당합니다.
- `TestPage.tsx`: 진행 중인 테스트 실행 화면을 보여주고, 실행 이력 탭으로 `ExecutionHistoryPage`를 연결합니다.
- `ExecutionHistoryPage.tsx`: 테스트 실행 결과 목록, FAIL/PASS 상세, 재테스트 대상 선택을 담당합니다.
- `RTMPage.tsx`: FR 요구사항별 충족률, 실행 이력, RTM 버전 선택을 담당합니다.
- `SettingsPage.tsx`: Git 연동, 야간 자동 루프, 실행 대상 시나리오 범위, 결과 수신 방법 설정을 담당합니다.

## 공통 컴포넌트와 데이터

- `ScenarioNetworkGraph.tsx`: 시나리오, TC, TV 노드를 네트워크 그래프로 렌더링합니다.
- `FourColorBar.tsx`: 테스트 결과 비율을 4색 막대로 표현합니다.
- `PageTitle.tsx`: 페이지 상단 제목 UI를 통일합니다.
- `StatusIcon.tsx`: 상태값에 따라 성공, 실패, 진행중, 대기 아이콘을 렌더링합니다.
- `mockData.ts`: 현재 UI에서 사용하는 임시 데이터를 한곳에 모아둔 파일입니다.

## 추후 개선 메모

- `ScenarioPage.tsx`와 `TestPage.tsx`에 전달되는 props가 길기 때문에, 이후 `useScenarioPageState`, `useTestExecutionState`, `useChatbarState` 같은 커스텀 훅으로 상태를 묶는 것이 좋습니다.
- `ScenarioPage.tsx` 내부는 사이드바 목록, 상세 패널, 버전 선택기, 테스트 그룹 생성 모달 등으로 한 번 더 컴포넌트 분리할 수 있습니다.
- `App.tsx`에 남아 있는 파일 모달, 재테스트 모달, 시나리오 챗바 같은 전역 오버레이도 별도 컴포넌트로 분리할 수 있습니다.
- 백엔드 연동 시 `mockData.ts`를 API 모듈 또는 상태 관리 레이어로 대체하는 것이 좋습니다.
- Vite 빌드에서 chunk size warning이 계속 발생하므로, 필요 시 페이지 단위 dynamic import로 코드 스플리팅을 적용할 수 있습니다.
