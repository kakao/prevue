# Changelog

Only changes users can see go here.

> **A release is merging `develop` into `main`.** Each change goes under `[Unreleased]` in the PR that makes it (parallel PRs don't conflict — the file uses `merge=union`). Don't edit `plugin.json` by hand.
> To release, a version commit on `develop` bumps `plugin/VERSION` and `tools/sync-version.sh` carries it to both `plugin.json` files, the badges in both READMEs (English · Korean), and the heading in this file. Then one `develop` → `main` PR runs the "빌드 검증" (build check) workflow.
> The marketplace reads the plugin from `main`, so merging is shipping, and `version` in `plugin.json` is the switch ([docs](https://code.claude.com/docs/en/plugins-reference): *"users only receive updates when you bump it"*). Tags and GitHub Releases are created afterwards by running the release workflow by hand.

## [Unreleased]

- **Saving a commonMain file of a KMP module in an included build redraws it.** In a composite build (`includeBuild("components")`, as in Thunderbird's `components/ui/bolt`), such a module's previews were drawn from the app's dump, but saving did nothing: the dump listed source sets only for modules of the root build, so Prevue never watched that module's commonMain. The app's dump now lists KMP modules of included builds under the repository, so saving redraws without Gradle. Warm up the app module once more to pick it up.
- **The viewer shows whether a project is Android or Kotlin Multiplatform.** A commonMain preview used to look the same as an Android one in the header (`feature:pearl · debug`), with nothing saying it was drawn from the module's Android compilation. Now a badge on the app icon shows a green Android robot or the Kotlin Multiplatform logo, and a KMP module's file names its source set in the subtitle (`feature:pearl · commonMain · debug`), with a tooltip saying it was drawn with the app's Android build. In the open-files rail, shared source sets carry the Kotlin Multiplatform logo and a KMP module's androidMain the robot; Android-only files keep the plain file icon. `prevue status` gains `kmp`, and `sourceSet` for the shown file and for each tab of a KMP module.
- **Without Android Studio, Prevue finds an installed JDK by itself.** It used to run only on Android Studio's bundled Java or the JDK in `PREVUE_JDK`, so a Mac with JDK 25 from Homebrew still stopped at "Java is missing". Now, with no `PREVUE_JDK`, it looks at Android Studio (`/Applications` and `~/Applications`), then `JAVA_HOME`, `Library/Java/JavaVirtualMachines`, Homebrew's `openjdk*` and SDKMAN, reading each JDK's version itself, and takes 25 first, then 21–24, then 26 or later. When none is 21 or later, `health` and `start` stop saying where it looked (`jdkSearched`) and to run `brew install openjdk@25` (no sudo); call again after installing and it is found with nothing to set. Previews were byte-identical on Android Studio's JBR 25, Temurin 21 and Temurin 25; 25 or later starts about a second faster.
- **A component no longer stretches when you pick a device in interactive mode.** A preview that sizes itself to its content, such as a card or a row, used to be drawn only as tall as its content. The viewer then stretched that picture to fill the device screen, so text looked tall and squeezed. It now draws at the device's screen size like a custom size does, with the component at the top left and the rest of the screen empty. The posture pictures drawn ahead and the CLI's PNG change the same way. The renderer takes whole dp only, so on devices whose screen does not divide evenly into dp (Pixel 9, Pixel 9 Pro Fold, Galaxy Z Fold8 and Fold8 Ultra) the picture can be one pixel off the panel size, for example 1079×2423 on a Pixel 9.
- **Without an Android SDK, `health` says so before anything is approved.** The preview server draws against the SDK's `android.jar`, found through `ANDROID_HOME`, then `ANDROID_SDK_ROOT`, then `~/Library/Android/sdk`. With none there, setup and warmup went ahead and the server then failed to start, leaving only "android.jar를 찾지 못했다" in its log. Now `health` lists `sdk` under `missing` right after `jdk`, with the folder it checked and how to install the SDK, and `start` stops with the same message before it opens the preparation screen. An SDK folder with no platform downloaded counts as missing, and an empty `ANDROID_HOME` is skipped the same way by both.
- **Without Android Studio, `health` says Java is missing.** Prevue runs its preview server on Android Studio's bundled Java, or on the JDK in `PREVUE_JDK`. With neither, `health` used to report only the server as missing, and `start` then failed with "FileNotFoundError: [Errno 2] No such file or directory". Now `health` lists `jdk` under `missing` first, before any download or Gradle run is approved, with a message to install JDK 21 or later and set `PREVUE_JDK`. `start` stops with the same message before it opens the preparation screen or touches a running server. A Java older than 21 counts as missing too, so a `PREVUE_JDK` pointing at JDK 17 no longer passes `health` only for the server to fail after setup and warmup; the response names the version it found in `jdkVersion`. Thanks to @Dwite for the fix ([#29](https://github.com/kakao/prevue/pull/29)).
- **Draws commonMain previews of KMP · Compose Multiplatform modules.** Like Android Studio, it draws them from the module's Android compilation, and iOS · web targets alongside are fine. They come up from the dump of the Android app that includes the module, and Prevue watches commonMain · androidMain and the intermediate source sets Android takes part in, so saving redraws without Gradle (a file with `expect` · `actual` still needs a Gradle build). It takes AGP 9's `com.android.kotlin.multiplatform.library` (variant `androidMain`) and the older `kotlin.multiplatform` + `com.android.library` pair. Warming up with a file of a KMP module takes the dump of the app that includes it, even on a fresh clone where nothing is built yet (when several apps include it, it asks which one), and a module with no Android target says why.
- **The older JetBrains `@Preview` (`org.jetbrains.compose.ui.tooling.preview.Preview`) reads like the androidx one.** Multipreview annotations built from it now expand, constants in its arguments (`widthDp = WIDE`) are read from the compiled class, and an aliased import still counts. Its `@PreviewParameter` providers already worked.
- **Saving a file with `expect` · `actual` declarations says it needs a Gradle build.** It used to try compiling and fail with "'expect' and 'actual' declarations can be used only in multiplatform projects" plus advice to warm up the module. Now the picture stays as it was, marked stale with "needs a Gradle build", and redraws on its own when the build outputs change.
- **Compose Multiplatform resources (`Res`) draw.** Fonts, images and strings from `composeResources` used to fail with "Missing resource … .cvr" or fall back to the default font. Prevue now takes the app's merged assets from the dump and draws them as the app does — warm up the app module once more to pick them up. A KMP module's `src/androidMain/res` and manifest are also watched for resource changes.
- **Projects whose module directories don't follow their Gradle paths work end to end.** When `settings.gradle` (or a settings plugin) moves a module with `projectDir` — `:widgets` living in `core/design/widgets` — saving a file failed to compile with "Unresolved reference" because it borrowed the app's classpath, and `wait` · `focus` · `scroll` · `touch` answered "No daemon" ([#30](https://github.com/kakao/prevue/issues/30)). The dump now records each module's directory from settings, so warm up once more to pick it up. Thanks to @sergei-lapin for the report and the fix ([#31](https://github.com/kakao/prevue/pull/31)).

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
