// About page data. Facts only — source: ~/move/resume (verified items; see
// 직무별_이력_설계_2026/00_사실관계_검증목록.md before adding numbers or dates).

export type Row = { when: string; title: string; detail: string; href?: string };

// Hero numbers; post and project counts are appended by AboutHero.
export const STATS = [
	{ value: 3, unit: "건", label: "특허 출원" },
	{ value: 2, unit: "회", label: "학회 구두발표" },
];

export const STACK = [
	"Claude Code", "Codex", "LLM Agents", "RAG", "LLM-as-judge", "pgvector",
	"TypeScript", "Next.js", "React Native", "Go", "Python", "PyTorch",
	"Java Spring", "Bash", "tmux", "Docker", "YOLO", "Grounding DINO",
];

// The AX work at the most recent job: discover, build, teach, hand over.
export const AX = {
	context: "개발자가 저 혼자인 약 30명 규모 회사에서 1년 동안 AI 전환을 맡았습니다. 현업 인터뷰로 자동화할 업무를 찾고, 시스템을 만들고, 직원 교육과 이관까지 했어요.",
	cards: [
		{
			big: "2~3시간 → 10분",
			title: "안전관리 법령 RAG",
			body: "중대재해처벌법·산업안전보건법·화학물질관리법을 국가법령정보센터 API로 3일 주기 수집하고, 조문 근거를 붙여 문서 초안을 만듭니다.",
			stage: "발굴 · 구축",
			note: "시간은 안전관리자 피드백 기준",
		},
		{
			big: "30명",
			title: "사내 AI 교육",
			stage: "교육",
			body: "전체 강의 2회와 90분짜리 1:1 예약 세션. 각자 업무를 인터뷰해 자동화할 수 있는 부분을 같이 찾았습니다.",
		},
		{
			big: "2명",
			title: "유지보수 이관",
			stage: "이관",
			body: "CLAUDE.md 같은 AI 코딩 도구용 컨텍스트를 설계해 배포하고 사용법을 강의. 개발자 없이 안전관리 담당자 2명이 시스템을 유지보수합니다.",
		},
	],
};

export const CAREER: Row[] = [
	{ when: "2025.09 – 2026.09", title: "폐수처리 분야 회사", detail: "유일한 개발자 · AI 전환 담당" },
	{ when: "2025.04 – 2025.07", title: "KITECH 제조AI연구센터", detail: "반도체 CMP 결함 탐지 (YOLO, Grounding DINO)" },
	{ when: "2023.09 – 2023.12", title: "모밋", detail: "Frontend Engineer" },
	{ when: "2021 – 2024", title: "프리랜서", detail: "React Native·Next.js 앱과 웹 외주 개발" },
	{ when: "2019 – 2020", title: "공군 체계관리병", detail: "인트라넷 개발, 리눅스 운영" },
	{ when: "학력", title: "동서대학교", detail: "소프트웨어학과 · AI공학 복수전공" },
];

export const TALKS: Row[] = [
	{ when: "2026.07", title: "현대엔지비·삼우이머션·제주대학교 VE·AI 교육과정", detail: "완성차 제조 부문 임직원 대상 LLM 활용 업무 자동화 (7시간)" },
	{ when: "2022 – 2024", title: "코더랜드", detail: "온라인 프로그래밍 튜터" },
];

export const RESEARCH: Row[] = [
	{ when: "KIIS 2023", title: "Latent Diffusion-based neural decoding system for cognitive simulation", detail: "구두발표 · EEG로 이미지 재구성", href: "https://github.com/DevMinGeonPark/EEG2SDiff" },
	{ when: "CISC-W 2024", title: "RoIFuzz: ROS IDL Fuzzer with Enhanced Robot Security Policy", detail: "구두발표 · 로봇 SW 퍼징", href: "https://github.com/DevMinGeonPark/RoIFuzz" },
	{ when: "특허 출원", title: "직무경험 큐레이팅 시스템 외 2건", detail: "로봇 SW 테스트 시스템 · 블루투스 이동장치 보안 취약점 분석 (2023–2024)" },
];

export const PROJECTS = [
	{ name: "amux", lang: "Shell", desc: "에이전트를 아는 tmux 세션 매니저" },
	{ name: "rite", lang: "TypeScript", desc: "Claude Code·Codex용 산출물 우선 개발팀 매니저" },
	{ name: "agent-eval-harness", lang: "JavaScript", desc: "배포 전에 에이전트 품질을 재는 평가·관측 하네스" },
	{ name: "gaejo", lang: "Python", desc: "한국 연구 발표 개조식(箇條式) 변환·검증 도구" },
	{ name: "cs-translation-gpt", lang: "JavaScript", desc: "다국어 CS 상담 보조 크롬 확장, 과거 답변 RAG" },
	{ name: "mapcn-kr", lang: "TypeScript", desc: "npx 한 줄로 설치하는 한국 행정구역 지도" },
];
