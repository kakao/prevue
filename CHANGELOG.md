# Changelog

Only changes users can see go here.

> **A release is merging `develop` into `main`.** Each change goes under `[Unreleased]` in the PR that makes it (parallel PRs don't conflict — the file uses `merge=union`). Don't edit `plugin.json` by hand.
> To release, a version commit on `develop` bumps `plugin/VERSION` and `tools/sync-version.sh` carries it to both `plugin.json` files, the badges in both READMEs (English · Korean), and the heading in this file. Then one `develop` → `main` PR runs the "빌드 검증" (build check) workflow.
> The marketplace reads the plugin from `main`, so merging is shipping, and `version` in `plugin.json` is the switch ([docs](https://code.claude.com/docs/en/plugins-reference): *"users only receive updates when you bump it"*). Tags and GitHub Releases are created afterwards by running the release workflow by hand.

## [Unreleased]

- **Saving redraws projects built for Java 21.** When a saved file called an `inline` function from a module built for JVM 21, the redraw failed with "cannot inline bytecode built with JVM target 21 into bytecode that is being built with JVM target 17" ([#21](https://github.com/kakao/prevue/issues/21)). Prevue now compiles each saved file for the same JVM target Gradle used for that module.

- **`prevue setup` works with only Android Studio's Java installed.** It used to stop with "Cannot find a Java installation … matching: {languageVersion=17}" unless JDK 17 was also installed ([#22](https://github.com/kakao/prevue/issues/22)). JDK 21 or later is enough now, as the README says.

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
