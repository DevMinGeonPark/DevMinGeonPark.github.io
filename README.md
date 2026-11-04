# mingeon blog

Astro 정적 블로그. `main`에 push하면 GitHub Pages로 배포된다.

```sh
pnpm dev      # 로컬 개발
pnpm build    # dist/ 생성
pnpm check    # 타입 검사
pnpm test     # src/lib 단위 테스트 (Node 22.6+ type stripping)
```

- 글: `src/content/posts/<slug>/index.md` (frontmatter: title, published, description, image, tags, category, pinned?)
- 소개: `src/content/spec/about.md`
- 사이트 문구·프로필: `src/site.ts`
