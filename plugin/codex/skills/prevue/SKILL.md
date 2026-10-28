---
name: prevue
description: Renders Jetpack Compose @Preview in the browser, lets you edit it and check the result yourself, and reads what a person points at on screen as a file and line. Use it when changing Compose UI or matching it to a mockup or screenshot, when asked "how does it look", and when the user points at something on screen with words like "this" or "here". Also use it when asked whether the preview is ready ("is the preview ready?") or told to prepare the preview (read the build settings).
---
<!-- 생성물이다. skills-src/prevue/SKILL.md 를 고치고 tools/gen-skills.sh 로 만든다 -->

# Prevue

Renders `@Preview` headlessly, without Android Studio, and shows it in the browser.
The point is for **the person and the agent to fix the UI while looking at the same preview**.
Save → a new image in about a second with no build, so you can run **the loop of looking and fixing yourself** several times before showing it to the person.

The executable is `$PREVUE/bin/prevue`. `$PREVUE` = the directory this plugin is installed in — three levels above this `SKILL.md` (`../../..`).

**The CLI explains its commands and response fields** — `prevue --help` gives the command list and exit codes, `prevue <command> --help` gives that command's arguments and response.
It answers right away without the daemon, so when you don't know something, run it first. This skill only holds the order of steps and the rules for asking the person.

**Don't pass a port.** `prevue` finds the repository and daemon from the file path in its arguments. If a command that takes no file (`status` · `board` · `touch`)
refuses because it can't tell which repository you mean, call a command that takes a file (`prevue show <file>`) once, or run it from inside that repository.

## Talking to the user

**Speak the user's language** — the language the user writes to you in, whatever language this skill or the CLI uses.
The language of this skill, of CLI output, or of code and UI strings quoted in the request doesn't change it — a request that quotes a string in another language still gets its reply in the request's own language.

The CLI's `ask` (a question to put) and `tell` (a message to pass on) are written for the person. Pass them on **in the user's language**:
if the sentence is already in that language, use it word for word; if not, translate it faithfully — **every clause, nothing dropped, nothing added**, same meaning.
**Don't translate `options` values or commands** — they go as-is into the `<…>` slot of `next`.
The sentences this skill quotes for you to say (the questions and replies below) are what to say, not the words — say them in the user's language too.

A response's `error` · `why` are sentences for you, the agent (the one exception is a failed prepare command — below). Never use the words **"dump" · "classpath" · "daemon" · "toolchain"** with the user, nor their equivalents in the user's language —
say "preview server", "read the build settings", "download components" instead. Don't mention exit codes, skill names, response fields such as `missing`, or download sizes either.
Tell the user only **what is ready and what is left**. Never mention this skill, its rules, or Prevue's procedure as a reason — just say what you'll do and ask what you need.

## When you don't know what to show

If only the skill was invoked with no target — no file, composable, or screen name in the request, and no Compose file you were editing in this conversation —
don't search the repository or guess from `status`. **Ask right away**, in the user's language:

> Which screen should I show? Tell me the path of a Kotlin file with `@Preview`, or a composable name.

If you get only a name, find the file by that name and run `prevue show`. If there are several candidates, show their paths and let the person choose.

## Showing it

```bash
prevue show <absolute path of the file> --lang <code>
```

**Pass the user's language as `--lang`** (`ko`, `en`, … — the language you speak with the user) on `show` and `open`, so the viewer opens in it. The CLI carries it into `next` · `then` and the `viewer` address.

**Judge success by the exit code.** 0 means everything rendered. 1 means: say the names of the cards whose `ok` is false, with their `failure` · `message`.
If you were asked to show it, don't open the images — say how many rendered and give **the viewer address (`viewer`) as a link**. Never end with "check it in your browser" without the address.
If the person says they can't see it or shows a connection error, the daemon has gone down. Start again with `prevue show <file>`.
Read the PNGs **only when you need to see them** — when fixing UI or matching a mockup, or when the user asks how it looks. Even then, open only the relevant cards.
**Don't ask for the module name, and don't look through the repository structure or build files first.** `prevue` finds the repository and module from the file path.

### Exit code 3 — not ready yet

The response has the same shape as `prevue health <file>`. `missing` lists everything missing, `next` (and `then`) are the commands to run, and **the response also carries what to say to the person** — `ask` (the question to put) · `options` (the choices) · `tell` (the message to pass on, then stop).

```json
{"ok":false,"module":":feature:foryou:impl","variant":"demoDebug","variantChosenBy":"fresh","toolchain":true,
 "classpath":null,"resourcesFrom":":app","daemon":false,"missing":["dump","daemon"],
 "next":"prevue warmup /abs/ForYouScreen.kt --resources-from :app",
 "ask":"This is the first time opening this module, so the project's build settings need to be read once. It may take a few minutes, and no project files are changed. Shall I go ahead?"}
```

- **If there is an `ask`, put that question to the user (in their language, per "Talking to the user"). That question is your whole message, starting from its first clause.** Each clause of the `ask` stays as its own claim — nothing replaced, nothing added before or after it; end your turn with that question. The choices are the `options` if there are any, otherwise **"Proceed (required)"**, and either way add **"Stop — the preview can't be used"** — both labels in the user's language. Don't mark any as Recommended — it is a required condition, not a preference
- **If approved**, run `next` (putting the chosen `options` value in the `<…>` slot). If there is a `then`, run it next, and keep going until the last response's `next` (`prevue start … --show <file>`) — that response is the image. If an intermediate response carries another `ask` (something is left to choose after Gradle), ask it by the same rule
- **If declined, stop.** Don't go around it (another command · bypassing permissions); only say "ask again when you need it"
- **If the user told you in this conversation to read the build settings or prepare the preview, that is the consent** — run `next` without asking. But if `missing` has `toolchain`, ask. "Show it" · "let me see" is not an instruction to prepare
- If the person asks to know more, answer then from the section of that command's `--help` for when the person asks more (headed `If the person asks more`). Don't bring it up first
- If `next` is `xcode-select --install`, an install window opens and **the person finishes the install in that window** — say "tell me when the install is done" and wait. If the command fails, don't work around it; ask them to run it in a terminal themselves
- If a prepare command (`setup` · `warmup`) fails, show the response's `error` and the Gradle output above it **as is, not paraphrased** — it is diagnostic material
- **If there is a `tell`, pass it on and stop.** Don't run `start`
- If `missing` is **only `["daemon"]`**, run the `prevue start …` in `next` as is. Don't assemble it yourself. The browser opens, so don't say "go to this address". If the module isn't in the running daemon's app, `start` launches another one on a new port — tell the person the new viewer address
- If the response has `startNeedsEscalation: true`, run the `start` in `next` outside the sandbox from the start. `start` normally runs inside the sandbox. `opened: false` means opening the browser was blocked — don't ask for escalation; give the `viewer` address as a link
- **Run `setup` · `warmup` outside the sandbox (with escalation) from the start.** Gradle writes to `~/.gradle`, so inside the sandbox it always fails. If any command returns `needsEscalation: true`, run the same command again outside the sandbox. Don't dig through logs or scripts
- If there is only an `error` and no `missing`, the repository or module wasn't found. Tell the person as it is

**Don't run `prevue setup` · `prevue warmup` without approval.** If the person asks "is it ready?", run `prevue health <file>` and answer from it.

#### Codex sandbox (`sandbox` in `missing`)

The `ask` states the values to add · that it applies globally · that a restart is needed, and asks for consent. If `sandbox.restartNeeded`, only a `tell` comes, no `ask` — pass it on and stop. On consent, **read `sandbox.config` first** and merge only the values needed — don't rewrite the whole file.

- In `writable_roots`, put the expanded absolute path written in the `ask` (don't write `~` as is)
- If there is neither a `[sandbox_workspace_write]` table nor top-level dotted `sandbox_workspace_write.…` keys, append the whole table at the end of the file. If the file doesn't exist, create it with only this table
- If there is one, set `network_access` to `true` in it, and **append** the path to the `writable_roots` array only if it isn't there. Don't touch existing elements · other keys · comments

It is a file outside the workspace, so write it with escalation. Give the request reason as "Add the Prevue sandbox settings the user agreed to — merge three lines only". **If denied, don't work around it** — give the values to add and the file path and ask them to add it themselves. Then pass on the `tell` (if you asked them to add it themselves, begin it with "After adding the settings above" in the user's language — the one addition to a `tell`) and **stop** — run no more prevue commands in this session.

## After editing, get the result with `wait`

The file watcher catches the save and redraws. **After saving, call `prevue wait <saved file>` and judge by the image in that response** — don't call `show` again, or read `status` after a `sleep`.
If the exit code isn't 0, the image may not be from this save — read `failure` · `message` (`prevue wait --help`).
For `COMPILE`, fix the code. For failures this tool can't fix, like `DI` · `ANDROID_VIEW`, tell the person and stop (`prevue failures --help`).
**If you added or changed resources (values such as strings.xml under `res/`), check the response's `stale.resources`.** If it is there, the image is from before the save — don't move on; run `prevue health <preview file>` and follow the "Exit code 3" rules above (`next` if approved, `ask` if not). Move on only when the redrawn image has no `stale`.

When matching a mockup (Figma frame · screenshot · mock), compare the rendered PNG with it and fix again if they differ. Fetching the mockup is not Prevue's job.
**Prevue's rendering is deterministic — the same picture gives a byte-identical PNG, and different bytes mean a different picture.** Don't write it off as file metadata; find where it differs.
What to compare against and when to stop is up to the task and the user. When done, show it to the person along with what you matched and what is left.

## Trying the screen out

If you need to see the screen when pressed · scrolled · typed into, turn that card on with `prevue focus <index> --on`, and **aim at a line of code instead of coordinates** —
`prevue touch --at <file>:<line>` · `prevue type "<text>"` (first `touch --at` that field) · `prevue scroll`. The response is the settled image — `settled:false` means the image at the moment it didn't settle within 3 seconds.
Exit 2 means there are several nodes on that line (list items) — pick from `matches` and run again with `#N`. A list item's `#N` is the Nth in the whole list. When done, turn it off with `--off`.
**For layouts that depend on screen size** (narrow width · unfolded foldable), don't edit the source; give the card that is on `prevue focus <index> --size 320x640` · `--device fold8 [--folded] [--landscape]` (`--help` lists them). The current size is `status`'s `size` — a size the person picked in the viewer shows up there too.
**Use `--until` to find, scroll big to survey.** If you are looking for something, `prevue scroll --until "<text>"` (text in semantics text · contentDescription) or `--until <file>:<line>#N` (for a list, the same index as `touch`) — it stops where it is fully visible (default cap 10 screens), and you put the response's `found.at` straight into `touch --at`. No need to open the image. If not found, it exits 1 with `found:null`; if `container.canScrollForward` is true, run it once more. Text drawn without semantics (a wheel picker's `drawText` etc.) can't be found by text, so find it by line. To survey what is there, scroll big like `prevue scroll 3` and read the response — items passed on the way are in `passed` — `prevue scroll` (one screen) · `prevue scroll -1` (up) · `--horizontal` (sideways) · `--at <file>:<line>` (the list · scroll area to scroll; required when lists sit side by side). `moved:false` means the end. The response's `appeared` · `disappeared` tell you what came in and went out (text · role · `at`), and `container` gives the list's `total` · `first` · `last` — read them before opening the image again. **Don't repeat `touch` press · drag to scroll a list** — each call is a separate gesture and it jumps around on the person's screen.

## Reading what the person points at

When the user uses **words that point at the screen** like "this", "the padding here", "this text", don't guess — read `prevue selection` first (`--help` gives the fields).
**If it is empty (exit 1), end the turn with the question — edit nothing**, even when the file seems to have only one candidate. Ask them *to click that part in the preview* and wait for the click. Don't add why you are asking (this rule).

## Don'ts

- **Don't call Gradle.** Once Gradle is in the save loop, the one-second budget is gone on the spot
- **Don't edit build files.** This tool rests on planting nothing in the target repository
- **Don't restart the daemon by hand.** The exception is when `stale.remedy` says so — if it says `prevue warmup`, run `prevue health <file>` and ask with its `ask`. Moving to another module is not a restart (`show` handles it)
- Don't say "fixed" based on an image that has `stale` on it
