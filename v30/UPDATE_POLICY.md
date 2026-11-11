# Update policy

1. **Branches.** Work happens on `feature/*` branches cut from the latest accepted baseline. `main`
   and earlier version branches are never force-pushed, reset or rewritten.
2. **Baseline first.** Before changing anything record: branch + commit, `npm test` result,
   `npm run assets:verify` result.
3. **Scoped change → targeted tests → build → browser QA → screenshots.** Unit tests alone are never
   evidence of visual quality; `tests/e2e/run.mjs` must be run against the built app and its report
   committed under `docs/qa/`.
4. **Saves are sacred.** Any change to `GameState` needs: a new `SAVE_SCHEMA`, a migration in
   `persistence/save.ts`, and a migration test. Old keys are read-only. Never delete a player's save.
5. **Balance changes** bump `BALANCE_VERSION`, are listed in `CHANGELOG.md`, and are covered by tests.
6. **Assets.** New third-party assets need a verified licence for that exact pack, an entry in
   `ASSET_MANIFEST.json` and `THIRD_PARTY_NOTICES.md`. No paid, subscription or unknown-licence
   assets. Protected identity files (logos, mascot master) are byte-locked by `assets:verify`.
7. **Feature flags.** Unfinished systems ship behind `config/featureFlags.ts` and stay off until
   their acceptance gate in `docs/ACCEPTANCE.md` passes.
8. **Versioning.** Semantic versioning; pre-release tags (`-alpha.N`, `-beta.N`) until the owner
   approves a release.
9. **Releases need the owner.** Merging to `main`, enabling GitHub Pages, and anything destructive
   require explicit owner approval. Security and functional fixes may be *prepared* automatically as
   pull requests.
10. **Rollback.** Code: revert the merge commit. Player data: the in-game "الرجوع للحفظ السابق"
    restores the previous save; exported JSON saves can be re-imported.
11. **Never claim what was not checked.** A deployment is only reported as live after its URL was
    fetched; a visual gate is only reported as passed after the owner reviewed real screenshots.
