# Atlas Backlog

This backlog captures MVP follow-up work after the current trainer and client flows.

## Priority 1 - Unified Workout Logging In Program Context

Problem:
The current client flow splits viewing assigned workouts and logging into separate pages. For MVP, logging should happen directly inside the selected workout program and selected day.

Goal:
A client opens an assigned program, selects a day, and logs workout entries for that day in one continuous flow.

### Item 1.1 - Program detail route for clients
- Add a client route for a single assigned program, for example: /dashboard/workouts/[programId].
- Show program summary, day tabs or day selector, and exercises for selected day.

Acceptance criteria:
- Client can open one program from assigned workouts list.
- Client can switch between Day 1, Day 2, Day 3 without leaving the page.
- Only assigned client can view their program detail.

### Item 1.2 - Day-specific log form inside program detail
- Add a log form in the same page, scoped to selected day.
- Log input fields: exercise name, sets, reps, weight, notes, date.
- Pre-fill exercise name from selected day exercises when user clicks an exercise row.

Acceptance criteria:
- Client can log directly from selected day view.
- Saved log includes references to program and day.
- User sees success/error feedback inline.

### Item 1.3 - Data model support for day-level logs
- Extend exercise_logs to include workout_program_day_id nullable foreign key.
- Keep workout_program_id for fast filtering.
- Ensure trainer and client RLS policies still apply.

Acceptance criteria:
- A log can be tied to a specific program day.
- Existing logs remain valid after migration.
- Trainer review can filter by program and day.

### Item 1.4 - Replace separate log entry page in nav
- Keep /dashboard/logs as history page or redirect.
- Main client action should be log from /dashboard/workouts/[programId].

Acceptance criteria:
- Client no longer needs to navigate to a separate create-log page.
- Dashboard links reflect the unified flow.

## Priority 2 - Trainer Review Improvements

### Item 2.1 - Trainer log filters
- Add filters on /dashboard/client-logs for client, program, date range, day.

Acceptance criteria:
- Trainer can quickly narrow logs by selected client and program.
- Filter state updates results without full confusion.

### Item 2.2 - Program adherence snapshot
- Add simple indicators such as total logs this week and per-day completion count.

Acceptance criteria:
- Trainer sees basic adherence signal without advanced analytics.

## Priority 3 - Remove Manual SQL Linking

### Item 3.1 - Link client login from trainer UI
- In /dashboard/clients, add a link-control to map client row to a client-role profile.

Acceptance criteria:
- Trainer can perform auth_user_id linking from UI.
- No direct SQL is required for normal onboarding.

## Priority 4 - Quality Of Life

### Item 4.1 - Better program builder UX
- Move away from line parser toward structured per-exercise fields in form rows.

Acceptance criteria:
- Trainer can add exercises with explicit inputs for sets, reps, weight, notes.
- Input errors are clear and field-level.

### Item 4.2 - Empty state guidance
- Improve copy in client pages when no assigned program exists.

Acceptance criteria:
- Client sees clear next step instead of generic empty state.
