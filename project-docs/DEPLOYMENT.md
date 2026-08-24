# 이지원 게임 개발 포트폴리오 배포 안내

## 폴더 구분

- `deploy/`: 포트폴리오와 플레이 가능한 웹 게임 전체
- `project-docs/`: 개발 및 배포 설명서. 웹 배포에는 불필요

## 배포 방법

정적 웹사이트이므로 별도의 빌드 명령은 필요하지 않습니다. 호스팅 서비스에는 `deploy` 폴더 자체를 프로젝트 루트로 지정하거나, `deploy` 폴더 안의 내용만 업로드합니다.

배포 시작 파일은 `deploy/index.html`입니다.

## 배포 대상 구조

```text
deploy/
├─ index.html
├─ pages/
│  ├─ archive.html
│  ├─ operative.html
│  └─ game.html
└─ assets/
   ├─ css/
   ├─ js/
   └─ images/
```

`project-docs` 폴더는 배포 대상에 포함하지 않습니다.
