# Figma UI Audit

Scope: `android-v0-compose` first-pass fidelity audit against `STAR-LINK` (`GecnPMtl1joQ6ojstRoVEm`).
Last updated: 2026-03-21

## Screen Inventory

| Route / Surface | Android implementation | Figma mapping | Audit status | Notes |
|---|---|---|---|---|
| Shared bottom navigation / AI CTA | `android-v0-compose/app/src/main/java/com/example/v0clone/App.kt` | `220:2239` `Tab` | Audited | Refined to a custom notched union silhouette and exact row/CTA spacing from design context. |
| Home | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/home/HomeScreen.kt` | Pending exact node lookup | Pending | Likely shares top gradient language with main tab screens; current layout not yet mapped. |
| Jobs | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/jobs/JobsScreen.kt` | Pending exact node lookup | Pending | High-traffic screen; not yet inspected against Figma nodes. |
| Edit intention | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/jobs/EditIntentionJobScreen.kt` | Pending exact node lookup | Pending | Navigation reachable from jobs. |
| Job selection | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/jobs/JobSelectionScreen.kt` | Pending exact node lookup | Pending | Shared with job preference flow. |
| Company detail | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/jobs/CompanyDetailScreen.kt` | Pending exact node lookup | Pending | Detailed screen; not yet compared. |
| Job detail | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/jobs/JobDetailScreen.kt` | Pending exact node lookup | Pending | Detailed screen; not yet compared. |
| AI job selection | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/ai/AiJobSelectionScreen.kt` | Pending exact node lookup | Pending | AI entry surface. |
| AI guide | `android-v0-compose/app/src/main/java/com/example/v0clone/ai/guide/InterviewGuideRoute.kt` | Pending exact node lookup | Pending | User-visible onboarding flow. |
| AI prep | `android-v0-compose/app/src/main/java/com/example/v0clone/ai/prep/PrepRoute.kt` | Pending exact node lookup | Pending | Follow-up to AI job selection. |
| AI session | `android-v0-compose/app/src/main/java/com/example/v0clone/ai/session/InterviewSessionRoute.kt` | Pending exact node lookup | Pending | Needs separate fidelity audit after auth/jobs. |
| Digital interview | `android-v0-compose/app/src/main/java/com/example/v0clone/ai/DigitalInterviewScreen.kt` | Pending exact node lookup | Pending | Likely highest-complexity UI; deferred after base surfaces. |
| Interview complete | `android-v0-compose/app/src/main/java/com/example/v0clone/ai/InterviewCompleteScreen.kt` | Pending exact node lookup | Pending | End-state UI pending lookup. |
| Circle | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/circle/CircleScreen.kt` | `48:586` `职圈` | Audited | Existing implementation already targeted this node; revalidated via MCP. |
| Create post | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/circle/CreatePostScreen.kt` | Pending exact node lookup | Pending | Existing file contains Figma-driven comments but not re-audited yet. |
| Topic aggregation | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/circle/TopicAggregationScreen.kt` | Pending exact node lookup | Pending | Secondary circle surface. |
| Post detail | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/circle/PostDetailScreen.kt` | Pending exact node lookup | Pending | Secondary circle surface. |
| Profile | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/profile/ProfileScreen.kt` | `54:1677` `我的` | Mapped | Root metadata exposes frame; exact implementation audit still pending. |
| Verification | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/profile/VerificationScreen.kt` | Pending exact node lookup | Pending | Reachable from profile. |
| Settings | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/profile/ProfileSettingsScreen.kt` | Pending exact node lookup | Pending | Reachable from profile. |
| Resume report | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/profile/ResumeReportScreen.kt` | `465:1251` `简历报告` | Mapped | Root metadata exposes frame; detail fidelity pass still pending. |
| My posts | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/profile/MyPostsScreen.kt` | Pending exact node lookup | Pending | Reachable from profile. |
| Contact us | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/profile/ContactUsScreen.kt` | Pending exact node lookup | Pending | Reachable from profile. |
| Message center | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/messages/MessageScreens.kt` | `465:1401` `消息中心` | Mapped | Root metadata exposes center frame; implementation audit still pending. |
| Message detail / compose | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/messages/MessageScreens.kt` | Pending exact node lookup | Pending | Secondary message states. |
| Assessment flows | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/assessment/AssessmentScreens.kt`, `InterviewEndScreen.kt` | Pending exact node lookup | Pending | Not yet mapped. |
| Login main | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/auth/LoginMainScreen.kt` | Pending exact node lookup | Blocked on mapping | No new layout edits this pass; only shared auth tokens/components already traceable to `122:2247` were retained. |
| Code login | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/auth/CodeLoginScreen.kt` | `122:2247` `键盘输入` | Audited | Implementation-grade design context retrieved and used for patching. |
| Numeric keyboard | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/auth/NumericKeyboard.kt` | `122:2247` -> `220:1211` `NumericKeyboard` | Audited | Subcomponent patched from design context. |
| Register | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/auth/RegisterScreen.kt` | Pending exact node lookup | Pending | No node mapped yet. |

## Figma Mapping Notes

- Confirmed via MCP metadata + design context:
  - `122:2247` `键盘输入`
  - `220:2239` `Tab`
  - `48:586` `职圈`
- Confirmed via root metadata:
  - `54:1677` `我的`
  - `465:1401` `消息中心`
  - `465:1251` `简历报告`

## Highest-Priority Mismatches

- `App.kt`: the first Figma pass still used a rounded rectangle instead of the `220:2239` union/notch silhouette and used looser row spacing than the Figma instance.
- `LoginMainScreen.kt`: the standalone auth entry surface still has no exact frame mapping in Figma, so its overall layout cannot be accepted as a strict-fidelity implementation yet.
- `HomeScreen.kt`, `JobsScreen.kt`, `DigitalInterviewScreen.kt`: still pending exact Figma-node lookup, so fidelity work has not started there yet.

## Implementation Status

- Done: added shared Figma design tokens in `ui/design/FigmaDesignTokens.kt`.
- Done: added shared auth Figma components in `ui/auth/AuthFigmaComponents.kt`.
- Done: rebuilt `CodeLoginScreen.kt` against node `122:2247`.
- Done: rebuilt `NumericKeyboard.kt` against node `220:1211`.
- Done: refined `App.kt` against node `220:2239` with a custom notched union shape, 59dp center CTA, 32dp tab gaps, and 36.5dp item widths.
- Blocked: `LoginMainScreen.kt` still needs its own exact Figma node before any further layout changes.
- Pending: exact-node lookup and fidelity audit for Home, Jobs, AI core screens, and detailed profile/message states.

## Surface Audit Details

### Shared Bottom Navigation / AI CTA

- Android: `android-v0-compose/app/src/main/java/com/example/v0clone/App.kt`
- Figma nodes:
  - `220:2239` `Tab`
  - `220:1798` `CTA`
- Mismatch findings:
  - The previous branch change replaced the old dark frosted bar, but it still used a simple rounded rectangle instead of the Figma union/notch silhouette.
  - Item spacing and reserved center gap were close but not locked to the Figma row container (`32px` gaps, `47.368px` center placeholder, `36.513px` item width).
  - The AI CTA used an extra selected-state treatment not shown in the mapped Figma instance.
- Implementation decision:
  - Keep the Figma-driven light palette and center CTA concept.
  - Refine the container to a custom notched shape and snap the row geometry to the mapped instance.
  - Remove the unsupported alternate CTA state styling and keep the mapped orange CTA treatment.
- Acceptance result:
  - Accepted for this pass. The component now matches the mapped Figma instance materially better in silhouette, CTA size, row height, and spacing.

### Code Login

- Android: `android-v0-compose/app/src/main/java/com/example/v0clone/ui/auth/CodeLoginScreen.kt`
- Figma nodes:
  - `122:2247` `键盘输入`
  - `122:2221` card body
  - `122:2230` code action chip
  - `122:2240` agreement row
- Mismatch findings:
  - Earlier branch work had duplicate branding text above the shipped combined logo asset.
  - Input fields, chip sizing, and agreement styling were partially aligned but not fully normalized to the mapped node.
- Implementation decision:
  - Keep the rebuilt auth card, spacing, input geometry, and shared agreement components already based on `122:2247`.
  - No additional layout change was necessary in this pass after re-auditing against design context.
- Acceptance result:
  - Accepted for this pass. The screen is traceable to exact Figma nodes and already aligned closely enough to avoid gratuitous churn.

### Numeric Keyboard

- Android: `android-v0-compose/app/src/main/java/com/example/v0clone/ui/auth/NumericKeyboard.kt`
- Figma nodes:
  - `220:1211` `NumericKeyboard`
  - `I220:1211;107:10143` key component
  - `I220:1211;107:10282` delete key
- Mismatch findings:
  - Earlier branch work had already removed the unsupported rounded-top sheet and white delete-key background.
  - The current implementation matches the mapped key height, inter-key spacing, container height, and home-indicator placement.
- Implementation decision:
  - Keep the existing rebuilt keyboard without further visual churn.
- Acceptance result:
  - Accepted for this pass. No further refinement was justified by the current design context.

### Login Main

- Android: `android-v0-compose/app/src/main/java/com/example/v0clone/ui/auth/LoginMainScreen.kt`
- Figma nodes:
  - Exact standalone login-entry frame not yet resolved
  - Shared auth tokens/components reused from `122:2247`
- Mismatch findings:
  - The file still uses inferred layout values for the brand-to-button spacing and overall screen composition.
  - Those values may be directionally consistent with the auth design system, but they are not yet backed by an exact standalone frame.
- Implementation decision:
  - Do not make new layout changes until the exact Figma node is identified.
  - Retain only the token/component extraction that is directly traceable to the mapped auth screen.
- Acceptance result:
  - Blocked pending exact node mapping. This surface should be revisited before calling the auth flow fully complete.

## Acceptance Notes

- Current first-pass changes are traceable to confirmed Figma nodes or to shared token values extracted from those nodes.
- The center tab bar background in Figma uses a custom union/vector shape; Compose now uses a custom notched shape that is materially closer, though it is still an approximation rather than the exact exported vector path.
- The shipped login brand asset is a combined mark, while the Figma auth frame separates the symbol and wordmark; the current patch removes duplicated text and uses the combined asset as the closest available source.
- `LoginMainScreen.kt` still requires an exact standalone Figma frame before its overall layout can be accepted as strict fidelity.
- Additional exact-match work is blocked until more screen-specific Figma node IDs are resolved for Home, Jobs, and the AI interview flow.
- Local Gradle verification could not be completed in this sandbox because the wrapper distribution cannot be downloaded without network access.
