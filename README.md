<h1 align="center">
  <img src="assets/icon.png" width="40" height="40" alt="" align="absmiddle">&nbsp;Prevue
</h1>

<p align="center"><b>Your agent finally sees the Compose UI it builds.</b></p>

<p align="center">Compose Previews in your browser, redrawn a second after every save.<br>No Android Studio, no build.</p>

<p align="center"><b>English</b> | <a href="README.ko.md">한국어</a></p>

<div align="center">

[![GitHub Actions](https://img.shields.io/badge/GitHub%C2%A0Actions-build%C2%A0check-0E1B2A?logo=github&logoColor=white)](https://github.com/kakao/prevue/actions/workflows/build.yml)
[![version](https://img.shields.io/badge/version-0.20.2-0E1B2A)](CHANGELOG.md)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-0E1B2A?logo=claude&logoColor=white)](#get-started)
[![Codex](https://img.shields.io/badge/Codex-plugin-0E1B2A?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI%2BPHBhdGggZmlsbD0iI2ZmZiIgZD0iTTIyLjI4MTkgOS44MjExYTUuOTg0NyA1Ljk4NDcgMCAwIDAtLjUxNTctNC45MTA4IDYuMDQ2MiA2LjA0NjIgMCAwIDAtNi41MDk4LTIuOUE2LjA2NTEgNi4wNjUxIDAgMCAwIDQuOTgwNyA0LjE4MThhNS45ODQ3IDUuOTg0NyAwIDAgMC0zLjk5NzcgMi45IDYuMDQ2MiA2LjA0NjIgMCAwIDAgLjc0MjcgNy4wOTY2IDUuOTggNS45OCAwIDAgMCAuNTExIDQuOTEwNyA2LjA1MSA2LjA1MSAwIDAgMCA2LjUxNDYgMi45MDAxQTUuOTg0NyA1Ljk4NDcgMCAwIDAgMTMuMjU5OSAyNGE2LjA1NTcgNi4wNTU3IDAgMCAwIDUuNzcxOC00LjIwNTggNS45ODk0IDUuOTg5NCAwIDAgMCAzLjk5NzctMi45MDAxIDYuMDU1NyA2LjA1NTcgMCAwIDAtLjc0NzUtNy4wNzI5em0tOS4wMjIgMTIuNjA4MWE0LjQ3NTUgNC40NzU1IDAgMCAxLTIuODc2NC0xLjA0MDhsLjE0MTktLjA4MDQgNC43NzgzLTIuNzU4MmEuNzk0OC43OTQ4IDAgMCAwIC4zOTI3LS42ODEzdi02LjczNjlsMi4wMiAxLjE2ODZhLjA3MS4wNzEgMCAwIDEgLjAzOC4wNTJ2NS41ODI2YTQuNTA0IDQuNTA0IDAgMCAxLTQuNDk0NSA0LjQ5NDR6bS05LjY2MDctNC4xMjU0YTQuNDcwOCA0LjQ3MDggMCAwIDEtLjUzNDYtMy4wMTM3bC4xNDIuMDg1MiA0Ljc4MyAyLjc1ODJhLjc3MTIuNzcxMiAwIDAgMCAuNzgwNiAwbDUuODQyOC0zLjM2ODV2Mi4zMzI0YS4wODA0LjA4MDQgMCAwIDEtLjAzMzIuMDYxNUw5Ljc0IDE5Ljk1MDJhNC40OTkyIDQuNDk5MiAwIDAgMS02LjE0MDgtMS42NDY0ek0yLjM0MDggNy44OTU2YTQuNDg1IDQuNDg1IDAgMCAxIDIuMzY1NS0xLjk3MjhWMTEuNmEuNzY2NC43NjY0IDAgMCAwIC4zODc5LjY3NjVsNS44MTQ0IDMuMzU0My0yLjAyMDEgMS4xNjg1YS4wNzU3LjA3NTcgMCAwIDEtLjA3MSAwbC00LjgzMDMtMi43ODY1QTQuNTA0IDQuNTA0IDAgMCAxIDIuMzQwOCA3Ljg3MnptMTYuNTk2MyAzLjg1NThMMTMuMTAzOCA4LjM2NCAxNS4xMTkyIDcuMmEuMDc1Ny4wNzU3IDAgMCAxIC4wNzEgMGw0LjgzMDMgMi43OTEzYTQuNDk0NCA0LjQ5NDQgMCAwIDEtLjY3NjUgOC4xMDQydi01LjY3NzJhLjc5Ljc5IDAgMCAwLS40MDctLjY2N3ptMi4wMTA3LTMuMDIzMWwtLjE0Mi0uMDg1Mi00Ljc3MzUtMi43ODE4YS43NzU5Ljc3NTkgMCAwIDAtLjc4NTQgMEw5LjQwOSA5LjIyOTdWNi44OTc0YS4wNjYyLjA2NjIgMCAwIDEgLjAyODQtLjA2MTVsNC44MzAzLTIuNzg2NmE0LjQ5OTIgNC40OTkyIDAgMCAxIDYuNjgwMiA0LjY2ek04LjMwNjUgMTIuODYzbC0yLjAyLTEuMTYzOGEuMDgwNC4wODA0IDAgMCAxLS4wMzgtLjA1NjdWNi4wNzQyYTQuNDk5MiA0LjQ5OTIgMCAwIDEgNy4zNzU3LTMuNDUzN2wtLjE0Mi4wODA1TDguNzA0IDUuNDU5YS43OTQ4Ljc5NDggMCAwIDAtLjM5MjcuNjgxM3ptMS4wOTc2LTIuMzY1NGwyLjYwMi0xLjQ5OTggMi42MDY5IDEuNDk5OHYyLjk5OTRsLTIuNTk3NCAxLjQ5OTctMi42MDY3LTEuNDk5N1oiLz48L3N2Zz4%3D)](#get-started)
![Jetpack Compose](https://img.shields.io/badge/Jetpack%20Compose-headless%20render-4285F4?logo=jetpackcompose&logoColor=white)
![JDK](https://img.shields.io/badge/JDK-21%2B-7A8794?logo=openjdk&logoColor=white)
[![license](https://img.shields.io/badge/license-Apache--2.0-7A8794)](LICENSE)

</div>

<p align="center">
  <img src="assets/intro.webp" width="1000"
       alt="Prevue in 20 seconds, on the Pearl sample app. Hot swap: on a board of Previews, one save turns the drink cards into wide rows, a second save changes seven colors in Theme.kt to a dark theme, and all 30 Previews redraw each time. Interactive: the live Preview scrolls, a drink opens, and choosing size L, a topping and extra pearls changes the cup. Every screen: that drink screen steps through 320×640, 673×841 and a custom width dragged to 900, splitting into two panes from 673 wide, then iPhone Duo unfolds and folds shut to its cover screen">
</p>
<p align="center"><sub>Hot swap, interactive and every screen — real renders of the sample app.</sub></p>

## The agent codes, you still check

Your agent says the screen is done. So you open Android Studio, wait for Gradle, and find the padding is off.
You take a screenshot, explain what's wrong, and wait for the next try. **The agent writes the code, but you're still its eyes — every loop.**

And every look costs an IDE. One Preview keeps Android Studio, a Gradle daemon, and a Kotlin daemon running, about 8GB.
Give each of three agents its own worktree and you're running three Android Studios.

Here's that loop. Notice who sits in the middle of it.

<p align="center">
  <img src="assets/agent-loop-before.png" width="880"
       alt="The UI fix loop before Prevue. The developer sits inside the loop, highlighted in orange: the coding agent edits and saves, Android Studio builds and renders the Preview in about four seconds, and the developer looks, takes a screenshot, and explains what's wrong before the agent edits again — every loop">
</p>

We hit this every day. With three agents on a 36GB Mac, the Android Studios started swapping and every task slowed to a crawl.
Paparazzi and Roborazzi also turn composables into images, but they rebuild for every picture, so they can't keep up with an agent's edits.

**Prevue takes you out of that loop.**

## With Prevue

### Your agent checks its own work

Prevue redraws the Preview about a second after each save and hands that picture to the agent.
Give it a design — a Figma frame, a screenshot, a mockup — and it edits, looks, compares, and edits again on its own. You come back to a finished screen and confirm it in your browser.

```
Make the ForYouScreen header match this screenshot
```

Same loop, but now you're outside it.

<p align="center">
  <img src="assets/agent-loop.png" width="880"
       alt="The UI fix loop with Prevue. The developer stays outside the loop: they hand the coding agent a goal and a reference, the agent edits and saves, Prevue renders a PNG in about a second, and the agent compares it with the reference and loops on its own. When it's done, the developer reviews the same Preview in the browser">
</p>

Screens that only change when you tap or drag are covered too. The agent switches the Preview into interactive mode, sends touches, and gets the new picture back.

### When you look, it's already there

Save, and the Preview redraws in about a second without Gradle. Change only a value — padding, a color, a string — and it takes about 0.2 seconds.
The agent and you look at the same Preview, so "it's done" and "I see it" happen at the same moment ([Benchmark](#benchmark)).

### Point instead of explaining

Click anything in the Preview and tell your agent what to do with it. No screenshots, no "the second card from the top."

```
Tighten the padding on this
```

The agent reads "this" as a file and line. `@path#Lline` is also copied to your clipboard, so you can paste it into a terminal.

The click pins a box and a file:line tag right where you pointed.

<p align="center">
  <img src="assets/point.png" width="760"
       alt="Pointing at the title of a news card in the workspace. A blue box surrounds the title, and the tag above the box reads NewsResourceCard.kt:230 with a copied check">
</p>

### Three agents, still light

Every worktree gets its own lightweight Prevue daemon. One daemon uses about 1.4GB, 83% less memory than Android Studio.

Even when two agents save at the same time, each window redraws on its own, and when only one saves again, the other stays put.

<p align="center">
  <img src="assets/worktrees.gif" width="1000"
       alt="Two Chrome windows for two worktrees of the same repository, each with its own daemon and its own address (main and feature/big-cards) and a terminal strip for the agent working there. Both agents save at the same time — the left changes the header color to purple, the right changes the headline to Big cards, big sips — and each window redraws on its own with the prevue wait result printed below. Then only the left saves again, turning the header orange, and the right window stays as it was">
</p>

## Get started

Installing takes two commands.

If Android Studio Ladybug (2024.2) or newer is installed, there's no Java to set up, even if your project uses JDK 17. Older Android Studio releases bring Java 17, which the preview server can't run on. Without Android Studio, install JDK 21 or later and set `PREVUE_JDK` to its path, and install the Android SDK with at least one platform (set `ANDROID_HOME` if it isn't at `~/Library/Android/sdk`). You also need the macOS Command Line Tools (`python3`); if they're missing, the agent opens the installer for you.

```sh
# Claude Code
claude plugin marketplace add https://github.com/kakao/prevue.git
claude plugin install prevue@prevue

# Codex
codex plugin marketplace add https://github.com/kakao/prevue.git
codex plugin add prevue@prevue
```

Then tell your agent the file name. Calling the skill directly is more reliable: `/prevue` in Claude Code, `$prevue:prevue` in Codex.

```
Show the Previews in ForYouScreen.kt
```

There's nothing to configure. The first time you run it, the agent does the setup it needs, checking with you as it goes. When it's done, your browser opens with every `@Preview` in that file.
Prevue doesn't change your project's build files, plugins, or tasks, and it doesn't add files to your project. Gradle runs only once per module; after that, even edits to shared modules redraw right away.

### Update

Refresh the marketplace info first, then update the plugin. If you skip this step, it reads the old version info and says it is already up to date.

```sh
# Claude Code — takes effect after a restart or /reload-plugins
claude plugin marketplace update prevue
claude plugin update prevue@prevue

# Codex — there is no update, so run add again
codex plugin marketplace upgrade
codex plugin add prevue@prevue
```

Changes are in [CHANGELOG.md](CHANGELOG.md).
If you get stuck, ask your agent to read `prevue log`. If that doesn't help, [let us know in an issue](https://github.com/kakao/prevue/issues/new?template=not-working.yml).

## A closer look

Press `?` in the viewer for every shortcut.

### Every Preview on one board

Every `@Preview` in a file is laid out on the board, grouped by function. Save, and they all redraw, with the time it took shown in the header.

<p align="center">
  <img src="assets/hero.png" width="50%" alt="The board with the Previews of nowinandroid ForYouScreen.kt laid out in groups by function. The header shows the app name, folder, branch, module, and variant, with a check pill on the right. The open files list on the left has ForYouScreen, InterestsScreen, and NewsResourceCard, and each group header shows its count and zoom"><img src="assets/board-pearl.png" width="50%" alt="The board for ComponentPreviews.kt of the Pearl bubble tea app. The first group shows a button, filter chips, sweetness options, topping toggles, the bottom nav bar, and bag badges, with the drink detail screen below it. The page is open in a Chrome tab">
</p>
<p align="center"><sub>Left: <a href="https://github.com/android/nowinandroid">Now in Android</a> (Apache-2.0) · Right: Pearl, the sample app in <a href="fixtures/pearl"><code>fixtures/pearl</code></a></sub></p>

### Interactive mode

Press a card's `▶` to open it large. You can change the screen size or the device (six Android, four iPhone, foldables that fold) without touching the source.
Like Android Studio's Interactive Mode, click and drag to check motion and animations.

<p align="center">
  <img src="assets/interactive-nav.gif" width="33.3%" alt="In the workspace, tapping the bubble tea app's bottom nav in the order Home, Orders, Saved, Profile, Home slides the orange pill over and expands the label of the chosen tab as the screen changes"><img src="assets/interactive-header.gif" width="33.3%" alt="In the workspace, tapping the Fruit tea, Milk tea, Matcha, and All chips in turn spreads that category's color across the header, drops the cup out and bounces a new one in, changes the headline, and filters the grid below"><img src="assets/interactive-detail.gif" width="33.3%" alt="In the workspace, tapping the Taro Milk Tea card grows the card to fill the screen while the cup flies separately into its spot on the detail screen. Add to bag sends the cup flying into the bag at the top right and the badge pops, and the back arrow plays it in reverse back to the card">
</p>

<p align="center">
  <img src="assets/interactive-cup.gif" width="33.3%" alt="On the detail screen, Ice Extra opens the lid and drops ice in so the drink rises, Pearls Extra pours pearls in a curve, and None flings them off screen. Dragging the cup side to side sloshes the drink, and Sweetness 0% and 100% make its color lighter and then deeper"><img src="assets/devices.gif" width="66.6%" alt="Changing devices from the panel on the right of the workspace. On S26 the options sit under the cup. Unfolding iPhone Duo splits it into the cup on the left and the options panel on the right. Fold goes back to a single column on the cover screen, unfolding splits it again, and on Pixel Tablet the cup and panel also sit side by side">
</p>

### Quick open

Switch between a screen file and its component files while you edit, and the open files stay in the list on the left. `/` or `⌘K` finds a file by name, initials (`fys` → `ForYouScreen.kt`), or Preview function name.

<p align="center">
  <img src="assets/files.gif" width="1000"
       alt="In the viewer showing ForYouScreen, pressing / opens quick open. Typing topic lists TopicScreen.kt along with rows where a Preview function name matched, and Enter opens it. Then / again and the initials nrc find NewsResourceCard.kt. Each opened file stacks up in the open files list on the left, and the 1 and 2 keys jump back to ForYouScreen and TopicScreen">
</p>

## Benchmark

Top, the same work in Android Studio and in Prevue. Bottom, how fast each kind of change shows up.

<p align="center">
  <img src="assets/benchmark-vs.png" width="1000"
       alt="Android Studio vs Prevue on nowinandroid ForYouScreen.kt — Hot Swap 4.3s vs 2.1s (−51%), First Preview 12.1s vs 8.0s (−34%), Memory 8.1GB vs 1.4GB (−83%), Disk 3.2GB vs 446MB (−86%)">
</p>

<p align="center">
  <img src="assets/benchmark-redraw.png" width="1000"
       alt="How fast Prevue redraws — literal edit 0.23s, resource value 0.22s, code edit 0.90s, whole board 2.07s, switch module 0.33s, change device 0.92s, and about 54 fps while dragging">
</p>

- **Setup** — Apple Silicon, 14 cores · 36GB RAM · nowinandroid `ForYouScreen.kt` (25 Previews). Android Studio 2026.1.3 was measured on 2026-09-22 and Prevue (develop `feb5c6e`) on 2026-10-23. Prevue values are medians
- **Hot Swap** — From save until all 25 show the new picture. The first one appears at 0.9 seconds
- **First Preview** — Android Studio from opening the project, Prevue from starting the daemon, until the first render finishes
- **Memory** — Android Studio is the IDE plus the Gradle daemon at one moment; Prevue is the memory use of its one daemon after 10 saves. Going back and forth between modules for a long time, it peaked at 1.6GB, and it shuts itself down after 10 minutes without use
- **Disk** — The Android Studio app bundle vs `~/.prevue/toolchain`. With JDK 25 or later Prevue also keeps a class cache of about 200MB in `~/.prevue/aot` that makes the daemon start faster
- **How fast Prevue redraws** — Literal and resource-value saves skip compilation. Switching modules and changing devices are measured until the new picture is ready. Interactive is the frame rate on the viewer stream while dragging a feed

## Commands

These are commands the agent calls, so you rarely type them. The executable is `bin/prevue` in the directory where the plugin is installed.
See every command and exit code with `prevue --help`, and each command with `prevue <command> --help`. Four are worth typing yourself.

| Command | What it does |
|---|---|
| `prevue open` | Reopens a closed viewer in the browser |
| `prevue stop` | Stops the daemon started in that repository (`--all` stops every running one) |
| `prevue log` | The daemon log — ask your agent to read it when you're stuck |
| `prevue paths` | Where the toolchain, dumps, and outputs live and how much space they take — for finding what to delete |

## Supported

| Works | Doesn't work |
|---|---|
| Android modules (app · library) | Pure JVM modules |
| Debug-type variants. Picked by Android Studio's default Build Variants rules; ask your agent for another | Release variants |
| Top-level `@Preview` functions. Multipreview and `@PreviewParameter` are expanded too | Member Previews declared inside a class |
| Composables that draw without a real device | Previews that need a DI container or `AndroidView` — shown with the failure kinds `DI` · `ANDROID_VIEW` |


## License

This software is licensed under the Apache 2 license, quoted below.

Copyright 2026 Kakao Corp. http://www.kakaocorp.com

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this project except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
