# ERRORS — Academic Code Review System

Running log of errors hit during development and what fixed them.
Upload this each session so the AI doesn't suggest the same broken fix twice.

---

## Format

```
### Short description of the error
**Phase:** which phase you were in
**Error:** exact error message or stack trace
**Context:** what you were doing when it happened
**Fix:** what resolved it
**Status:** FIXED | OPEN
```

---

## Log

### Used Material UI instead of shadcn/ui
**Phase:** MVP Frontend Scaffold
**Error:** N/A (User Preference/Requirement)
**Context:** The prompt mentioned using "Rich Aesthetics" which typically might involve shadcn, but user requested Material UI instead.
**Fix:** Installed `@mui/material` and `lucide-react` and wrote custom Tailwind layout components to match the aesthetic requirements without using shadcn/ui.
**Status:** FIXED

### Zod Resolver Generic Type Mismatch
**Phase:** Phase 2: Monaco Submission Interface
**Error:** `Type 'Resolver<... anonymous?: boolean | undefined ...>' is not assignable to type 'Resolver<... anonymous: boolean ...>'`
**Context:** When using `.default(false)` on a boolean schema field inside `react-hook-form` with `@hookform/resolvers/zod`.
**Fix:** Removed `.default(false)` from the schema and relied on `useForm`'s `defaultValues` to supply the initial false state. This matches the strict exact types required by `useForm`.
**Status:** FIXED

### Monaco Types and MUI slotProps Issues
**Phase:** Phase 3: Code Review & Plagiarism
**Error:** `TS2739: Type '{ isWholeLine: true; ...' missing properties` and `Property 'inputProps' does not exist on TextField`
**Context:** Pushing dynamic options to `EditorType.IModelDeltaDecoration[]` without explicit typing caused inference to expect all properties. MUI v6 deprecated `inputProps` for `slotProps.htmlInput`.
**Fix:** Explicitly typed the decorations array as `EditorType.IModelDeltaDecoration[]` and switched to `slotProps={{ htmlInput: ... }}`.
**Status:** FIXED

### Phase 4 Monaco Print Workaround
**Phase:** Phase 4: Student Feedback & Print
**Error:** None (Proactive Workaround)
**Context:** Monaco editor uses extreme DOM virtualization, meaning standard `window.print()` only captures the lines currently visible in the scroll viewport.
**Fix:** Created a duplicate `<pre><code>` DOM block mapping the entire code string and inline comments. Used CSS `@media print` to hide the Monaco canvas and display the static HTML block during printing.
**Status:** FIXED

### 404 on Dashboard Navigation (Route Groups)
**Phase:** Phase 4: Final Polish
**Error:** `404 Not Found` when navigating to `/student/assignments` or `/faculty/assignments`.
**Context:** Next.js route groups `(student)` and `(faculty)` were used, which bypasses the URL segment. So the app was serving `/assignments` instead of `/student/assignments`, causing conflicts and 404s when the code expected the prefix.
**Fix:** Renamed the folders from `(student)` and `(faculty)` to `student` and `faculty`, making them standard route segments and properly separating the URL paths.
**Status:** FIXED

### Next.js Route Group vs URL Mismatch
**Phase:** Phase 4: Route Polish
**Error:** 404s on "View Feedback", "View Submissions", and "Plagiarism Check".
**Context:** When attempting to fix earlier route issues, the `(student)` and `(faculty)` route group folders were completely renamed. However, the application navigation logic relied on `app/(student)/student/...` and `app/(faculty)/faculty/...` which applies the layouts via the route group while preserving the URL prefix `/student/` and `/faculty/`.
**Fix:** Restored the strict route group nesting (`app/(student)/student` and `app/(faculty)/faculty`) and ensured the layouts reside in the route group root.
**Status:** FIXED
