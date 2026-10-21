# Deska: el registro de cambios, en su propia voz

Fuente: los releases oficiales (`0xPasho/deska-releases`), 62 releases; 32 con notas de verdad.
Las notas están **en su propia voz**: no son marketing, son decisiones.

## v0.0.6 · 2026-06-15

Deska 0.0.6

- Switch workspaces instantly with Cmd/Ctrl and a number key (1-9, 0)
- Workspaces now use clean colored icons you pick from a curated set
- Embed Twitch, YouTube, SoundCloud and more as clean borderless panels
- Single widgets like notes, to-dos and the timer lose the tab bar for a cleaner look
- Onboarding now groups starter workspaces by category
- Dock tab bars scroll smoothly when you have many panels open
- The model picker now shows each model with its brand icon

Builds: macOS (Intel + Apple Silicon) and Linux (x64). Windows pending CI.

## mobile-v1.2.0 · 2026-08-10

Deska mobile 1.2.0.
- `deska-1.2.0-android.apk`: direct install on Android (sideload).
- `deska-1.2.0-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.3.0 · 2026-08-12

Deska mobile 1.3.0.
- `deska-1.3.0-android.apk`: direct install on Android (sideload).
- `deska-1.3.0-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.3.1 · 2026-08-13

Deska mobile 1.3.1.
- `deska-1.3.1-android.apk`: direct install on Android (sideload).
- `deska-1.3.1-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.3.2 · 2026-08-13

Deska mobile 1.3.2.
- `deska-1.3.2-android.apk`: direct install on Android (sideload).
- `deska-1.3.2-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.4.0 · 2026-08-14

Deska mobile 1.4.0.
- `deska-1.4.0-android.apk`: direct install on Android (sideload).
- `deska-1.4.0-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.4.1 · 2026-08-14

Deska mobile 1.4.1.
- `deska-1.4.1-android.apk`: direct install on Android (sideload).
- `deska-1.4.1-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.5.0 · 2026-08-16

Deska mobile 1.5.0.
- `deska-1.5.0-android.apk`: direct install on Android (sideload).
- `deska-1.5.0-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.10.0 · 2026-09-17

Deska mobile 1.10.0.
- `deska-1.10.0-android.apk`: direct install on Android (sideload).
- `deska-1.10.0-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.11.0 · 2026-09-20

Deska mobile 1.11.0.
- `deska-1.11.0-android.apk`: direct install on Android (sideload).
- `deska-1.11.0-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.13.0 · 2026-09-28

# Deska mobile 1.13.0

27 September 2026

- The Inbox opens on tasks that need you, running work and tasks finished in the last 24 hours.
- Earlier keeps older work available in pages of 30 tasks.
- Search the Inbox by task title, project, branch, agent or computer.
- Filter the Inbox to one computer or workspace.
- Dismiss a failed task from the phone to settle it on its computer too.
- Changes opens a file list so you can review one diff at a time.
- Review marks added, deleted and renamed files, including the original name of a renamed file.
- Binary files appear as a single row instead of an empty diff.
- Move between changed files with Previous and Next, or turn on Wrap for long lines.
- Opening a sleeping Deska Cloud computer wakes it and shows each connection stage.
- Remembered workspace contents stay visible while the computer wakes.
- Switching tabs keeps your place and avoids redrawing every screen while agents work.
- Tables in agent replies render as tables on the phone.
- Accounts opens with one header and returns to a valid workspace screen.
- Antigravity appears in agent selectors when it is available on the connected computer.

For the new diff details and agent support on your own computer, update Deska desktop to 1.17.0.

Android downloads include the APK for direct installation and the AAB for Google Play. iOS ships through TestFlight or the App Store.

## v1.17.0 · 2026-09-28

# Deska 1.17.0

27 September 2026

- Antigravity joins the Panel Library as a terminal running Google's agy CLI.
- Tasks can run on Antigravity with streamed replies, approval cards and conversation resume.
- Dex can answer through the Antigravity agent signed in on your computer.
- Hold the talk key in another app to use voice while Deska stays in the background.
- On macOS, holding the talk key in another app's text field types your dictation there.
- A small voice pill shows Dex listening or answering while you work in another app.
- First-time voice setup walks you through the permissions needed to dictate.
- Hands-free Dex stays in the bottom capsule while clicks and Escape keep working in your panels.
- Settings > Dex > Act without asking controls whether Dex confirms actions before running them.
- The arrow beside Dictate opens recent dictations so you can insert one where you are typing.
- Recordings stay in dictation history when transcription fails, with Retry transcription.
- Dictation finishes into your history even if you close the field you were dictating into.
- Silent recordings no longer become a transcriber refusal pasted into your text.
- Dex recognizes his name more reliably when the transcriber hears it as "that's".
- The gauge under Ask Dex shows remaining usage for your Claude Code, Codex and Cursor accounts.
- Open the usage gauge to see every limit window and when its allowance resets.
- The usage gauge warns when your current pace would exhaust a limit before it resets.
- Panel headers show a persistent description of their contents beneath the title.
- Panel descriptions run through your own agent on every plan, including Free.
- Panel descriptions survive restarts so your canvas keeps its context when you reopen it.
- Panel descriptions stay visible while a refresh is pending.
- Panel headers show current activity separately from their description.
- Reduced effects in Appearance makes glass surfaces opaque and turns off background blur.
- New tasks load saved agent instances at startup instead of showing an empty picker.
- Saving agent settings refreshes the task picker in the same window.
- A task picker that cannot load your agents offers Retry without losing your draft.
- Tasks use the exact agent instance you selected, including its custom executable path.
- Subagent lists close when all their work finishes.
- Question cards close after your answers are accepted.
- Questions with multiple steps keep your earlier choices when you type the next answer.
- OpenCode starts correctly when its listening message omits the OpenCode prefix.
- Remote Access resumes after you sign back in instead of repeatedly retrying expired credentials.
- Changes sent to the phone identify renamed files without losing their diffs.

## mobile-v1.14.0 · 2026-09-30

Deska mobile 1.14.0.
- `deska-1.14.0-android.apk`: direct install on Android (sideload).
- `deska-1.14.0-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.15.0 · 2026-10-02

# Deska mobile 1.15.0

2 October 2026

- The app opens out of the Deska mark in one smooth movement, in your light or dark theme from the first frame.
- With Reduce Motion on, the launch fades instead of opening.
- Home lists your workspaces under the computer each one is on, with the latest task in each.
- The coral count on Home now counts only approvals and questions waiting for you.
- Failed tasks are one quiet row on Home that opens the Inbox, where their reasons and Dismiss are.
- A task cut short because Deska restarted reads Interrupted, in gray, with Continue in the thread.
- Every number on Home opens the list it counts.
- A computer's page has New task as the + in its header, always in reach.
- A computer's page shows six workspaces, busiest first, with the rest under More.
- Projects hidden on a computer's rail wait in a Hidden fold at the end of its list.
- Tapping a workspace's name opens rows for New task, New panel, its worktree, All tasks and its computer.
- A task's details open as rows: its changes, pull request, workspace, computer, agent and model.
- A task's composer is one field holding attach, model, run mode, mic and send.
- While a turn runs, Stop and Steer sit beside send.
- Tool calls fold into short summaries like "3 commands, 2 files" that open step by step.
- Tap a step to read its full command and what came back.
- The model's thinking is a step that says how long it took, such as "Thought for 12s".
- A proposed plan and the live checklist sit at the end of the conversation, where it opens.
- Choosing a model works like the desktop: pick the agent first, then one of its models.
- OpenCode's models are grouped by provider, and long model lists get a search bar.
- The run chip holds Thinking, Permissions and Build or Plan, and a running task can change its thinking level.
- New task opens as a sheet with the same composer and Start as its send button.
- Screens say when a computer is asleep or offline instead of spinning.
- Small gray link words became buttons and rows across the app.
- Settings and Usage both show the voice minutes you have left.
- Revoking a device or someone's access, and signing out, ask you to confirm.
- A failed connect, rename, removal, sign-out or checkout says what went wrong.
- Pairing with a code gives up after 30 seconds and says why.
- Start from will not reuse a folder name that is taken, and a clone keeps its own row if you close the sheet.
- A pull request has View on GitHub and one Squash, Merge or Rebase switch above Merge.
- On app.deska.dev, scrollbars follow your theme and the Deska mark shows while the page loads.

For the Hidden fold and how long a model thought, update Deska desktop to 1.20.0.

Android downloads include the APK for direct installation and the AAB for Google Play. iOS ships through TestFlight or the App Store.

## v1.20.0 · 2026-10-02

# Deska 1.20.0

2 October 2026

- Zoomed out below about 45%, the canvas becomes an overview where each panel shows as a picture of itself.
- Panning and zooming a desk with dozens of panels stays smooth at every zoom.
- In the overview, drag a card to move it, drag its edge to resize, or double-click it to zoom into that panel.
- Markdown files open as a rendered page, with Source, Split and Preview at the right end of the tab bar.
- Cmd/Ctrl+E flips a Markdown file between its page and its source.
- Markdown pages have an On this page outline, and Cmd/Ctrl+F finds words in the page.
- The Inbox has a Filter for status and agent, remembered between launches.
- While you dictate into a task, Transcribe and send stops, transcribes and sends your words in one press.
- Every finished reply from Dex or a task ends with Copy, which takes the whole answer as markdown.
- Typing / lists the agent's commands right after you open Deska, and in tasks you reopen.
- A new task on a Deska Cloud box offers the agents and models signed in on that box.
- Changing the model of a task running on another computer now reaches that computer.
- Quitting Deska stops the agents your tasks were running, except Cursor tasks for now.
- Closing Deska's last window quits it, instead of leaving it running with nothing on screen.
- Typing continue in a task after a restart picks up its conversation instead of starting over.
- An agent's thinking stops shimmering once it moves on, and says how long it took.
- A request the agent retries shows one notice that counts the attempts, not a card per attempt.
- A Codex task with subagents reads as running until the main agent finishes.
- Stop on a Codex task also stops the subagents still working for it.
- OpenCode models with reasoning levels get the effort control in new tasks and for Dex.
- Dex starts on the lightest reasoning level that still reasons.
- Settings > Dex > Background work turns off the summaries and titles your agent writes unasked.
- Dex on OpenCode acts on your panels again instead of only describing the change.
- Dex says when its agent ended without an answer instead of showing an empty reply.
- Dex hands a question to the next agent quickly when an OpenCode model keeps failing.
- When Dex's agent runs out of its plan, Dex shows that agent's own limit and when it resets.
- Asking Dex to close everything closes your panels and keeps pages like the Inbox and Source Control.
- Antigravity works with Dex and tasks on Windows, where it used to block every tool.
- Dex on Antigravity keeps its tools when you run agy yourself or start an Antigravity task.
- Dex says a spoken answer once and in one voice, without repeating it in a closing line.
- The voice pill shows the sentence Dex is saying, not the last line of the answer.
- When Dex points at panels, the rest of the desk steps back while every panel stays solid.
- A new browser panel offers to import your sign-ins from the browser and profile you choose.
- Point at part of a page with the browser's picker and ask Dex about it in one short line.
- Importing Chrome sign-ins on Windows says whether to quit Chrome or why its cookies cannot be read.
- Move notes… moves every note to a folder you choose, such as an Obsidian vault.
- Click anywhere on a changed file in Source Control to open its diff.
- Closing a tab to the left of yours keeps your tab in front.

The phone app changes from the same days arrive with Deska mobile 1.15.0.

## mobile-v1.16.0 · 2026-10-03

# Deska mobile 1.16.0

- Attach documents, source files and archives to tasks from the phone file picker.
- Preview shared task images inline and save output files from their cards.
- Preview PDF outputs in the native app.
- Play audio and video from Cloud computers in Files.
- Remove worktrees with a preview of what will be kept.
- Clean up worktrees that lose nothing in one confirmation.
- Codex tasks stay active while background subagents finish their work.
- Dex responds visually to your voice while you hold to talk.
- Lock dictation hands-free or slide to cancel it.
- Dex keeps its reply visible with links to the panels and tasks it touched.
- Updated startup, loading and connection states follow the app's color scheme.

The APK installs directly on Android. The AAB is for Google Play. iOS is delivered
through TestFlight and the App Store, subject to Apple's processing and review.

## v1.21.0 · 2026-10-03

# Deska 1.21.0

- Open images in the editor with fitted previews or an Actual size view
- Play video and audio directly in editor tabs, streamed from disk up to 2 GB
- Attach documents, code and archives to tasks from the file picker
- HEIC and TIFF attachments get image previews converted locally on your computer
- Shared task outputs appear as image previews or file cards you can save
- Color each canvas window to recognize it in a busy desk or the zoomed-out overview
- Remove a worktree from its switcher with a preview of what will be kept
- Clean up worktrees that lose nothing in one confirmation
- Deska keeps a 30-day recovery copy when removing worktrees
- Dex can remove worktrees or restore a branch from its recovery copy
- Tasks no longer get stuck on Preparing worktree when Git leaves stale worktree metadata
- Codex tasks stay active while background subagents work after the main reply
- Task conversations follow incoming replies smoothly until you scroll back
- Open commands and skills with the slash button beside the task microphone
- The model picker shows each configured agent's name and saved color
- Dex's agent picker shows provider logos and the selected remote computer's name
- Expand Dex to a larger conversation size that is remembered between uses
- Dex confirmations appear inside the conversation without hiding the thread
- The Voice panel records where each dictation went, with search and Copy
- Minimize the floating Dex pill without cancelling the work in progress
- The voice glow uses less processing power during dictation and spoken answers
- Cursor's usage meter shows remaining included dollars and on-demand spending
- On macOS, each Antigravity account gets its own remaining-usage meter
- Markdown search fits above the document without covering its contents
- Remote access settings show connection state beside the switch
- Windows agent installation always uses an explicit Windows command

## mobile-v1.18.0 · 2026-10-03

Deska mobile 1.18.0.
- `deska-1.18.0-android.apk`: direct install on Android (sideload).
- `deska-1.18.0-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.19.0 · 2026-10-03

Deska mobile 1.19.0.
- `deska-1.19.0-android.apk`: direct install on Android (sideload).
- `deska-1.19.0-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## mobile-v1.21.0 · 2026-10-04

Deska mobile 1.21.0.
- `deska-1.21.0-android.apk`: direct install on Android (sideload).
- `deska-1.21.0-android.aab`: the Google Play bundle (not directly installable).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## v1.26.0 · 2026-10-05

# Deska 1.26.0

- Dex finds the panel or task you mean in milliseconds, with a model that runs on this computer
- Ask Dex to take you to a panel by name and the canvas moves there as soon as you finish speaking
- First run asks to download Dex's 111 MB model, and Dex offers it once on a computer that had Deska
- Settings, Dex, Panel search downloads or removes Dex's model and shows how many passages it indexed
- The Panel Library's Discover lists panels made by other people, ready to install on your desk
- Installing a community panel first shows what it may do and the sites it connects to
- Community panels you install follow your account to every computer you sign in to
- Build a panel loads a folder you are working on and reloads it each time you save
- Accounts allowed to publish can publish a panel to Discover straight from Build a panel
- Coming back to a worktree leaves it exactly as you left it, without reopening the task's chat
- Drag a window to the outside edge of another to attach it, and it moves and resizes with that one
- Click a subagent in a task to open what it returned, its steps and its instructions beside the task
- A task's Changes opens in a window attached to the task's edge
- New task from the canvas's right-click menu opens where you clicked, not across the desk
- A panel made at a spot lines up with the panels right next to it, with an even gap
- Copy image on any picture on the canvas, in an editor tab or in a task puts it on your clipboard
- An image dropped on the canvas gets the editor's preview, with Actual size and its dimensions
- The agents in a task's model menu end with Add agent, which opens Tools & accounts ready to add one
- Add agent shows an agent you turned off as Enable and turns it back on instead of adding a copy
- A long Up next queue scrolls in place, so the conversation and the composer stay in view
- The new ? beside Settings opens our Discord, Report a problem, the docs and your keyboard shortcuts
- When none of your agents can answer, Dex says what happened in one line, with Open settings
- Dex still answers when a project's folder is missing, and names the folder
- Speech to text that hears Dets, Detz, Dext or Hey devs now writes Dex
- On Windows, a running task no longer fills Task Manager with Git processes
- A task set to Opus or Sonnet keeps its effort, fast mode, context and thinking settings again
- In light themes, the keyboard focus ring is dark enough to see on every surface

Community panels are made by their authors, not by Deska, and run in a sandbox on your computer. Installing one needs a signed-in Deska account; publishing is open to a small group of authors for now.

Dex's model is a 111 MB download that runs on this computer. The index sends nothing anywhere; what matches a question goes to your agent with it, like a panel Dex reads.

## mobile-v1.23.0 · 2026-10-05

Deska mobile 1.23.0.
- `deska-1.23.0-android.apk`: direct install on Android (sideload).
- iOS ships through TestFlight / the App Store and has no downloadable artifact here.

## v1.27.0 · 2026-10-06

# Deska 1.27.0

- Restart now turns into Restarting and Deska closes and comes back on the new version, without asking twice
- If an agent or a terminal is still working, Restart asks once before it closes Deska
- On macOS the Update Center waits on Preparing the update and says when your Mac will ask for a password
- A restart that comes back on the old version installs the waiting update without downloading it again
- Regions move by the tab with their name, and a click inside one works like the rest of the canvas
- Hovering a region's name shows the panels it holds, and panels you open inside a region move with it
- Pick a region's color from the dot by its name, and undo a region move or resize with Cmd/Ctrl+Z
- Deska reopens on the workspace you were in, on the computer it lives on
- A panel moved into a New Window stays above Deska instead of hiding behind it after the first click
- A task Dex starts opens its chat on your canvas, in a free spot, so you can watch it work
- Ask Dex for empty task drafts set to an agent and model, then tell it later what goes in each
- Dex answers in a sentence or two, and gives the long answer when you ask for the details
- Dex starts tasks on your project's default agent and model, and checks out the pull request you name
- A Claude Code task waiting on its subagents stays active and holds its finished notification until they return
- Implement on a plan, from the phone or from Dex, builds it instead of planning again
- A proposed plan card leaves the conversation once you send another message
- Cmd/Ctrl+Enter opens the next task draft on the same model and effort
- Open in Deska on deska.dev/panels opens that panel in your Panel Library
- Ask to publish in Build a panel opens the application on deska.dev instead of an email
- Build a panel links to the tutorial and to fourteen open source example panels on GitHub

The Windows installer is signed. Community panels still run only on the computer; the phone app shows them as such.

## v1.29.0 · 2026-10-07

# Deska 1.29.0

- A Store at the top right holds skills, bundles, panels and themes, with Focus time moved beside the minimap
- Install a skill or a whole bundle on this computer, a Cloud box or another computer in one press
- Choose whether a skill goes into every project on a computer or into one, and which agents get it
- Installed skills lists what each computer has, including skills added outside Deska
- A skill shows Update available when its author has changed it since you installed it
- Read a skill before installing it: its SKILL.md and files show right on its page
- Apply a theme from the Store, and Back to my look returns to exactly what you had
- Share my look sends your theme, accent and background to the Store for others to use
- Make your own bundle of skills and share it with a link
- Upvote the skills, bundles, panels and themes you like
- A phone or another computer can now install skills on this one
- The Store says you are offline only when you are; otherwise it says it did not answer

The Windows installer is signed. The phone gets the Store in its next update, and app.deska.dev has it today.

## v1.30.0 · 2026-10-07

# Deska 1.30.0

- Connections between Deska and your computers are end-to-end encrypted, so the relay in between cannot read them
- Add an API key to OpenCode on a Cloud box from here; it is only ever sent end-to-end encrypted
- Tasks and Dex run on OpenCode 2 as well as OpenCode 1
- The agent card says when npm skipped OpenCode's setup step, instead of a spawn UNKNOWN error
- On Windows, every Codex task can use the ChatGPT app's Computer Use while the app is running
- Plan mode turns on Antigravity's own plan mode instead of a warning on every plan turn
- A used-up Antigravity quota says so, with when it resets, instead of a raw API error
- An Antigravity turn refused because the account is signed out offers to sign in again
- Stop on a Windows Antigravity account ends a turn that does not stop within 15 seconds
- Typing /logout in a task no longer signs a Windows Antigravity account out behind Deska's back
- The model picker of a Windows Antigravity account fills in once its list arrives, without a restart
- Change account explains how to switch the computer's own Antigravity to another Google account
- An Antigravity settings file saved by Notepad no longer stops its tasks from starting

The Windows installer is signed. Encryption and OpenCode API keys need both ends on this release: the computer you reach and the app you reach it from. app.deska.dev has it today; the phone gets it in its next store update.

## v1.31.0 · 2026-10-08

# Deska 1.31.0

- Every email address in the app stays blurred until you click it, and a second click hides it again
- When an agent looks at a screenshot or another picture, the task shows it right in its steps
- A file or screenshot clicked in a task's reply opens in a window beside the task, not over the whole app
- A long command waiting for approval no longer pushes Approve once and the other answers out of the panel
- Deska uses far less CPU while agents work, because the running animations no longer load the main thread
- Typing in a long Dex conversation no longer redraws every reply above the box
- The Store opens on Discover, with featured stories, collections and clearer categories
- Pick a username in the Store and your profile becomes a page you can share at deska.dev/@username
- Edit profile in the Store changes your username, name, bio, website and social accounts
- Your Store profile shows a token activity graph and what those tokens are worth at API prices
- Point at a square of the token graph to see that day's models with their value and tokens
- A profile lists the year's tokens by model, each with its value and its share of the total
- Every bundle, theme and panel in the Store shows its maker's photo
- A maker's name on a bundle, theme or panel opens their Store profile
- People in the Store lists creators, and a Store search finds people by name or username
- Skills that fail a security audit on skills.sh are marked in the Store
- Installing a bundle warns you first when one of its skills failed a security audit
- Listing a bundle or sharing your look puts it in the Store right away, with no wait for review
- The account menu shows your account photo and opens your public profile
- Settings, Privacy has a switch to stop sharing token activity with your account
- The usage gauge under Ask Dex names the window it shows, like Week 45% or Session 69%
- The Update Center offers Dex's panel search model again after you answered Not now
- Dex no longer says out loud that a terminal agent is waiting, since idle agents were often misread
- If macOS refuses to prepare an update, the Update Center offers a manual download, not a password wait

The Windows installer is signed. Your account photo, public profile and token activity come from deska.dev, which is updated alongside this release.

## v1.32.0 · 2026-10-08

# Deska 1.32.0

- Choose your own profile photo: press the picture at the top of Edit profile and pick an image
- Remove photo takes the picture off your profile and shows your account's default picture
- Your uploaded photo also shows in the account menu
- Every account now has a Store profile, private until you turn on Make my profile public
- People in the Store ranks everyone by what their tokens are worth, with Top and New
- Signed in, your own row sits above the People list with your position
- The Store opens at once with what it showed last time, then refreshes behind it
- Your token activity now counts OpenCode and Antigravity, not only Claude Code and Codex
- The token graph marks the day from which your activity was counted in full
- Days before that line recede in the graph instead of looking like days without work
- Right after you install a skill, the Store no longer offers to update it
- Replies in a task grow with the panel instead of stopping at a narrow column
- Commands and notices in a task span the whole row, cut at the panel edge
- Right-click a misspelled word anywhere in Deska to see spelling suggestions and Add to Dictionary
- Community panels can keep their own files, save a file with the system dialog and copy images

## v1.33.0 · 2026-10-09

# Deska 1.33.0

- Ask Dex to open task panels inside a canvas region by its name, or in the region you selected
- Drag a sticky note onto a window's top-right corner and it stays pinned there as the window moves
- Attach to window in a sticky note's menu lists the windows that still have a free corner
- Community panels can show pages from the sites they declare, drawn by Deska in a frame of its own
- Before you install a panel, Deska names the sites it shows pages from, and an update adding one asks again
- A panel Deska verified can keep you signed in to its sites, in a session apart from the app and other panels
- Each panel's page in the Panel Library shows what it did here: sites reached, pages shown, permissions used
- Deska can block a site for every community panel at once, and computers stop showing it at their next check
- Text and pictures from community panels no longer reach Dex
- Images outside your workspace, like a PNG in Downloads, now open in document and editor panels
- Pictures Codex looks at or generates show their preview in the task instead of No preview

Community panels that show other sites need a version Deska approved; staying signed in needs a version Deska verified for it.

## v1.34.0 · 2026-10-12

# Deska 1.34.0

- The Inbox can show your Claude Code and Codex terminal conversations: pick Deska, External or All
- Terminal conversations in the Inbox are read only and say whether their activity is confirmed
- When an agent writes or links an HTML page, its turn ends with a picture of each page
- Click a page's picture to use it working beside the task, or switch to Code to read it
- A task stopped at a usage limit continues on the account you signed in to next, with its conversation
- Mute your microphone right after asking Dex and it still carries out what you already said
- Before a local clone, Deska shows the full destination and whether it makes a folder or reuses an empty one
- Clone remembers the last parent folder you used on each computer
- Model lists refresh while Deska stays open, and an agent update brings in its new models
- The Store is now called Marketplace, a place to discover and share community work
- People in the Marketplace ranks by Today, This week and This month
- Your token activity stays private until you press Show tokens in People, even if it was public before
- Hide tokens takes your statistics and ranking out of People while your profile stays public
- A community panel built for Extras shows one player in its panel and in its Extras row at once
- A community panel can keep playing from Extras after you close it, up to three at a time
- Open as panel now sits at the top of a panel's page in Extras
- On Windows, the ChatGPT app's Computer Use banner goes away when a Codex turn in Deska ends

External conversations stay read only in Deska: continue them in the terminal where they started.

## v1.35.1 · 2026-10-14

# Deska 1.35.1

A fix for 1.35.0. If you updated to 1.35.0 with a community panel installed,
Deska opened on an error screen at every launch and there was no way back from
inside the app. **Install this version over it and the app opens again.**
Nothing you made is lost, and you do not need to uninstall anything first.

- Fixed: updating to 1.35.0 with a community panel installed could leave Deska on an error screen every launch
- A window that cannot open now offers to repair itself, and keeps a copy of everything it sets aside
- A window that will not open also pulls the update on its own, so quitting is enough to land on the fixed version
- Deska clears data it saved on your computer only when it can rebuild it, and never your drafts or shortcuts on its own

1.35.0 saved the list of your community panels in a shape it could no longer
read after the update, and the whole window stopped on it. This version reads
that older shape correctly, and goes further: a window that fails to open twice
clears the data Deska can rebuild by itself before the next launch, keeps a copy
of anything it sets aside, and starts downloading the next version without
waiting for a click that nobody could reach.

## v1.36.0 · 2026-10-16

# Deska 1.36.0

Maximize on a canvas panel now gives that panel the whole Deska window: the rest
of the canvas, the bars and the sidebars step aside, still running, and Restore
puts everything back exactly where it was. Mouse side buttons work as shortcuts,
and a region's right-click menu is the full canvas menu.

- Maximize gives a canvas panel the whole window, and Restore puts the canvas back exactly as it was
- Cmd/Ctrl+Shift+Enter maximizes the panel you are in, and you can rebind it in Settings > Keybindings
- Double clicking an empty part of a panel's title bar maximizes it, and double clicking again restores it
- Right-clicking inside a region opens the full canvas menu, with New task, Pinned and the filter
- A panel you create from a region's menu lands in the region's first free spot, and the region grows to fit
- Mouse side buttons can be the key of any shortcut in Settings > Keybindings, alone or with modifiers
- Holding a mouse side button while turning the wheel zooms the canvas; Settings > Canvas turns it off
- In a browser panel, a mouse side button you have not bound goes back or forward in the page
- Opening Installed skills no longer shows a "computer is full" dialog for your own computer every few seconds
- Another computer with more than 10 workspaces shows its first 10 and says so once in notifications
- A community panel's install question and card name the same maker as its page in the Library
- The Submit page says which name people will see as the maker of your panel

This version also carries everything in 1.35.2, which was built but never
published.

## v1.37.0 · 2026-10-19

# Deska 1.37.0

Four more coding agents run as tasks in Deska: Pi, Hermes, Mistral Vibe and Kimi
Code, with their own logos, approvals, model pickers and separate accounts where
the agent supports them. Agents install and update in the background, each WSL
distro on Windows is a computer of its own, text in canvas windows can be
selected, and Dex answers sooner on Claude Code.

- Four more coding agents run as tasks in Deska: Pi, Hermes, Mistral Vibe and Kimi Code
- Muse Code is recognized in a terminal, with its badge and a notification when it needs you
- Agents install and update in the background, with progress on their card instead of a terminal
- An agent that needs npm on a computer without Node.js asks first, then installs Node.js too
- Connect account shows the sign-in code and page on the agent's card instead of opening a terminal
- On Windows, each WSL distro is a computer of its own, with its projects, terminals and agents
- Text in any canvas window can be selected and copied, like a task's transcript or a file it shows
- A project text file shown beside a task offers Edit, and saves in place with Save or Cmd/Ctrl+S
- When Dex answers with Claude Code it uses Haiku, so it replies sooner unless you picked its model
- With Background work on, Claude Code starts for Dex as Deska opens, so its first answer comes sooner
- A started task can continue with another agent or account, keeping its conversation and files
- Editing a message can switch the model: the earlier history comes along and your edit opens as a draft
- The model picker lists the newest models first in Claude Code, Codex, Antigravity, Kimi Code and Vibe
- The reasoning level you pick stays for that agent's next task instead of going back to Default
- The composer's settings chip names the permission, Build or Plan, thinking and fast mode with icons
- Appearance offers custom colors for windows, menus, borders, text and states, beside the accent
- Counts open what they count: "Restarting stops 2 working agents" lists those agents, each to its task
- Task warnings say what happened in your language, like which plan limit runs out and when it renews
- The Update Center keeps each tool, its new version and Update together in one compact row
- Hermes lists the models of every provider you set up in it, from its first task on
- Mistral Vibe offers its hosted models in the model picker once a task has started
- Hermes and Mistral Vibe can each keep a separate account on the same computer
- Settings > Agents says for each agent what Auto mode does, and that Pi runs its tools without asking
- Mistral Vibe never runs in a mode that asks less than the one you picked, and says why instead
- When an agent refuses a model you picked, the model chip goes back to the one that actually runs
- A second Hermes account starts signed out, even when your shell holds provider keys or a GitHub token
- Dex on Claude Code keeps working when its sign-in is set in Claude Code's settings file
- Your profile's token activity now also counts Pi, Hermes, Mistral Vibe and Kimi Code
- Today's token activity refreshes about every ten minutes instead of every six hours
- On another computer's desk, Commit & Push, Generate and Amend last now run on that computer
- In Settings > Dex, an agent that is not on this computer offers Install and Check again in its row
- On the free plan, a Dex turn that fails before Dex answers no longer counts toward the five a day
- Marketplace skills can be installed for Pi, Hermes, Mistral Vibe and Kimi Code as well
- Marketplace browses Skills, Bundles and Panels by category, with search and ordering in one row
- After buying Pro or Cloud, Deska leads you to a first task, with setup you can come back to
- A Claude Code installed with Anthropic's own installer now updates with claude update
- An editor in a dock or panel window of its own now saves with Cmd/Ctrl+S
- A subagent popped out of a task into its own window shows what it did instead of saying it is gone
- Pressing the canvas or another window takes the keyboard off the field you were typing in
- Copying your own message in a task now says Copied, like copying a reply

Pi runs its tools without asking for permission, and Kimi Code keeps one account
and a typed model name for now. A Deska Cloud box keeps the five agents its image
installs.
