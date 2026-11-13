# Changelog

Only changes users can see go here.

> **A release is merging `develop` into `main`.** Each change goes under `[Unreleased]` in the PR that makes it (parallel PRs don't conflict — the file uses `merge=union`). Don't edit `plugin.json` by hand.
> To release, a version commit on `develop` bumps `plugin/VERSION` and `tools/sync-version.sh` carries it to both `plugin.json` files, the badges in both READMEs (English · Korean), and the heading in this file. Then one `develop` → `main` PR runs the "빌드 검증" (build check) workflow.
> The marketplace reads the plugin from `main`, so merging is shipping, and `version` in `plugin.json` is the switch ([docs](https://code.claude.com/docs/en/plugins-reference): *"users only receive updates when you bump it"*). Tags and GitHub Releases are created afterwards by running the release workflow by hand.

## [Unreleased]

- iPhone device frames now use the screen corner radius measured on [safearea.info](https://safearea.info/) — 62 pt on iPhone 17, iPhone Air and iPhone 17 Pro Max (were 55, 57 and 60), 59 pt on both iPhone Duo screens (were 44 and 30).

## [0.22.1] — 2026-11-13

The README now leads with what Prevue does for you — five features, with pictures retaken in the 0.22 UI. Android device frames also get each device's measured screen corners.

- **The README is reorganized around five features** — your agent checking its own work, hot swap, pointing, interactive mode and light worktrees — under the new headline "Close Android Studio. Your Previews still show."
- Android device frames now use the measured screen corner radius of each device and posture (Pixel 9, Pixel 9 Pro Fold, Galaxy S26, Galaxy Z Fold8).

## [0.22.0] — 2026-11-12

![Prevue 0.22 — See what it's made of. See where it fits. A card beside an unfolded iPhone Duo names AddBar at DrinkDetailScreen.kt:291 with its size and modifiers, while the inset bands on the right and bottom show where the screen isn't safe](https://raw.githubusercontent.com/kakao/prevue/v0.22.0/assets/release-0.22.0.png)

**See what it's made of. See where it fits.** Point at an element and a card shows its composable, size and modifiers. Pick a device and your Composable gets its real insets, and Show inset areas draws the unsafe bands over the picture. The single view also gets one dock under the picture.

### See what it's made of

![Clicking beside the price on a drink card in a board of Pearl previews opens a card next to the picture with DrinkCard.kt:106, its size in dp, its modifiers and a tree of the elements around it; rows in the tree point at the whole drink card and the next one, and the Preview button jumps to MenuCardsPreview](https://raw.githubusercontent.com/kakao/prevue/v0.22.0/assets/release-0.22.0-pointing.webp)

- **Click an element → a card beside the picture** shows its composable, `file:line`, size and modifiers, with a tree to move around and a jump to its `@Preview`.
- **`prevue previews --of <composable>`** finds a composable's previews by name.

### See where it fits

![Changing devices from the dock with Show inset areas left on: S26, iPhone 17, iPhone Duo folded to its cover and unfolded, then S26 again, each redrawing inside its own SAFE AREA](https://raw.githubusercontent.com/kakao/prevue/913a690402a561dcacaef436316cf4fdf0be276f/assets/devices.gif)

- **Real device insets reach your Composable**, from [windowinsets.info](https://windowinsets.info/) and [safearea.info](https://safearea.info/).
- **Show inset areas** draws each inset band and the safe area.
- **Each device draws its own system UI** — Android, iOS and iPhone Duo status bars, in the browser only.
- **`showSystemUi = true` draws the bars**; off a device, turn them on or off from the dock or `focus --system-ui`.
- **Portrait, Landscape left and Landscape right on every device** (`focus --orientation`, Android naming).
- **Folding keeps the device the way you hold it.**

### Single view and board

- **One dock under the picture** replaces the side panel.
- **`prevue show <FQN>` opens on its file's board**, so Back and Esc work.
- **Board cards stay current** while you interact with one.
- **Flatter board** — 1 px borders, names above pictures, `@PreviewParameter` cards named by value.

### Starting and updating

- **The first start after updating downloads about 11 MB once** — run `prevue setup` when `health` asks.
- **Opening a file draws code changed while the daemon was off**, and a restarted daemon reuses the last one's compiles when nothing changed.

### Fixes

- **KMP library modules** with `implementation` dependencies no longer fail on save with "Unresolved reference" ([#129](https://github.com/kakao/prevue/issues/129)) — warm up once more. Thanks to @citytexi for the report and the fix ([#130](https://github.com/kakao/prevue/pull/130)).
- Also: `next` and `then` use the `prevue` that answered, and Original size keeps its aspect ratio.

### Thanks

@citytexi ([#129](https://github.com/kakao/prevue/issues/129), [#130](https://github.com/kakao/prevue/pull/130))

## [0.21.0] — 2026-11-02

![Prevue 0.21 — Kotlin Multiplatform, in your browser](https://raw.githubusercontent.com/kakao/prevue/v0.21.0/assets/release-0.21.0.png)

Name a file in commonMain and its previews come up in the browser and redraw on save, the same way Android ones do — Kotlin Multiplatform and Compose Multiplatform modules work end to end. Prevue also gets going on a Mac without Android Studio, finding an installed JDK by itself and saying what is missing (Java or the Android SDK) before anything is approved, and saving stays under a second even when you pause between edits.

### Kotlin Multiplatform

Prevue now draws commonMain previews of Kotlin Multiplatform and Compose Multiplatform modules. Like Android Studio, it draws them from the module's Android compilation, and iOS · web targets alongside are fine. It takes AGP 9's `com.android.kotlin.multiplatform.library` (variant `androidMain`) and the older `kotlin.multiplatform` + `com.android.library` pair. If you warmed up an app module with an earlier version, warm it up once more to pick all of this up.

![A board of KotlinConf's PartyAnimation previews; the pointer opens the Dark one in interactive mode, where lights, Kodees and confetti move, then goes back to the board](https://raw.githubusercontent.com/kakao/prevue/v0.21.0/assets/release-0.21.0-kmp.webp)
<sub>`PartyAnimationPreview` from the commonMain of the [KotlinConf app](https://github.com/JetBrains/kotlinconf-app/blob/907ce238e1ffe2472991eeb2d2bfa386bdb4ea8f/app/ui-components/src/commonMain/kotlin/org/jetbrains/kotlinconf/ui/components/PartyAnimation.kt) (Apache 2.0), opened in Prevue's interactive mode.</sub>

- **Warmup.** Previews come up from the dump of the Android app that includes the module. Warming up with a file of a KMP module takes that app's dump, even on a fresh clone where nothing is built yet (when several apps include it, it asks which one), and a module with no Android target says why.
- **Saving.** Prevue watches commonMain · androidMain and the intermediate source sets Android takes part in, so saving redraws without Gradle. That includes KMP modules of an included build under the repository (`includeBuild("components")`, as in Thunderbird's `components/ui/bolt`).
- **`expect` · `actual`.** Saving or opening a file with `expect` · `actual` declarations says it needs a Gradle build. It used to try compiling and fail with "'expect' and 'actual' declarations can be used only in multiplatform projects" plus advice to warm up the module. Now the picture stays as it was, marked stale with "needs a Gradle build", and redraws on its own when the build outputs change. Opening such a file changed since the last Gradle build, or bringing back an empty tab by saving one, draws from the Gradle build with the same mark instead of failing.
- **Compose Multiplatform resources (`Res`).** Fonts, images and strings from `composeResources` used to fail with "Missing resource … .cvr" or fall back to the default font. Prevue now takes the app's merged assets from the dump and draws them as the app does. A KMP module's `src/androidMain/res` and manifest are also watched for resource changes.
- **The older JetBrains `@Preview`** (`org.jetbrains.compose.ui.tooling.preview.Preview`) reads like the androidx one. Multipreview annotations built from it now expand, constants in its arguments (`widthDp = WIDE`) are read from the compiled class, and an aliased import still counts. Its `@PreviewParameter` providers already worked.
- **Viewer.** A KMP module's file names its source set in the subtitle (`feature:pearl · commonMain · debug`). In the open-files rail, a shared source set's file icon carries the Kotlin Multiplatform mark and a KMP module's androidMain an Android robot, in the official one-color logo (black, white in dark mode); Android-only files keep the plain file icon, and the icons are 18px. A shared source set's tab tooltip adds "Shared code · rendered with the Android build", and the first time you open such a file in a checkout, a note at the bottom says "commonMain renders with the app's Android build too. expect calls run the Android actual." until you close it (it steps aside while you look at other files). `prevue status` gains `kmp`, and `sourceSet` for the shown file and for each tab of a KMP module.
- **README.** The subtitle names Jetpack Compose and Compose Multiplatform, and a Compose Multiplatform badge joins the badge row, now regrouped into plain build, version and license badges and brand-colored ones for Claude Code, Codex, Jetpack Compose, Compose Multiplatform and JDK. Get started says to name a file in commonMain the same way, the board section says commonMain Previews are drawn from the module's Android compilation, and Supported lists which KMP modules work and which stop.

### Setup without Android Studio

- **Without Android Studio, Prevue finds an installed JDK by itself, and says so when there is none.** It used to run only on Android Studio's bundled Java or the JDK in `PREVUE_JDK`: a Mac with JDK 25 from Homebrew still stopped at "Java is missing", and with neither, `health` reported only the server as missing and `start` then failed with "FileNotFoundError: [Errno 2] No such file or directory". Now, with no `PREVUE_JDK`, it looks at Android Studio (`/Applications` and `~/Applications`), then `JAVA_HOME`, `Library/Java/JavaVirtualMachines`, Homebrew's `openjdk*` and SDKMAN, reading each JDK's version itself, and takes 25 first, then 21–24, then 26 or later. When none is 21 or later, `health` lists `jdk` under `missing` first, before any download or Gradle run is approved, saying where it looked (`jdkSearched`) and to run `brew install openjdk@25` (no sudo), and `start` stops with the same message before it opens the preparation screen or touches a running server; call again after installing and it is found with nothing to set. A Java older than 21 counts as missing too, so a `PREVUE_JDK` pointing at JDK 17 no longer passes `health` only for the server to fail after setup and warmup; the response names the version it found in `jdkVersion`. Previews were byte-identical on Android Studio's JBR 25, Temurin 21 and Temurin 25; 25 or later starts about a second faster. Thanks to @Dwite for the fix ([#29](https://github.com/kakao/prevue/pull/29)).
- **Without an Android SDK, `health` says so before anything is approved.** The preview server draws against the SDK's `android.jar`, found through `ANDROID_HOME`, then `ANDROID_SDK_ROOT`, then `~/Library/Android/sdk`. With none there, setup and warmup went ahead and the server then failed to start, leaving only "android.jar를 찾지 못했다" in its log. Now `health` lists `sdk` under `missing` right after `jdk`, with the folder it checked and how to install the SDK, and `start` stops with the same message before it opens the preparation screen. An SDK folder with no platform downloaded counts as missing, and an empty `ANDROID_HOME` is skipped the same way by both.

### Performance

- **Saving stays under a second when you pause between edits.** The preview server used to start the Kotlin compiler's environment over on every save, so with saves half a minute apart, compiling one file could climb from about 0.3 s to 0.6–1 s after a few saves and a save took longer than a second (KotlinConf's `PageTitle.kt`, a commonMain file). Now it keeps that environment between saves, as the Kotlin daemon does. On an Apple M4 Max, six to ten saves 30 seconds apart took a median of 0.64–0.79 s across four runs, against 0.63–1.19 s across five runs without it; a jar that Gradle rewrites in the meantime is still read fresh.

### Fixes

- **Projects whose module directories don't follow their Gradle paths work end to end.** When `settings.gradle` (or a settings plugin) moves a module with `projectDir` — `:widgets` living in `core/design/widgets` — saving a file failed to compile with "Unresolved reference" because it borrowed the app's classpath, and `wait` · `focus` · `scroll` · `touch` answered "No daemon" ([#30](https://github.com/kakao/prevue/issues/30)). The dump now records each module's directory from settings, so warm up once more to pick it up. Thanks to @sergei-lapin for the report and the fix ([#31](https://github.com/kakao/prevue/pull/31)).
- **A component no longer stretches when you pick a device in interactive mode.** A preview that sizes itself to its content, such as a card or a row, used to be drawn only as tall as its content. The viewer then stretched that picture to fill the device screen, so text looked tall and squeezed. It now draws at the device's screen size like a custom size does, with the component at the top left and the rest of the screen empty. The posture pictures drawn ahead and the CLI's PNG change the same way. The renderer takes whole dp only, so on devices whose screen does not divide evenly into dp (Pixel 9, Pixel 9 Pro Fold, Galaxy Z Fold8 and Fold8 Ultra) the picture can be one pixel off the panel size, for example 1079×2423 on a Pixel 9.
- **When the renderer or a project's `ui-tooling` doesn't pair with Prevue, the preview fails and names what's missing.** If a project's `androidx.compose.ui:ui-tooling` lacked the tree accessor Prevue reads, the picture still came out but pointing at it found nothing, with only the warning "Compose 노드 없음 — 렌더는 성공했지만 Preview가 그린 노드가 없다", which blamed the preview. Now that render fails with "Couldn't read the Compose tree from ComposeViewAdapter — this project's androidx.compose.ui:ui-tooling doesn't pair with Prevue's renderer (ComposeViewAdapter.getViewInfos$ui_tooling is missing)". On the renderer side, the internals Prevue uses to load, preload and swap your classes are now opened when the server starts, and when any is missing it stops there listing all of them ("The renderer doesn't pair with this Prevue — couldn't open renderer internals: …"), instead of failing partway through a later render or save.
- **When the preview server fails on its first start, `start` gives the reason.** On the first start after installing or updating, the JVM writes its startup cache to the log after the server exits, so the error read "The daemon didn't start — Removed temporary AOT configuration file …". Now it quotes the server's own failure line.
- **In Codex, the approval question keeps its reason.** When Prevue needed approval to read the build settings or reread resources, Codex often swapped the question's first clause for a note that the Prevue skill requires approval, so "This is the first time opening this module" or "Resources have changed" never reached you. Now the question is passed on whole, and any note on where the request comes from follows it as a separate short paragraph.

### Thanks

@Dwite ([#29](https://github.com/kakao/prevue/pull/29)) · @sergei-lapin ([#30](https://github.com/kakao/prevue/issues/30), [#31](https://github.com/kakao/prevue/pull/31))

## [0.20.2] — 2026-10-29

- **`prevue setup` works with only Android Studio's Java installed.** It used to stop with "Cannot find a Java installation … matching: {languageVersion=17}" unless JDK 17 was also installed ([#22](https://github.com/kakao/prevue/issues/22)). JDK 21 or later is enough now, as the README says. Reported by @sooppark.
- **Saving redraws projects built for Java 21.** When a saved file called an `inline` function from a module built for JVM 21, the redraw failed with "cannot inline bytecode built with JVM target 21 into bytecode that is being built with JVM target 17" ([#21](https://github.com/kakao/prevue/issues/21)). Prevue now compiles each saved file for the same JVM target Gradle used for that module. Reported by @sooppark.

## [0.20.1] — 2026-10-29

- **Reporting a problem has a form now.** New issues offer a "Not working" form that asks where Prevue stopped, your environment, and the size of your project, and the README links to it. To tell us about a screen you can't see in a Preview, use the pinned discussion instead.

## [0.20.0] — 2026-10-29

- **The daemon starts faster with JDK 25 or later** (Android Studio's bundled runtime is 25). The first daemon after an install or update records a class cache when it stops; later starts load it, which cuts about a second off the first Preview. The cache is about 200MB in `~/.prevue/aot` and shows up in `prevue paths`. Set `PREVUE_AOT=0` to turn it off.
- **The first Preview after `start` shows sooner when its file changed since your last Gradle build.** The daemon compiles that file while the renderer is still starting, instead of waiting behind compiler warmup, and draws the first picture only from the new code. Other files that look newer than the build are compiled with the next change, unless the opened file needs them.
- **The daemon uses less memory when you switch between large devices.** Moving back and forth between Fold8, Fold8 Ultra and a 1600×1600dp custom size for a long time used to peak at about 3.6GB. It now stays under 3GB, because the daemon caps its heap at 2GB and hands unused memory back sooner. Set `PREVUE_HEAP` to raise the cap.
- **The README headline now says it's for Compose.** It used to read only "Your agent finally sees the UI it builds."

## [0.19.0] — 2026-10-28

- **The plugin install is smaller.** Claude Code and Codex now download only the plugin itself, not the repository's README media, design prototypes, tests, or test fixtures. **Update the marketplace before the plugin this time** — a marketplace entry from before this release can no longer find the plugin.
- **A running daemon no longer breaks when the plugin's files are rebuilt or replaced under it.** It runs from its own copy, so drawing keeps working instead of failing with `NoClassDefFoundError`.
- **`prevue stop` reports only daemons that actually stopped.** A daemon that can't handle the stop request is now shut down with a signal instead of being counted as stopped while it kept its port. If one still won't stop, `stop` answers `ok:false` and lists it under `failed`.

## [0.18.3] — 2026-10-28

- **The README intro video is redrawn.** Hot swap now changes a whole board of Previews twice, layout then theme, and the every-screen part follows the same drink screen into its two-pane layout from 673 wide and onto a folding iPhone Duo.

## [0.18.2] — 2026-10-27

- **The README now opens with a 20-second intro video** and reads more naturally in English and Korean. Install and update share one section.

## [0.18.1] — 2026-10-26

- **Fixed blurry interactive frames when the same Preview is open in more than one window.** The daemon shrank the moving picture to the width of whichever window reported last and sent it to every window, so one small window (or a leftover headless browser) made a large window's animation a stretched thumbnail (945px drawn at 139px). Now each window's width is kept separately, frames go out at the widest window still attached, and closed windows drop out. Still frames were always full size.

## [0.18.0] — 2026-10-26

First public release.

- **Jetpack Compose `@Preview`s in the browser, without Android Studio.** Prevue renders them with headless layoutlib, and saving a file redraws them in about a second without Gradle. Gradle runs once, to read the build setup, and never touches your build files.
- **Your agent sees what it builds.** The Claude Code and Codex plugins let the agent open a Preview, wait for the redraw, and look at the picture itself, so it can check its own work.
- **Point instead of explaining.** Click anything in a Preview and the agent reads it as a file and line.
- **Every Preview on one board**, with an interactive mode that runs clicks and animations, a workspace that resizes the screen or switches devices (phones, foldables, tablets, iPhones), and quick open (`/` · `⌘K`).
- **One worktree, one daemon.** Each checkout draws with its own code, so several agents can work side by side.
- The viewer speaks English and Korean (`?lang=ko`, `prevue --lang ko`). The CLI and agent skills are English, and the agent relays them in your language.
- Licensed under Apache-2.0.
