# Feedback Index

이 디렉토리는 "코드 수정 없이" 현재 코드의 가독성/구조 개선 포인트를 정리한 문서 모음입니다.

## 문서 목록

1. `feedback/01-overview.md`
- 전체 진단 요약
- 우선순위별 개선 항목

2. `feedback/02-file-structure.md`
- 파일 분리/책임 재배치 제안
- 단계별 리팩터링 경로

3. `feedback/03-readability-guidelines.md`
- 변수명/타입명/메시지 프로토콜 네이밍 규칙
- 컴포넌트/로직 가독성 체크리스트

4. `feedback/04-change-recipes.md`
- 실제 변경 시 어떤 순서/방식으로 고치면 되는지 단계별 가이드
- 파일 이동안, 인터페이스 초안, 커밋 단위 제안

5. `feedback/05-worker-separation-followup.md`
- Worker 분리 이후 후속 리뷰
- 종료 보장, 에러 관측성, 기본값 안정성 보완 포인트

6. `feedback/06-worker-followup-solutions.md`
- Worker 후속 이슈별 구체적 해결안
- 바로 적용 가능한 예시 코드 포함

## 빠른 결론

- 현재 구조는 동작은 명확하지만 `+page.svelte`가 편집기의 여러 책임(Worker, 상태, 메뉴, 렌더)을 동시에 갖고 있어 읽기 난도가 빠르게 올라갈 수 있습니다.
- 가장 효과가 큰 개선은 "화면 컴포넌트"와 "편집기 로직/Worker 클라이언트"의 분리입니다.
- 위험성(버그 가능성) 외에도, 협업 가독성과 변경 용이성을 위해 네이밍/타입 경계 정리가 필요합니다.
