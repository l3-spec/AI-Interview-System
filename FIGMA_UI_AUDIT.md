# Figma UI Audit

Scope: `android-v0-compose` first-pass fidelity audit against `STAR-LINK` (`GecnPMtl1joQ6ojstRoVEm`).
Last updated: 2026-03-21

## Screen Inventory

| Route / Surface | Android implementation | Figma mapping | Audit status | Notes |
|---|---|---|---|---|
| Shared bottom navigation / AI CTA | `android-v0-compose/app/src/main/java/com/example/v0clone/App.kt` | `220:2239` `Tab` | Audited | Refined to a custom notched union silhouette and exact row/CTA spacing from design context. |
| Home | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/home/HomeScreen.kt` | Shared exact nodes: `48:586` `职圈`, `48:730` `搜索框`, `220:1361`, `220:1368`, `220:1405` | Partial, blocked on page mapping | Header/search/feed cards tightened against confirmed main-tab nodes, but the exact Home artboard is still unresolved. |
| Jobs | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/jobs/JobsScreen.kt` | Shared exact nodes: `48:586` `职圈`, `48:730` `搜索框`, `220:1361` | Partial, blocked on page mapping | Search/title geometry was recalibrated from confirmed main-tab nodes; the exact Jobs artboard is still unresolved. |
| Edit intention | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/jobs/EditIntentionJobScreen.kt` | Pending exact node lookup | Pending | Navigation reachable from jobs. |
| Job selection | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/jobs/JobSelectionScreen.kt` | Pending exact node lookup | Pending | Shared with job preference flow. |
| Company detail | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/jobs/CompanyDetailScreen.kt` | Pending exact node lookup | Pending | Detailed screen; not yet compared. |
| Job detail | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/jobs/JobDetailScreen.kt` | Pending exact node lookup | Pending | Detailed screen; not yet compared. |
| AI job selection | `android-v0-compose/app/src/main/java/com/example/v0clone/ui/ai/AiJobSelectionScreen.kt` | Pending exact node lookup | Blocked on mapping | No exact AI job-selection artboard was resolved in this pass. |
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
- Confirmed via MCP design context and reused as shared main-tab calibration nodes:
  - `48:730` `搜索框`
  - `220:1361` search field
  - `220:1368` masonry card
  - `220:1405` masonry card
- Confirmed via root metadata:
  - `54:1677` `我的`
  - `465:1401` `消息中心`
  - `465:1251` `简历报告`

## Highest-Priority Mismatches

- `App.kt`: the first Figma pass still used a rounded rectangle instead of the `220:2239` union/notch silhouette and used looser row spacing than the Figma instance.
- `LoginMainScreen.kt`: the standalone auth entry surface still has no exact frame mapping in Figma, so its overall layout cannot be accepted as a strict-fidelity implementation yet.
- `HomeScreen.kt`, `JobsScreen.kt`: component-level fidelity has been improved using confirmed main-tab nodes, but both still lack their own exact artboard mappings.
- `AiJobSelectionScreen.kt`, `DigitalInterviewScreen.kt`: still pending exact Figma-node lookup, so page-level fidelity work remains blocked.

## Implementation Status

- Done: added shared Figma design tokens in `ui/design/FigmaDesignTokens.kt`.
- Done: added shared auth Figma components in `ui/auth/AuthFigmaComponents.kt`.
- Done: rebuilt `CodeLoginScreen.kt` against node `122:2247`.
- Done: rebuilt `NumericKeyboard.kt` against node `220:1211`.
- Done: refined `App.kt` against node `220:2239` with a custom notched union shape, 59dp center CTA, 32dp tab gaps, and 36.5dp item widths.
- Done: tightened `HomeScreen.kt` header/search/feed card geometry against confirmed shared main-tab nodes from `48:586`.
- Done: tightened `JobsScreen.kt` header/search/title/card geometry against confirmed shared main-tab nodes from `48:586`.
- Blocked: `LoginMainScreen.kt` still needs its own exact Figma node before any further layout changes.
- Blocked: `AiJobSelectionScreen.kt` still needs its own exact Figma node before any layout changes in this pass.
- Pending: exact-node lookup and fidelity audit for AI core screens and detailed profile/message states.

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

### Home

- Android: `android-v0-compose/app/src/main/java/com/example/v0clone/ui/home/HomeScreen.kt`
- Figma nodes:
  - Exact Home artboard unresolved
  - Shared calibration nodes used this pass:
    - `48:586` `职圈`
    - `48:730` `搜索框`
    - `220:1361` search field
    - `220:1368` masonry card
    - `220:1405` masonry card
- Mismatch findings:
  - The top search bar was still using inferred 44dp geometry, 16dp radius, oversized icon sizing, and looser title-to-search spacing than the confirmed main-tab surface.
  - Feed cards still used 10dp corners, elevated Material styling, chip pills, and heavier footer spacing that diverged from the confirmed masonry card component.
  - The exact Home artboard itself remains unresolved, so the banner block and overall page composition still cannot be accepted as strict fidelity.
- Implementation decision:
  - Tighten the header to the confirmed main-tab search geometry: 32dp field height, 8dp radius, 24dp inner padding, 12dp icon size, 10dp icon gap, and Figma letter spacing.
  - Rebuild feed cards toward the confirmed masonry card language: 8dp corners, flat white surfaces, 4dp inner paddings, inline orange metadata instead of pills, and lighter 12sp footer typography.
  - Leave the banner untouched until the exact Home page artboard is resolved.
- Acceptance result:
  - Blocked pending exact Home artboard mapping. Shared component fidelity improved materially, but the page cannot be marked accepted yet.

### Jobs

- Android: `android-v0-compose/app/src/main/java/com/example/v0clone/ui/jobs/JobsScreen.kt`
- Figma nodes:
  - Exact Jobs artboard unresolved
  - Shared calibration nodes used this pass:
    - `48:586` `职圈`
    - `48:730` `搜索框`
    - `220:1361` search field
- Mismatch findings:
  - The jobs header was still using an inferred 44dp search field, 16dp radius, larger placeholder typography, and looser spacing than the confirmed main-tab header language.
  - The intention title and job-card typography were heavier and rounder than the confirmed tab-surface text treatment.
  - The exact Jobs artboard remains unresolved, so filters, sort row, and list composition cannot be fully accepted as strict fidelity.
- Implementation decision:
  - Tighten the header/search bar to the confirmed search component geometry and letter spacing from the mapped main-tab node.
  - Normalize the intention title to 24sp semibold with Figma spacing, and flatten list cards from 10dp/raised styling to 8dp/flatter styling with lighter 14sp text treatment.
  - Leave the rest of the page structurally intact until the exact Jobs artboard is resolved.
- Acceptance result:
  - Blocked pending exact Jobs artboard mapping. Shared component fidelity improved, but page-level acceptance is still not possible.

### AI Job Selection

- Android: `android-v0-compose/app/src/main/java/com/example/v0clone/ui/ai/AiJobSelectionScreen.kt`
- Figma nodes:
  - Exact AI job-selection artboard unresolved
- Mismatch findings:
  - This surface still has no resolved page node, so any spacing or hierarchy adjustment would be inferential.
- Implementation decision:
  - Skip layout edits in this pass rather than fabricate a mapping.
- Acceptance result:
  - Blocked pending exact node mapping.

## Acceptance Notes

- Current first-pass changes are traceable to confirmed Figma nodes or to shared token values extracted from those nodes.
- The center tab bar background in Figma uses a custom union/vector shape; Compose now uses a custom notched shape that is materially closer, though it is still an approximation rather than the exact exported vector path.
- The shipped login brand asset is a combined mark, while the Figma auth frame separates the symbol and wordmark; the current patch removes duplicated text and uses the combined asset as the closest available source.
- `LoginMainScreen.kt` still requires an exact standalone Figma frame before its overall layout can be accepted as strict fidelity.
- `HomeScreen.kt` and `JobsScreen.kt` now borrow exact shared main-tab component geometry from `48:586`, but both still need their own artboard mappings before final acceptance.
- Additional exact-match work is blocked until more screen-specific Figma node IDs are resolved for Home, Jobs, AI job selection, and the AI interview flow.
- Local Gradle verification could not be completed in this sandbox because the wrapper distribution cannot be downloaded without network access.
