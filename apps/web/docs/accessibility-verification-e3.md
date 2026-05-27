# Accessibility verification — Epic E3 (Events & Registration)

WCAG 2.1 AA checkpoint for primary E3 flows. Manual verification; automated axe runs via Playwright where noted.

## US1 — Organizer create / publish / admin sanction

- [ ] Keyboard path through organizer create form (`/organizer/events`)
- [ ] Accessible names on name, timezone, start, venue fields
- [ ] Publish confirmation is keyboard-operable
- [ ] Admin sanction/reassign controls have labels (`/admin/events/[eventId]`)

## US2 — Fighter register / withdraw

- [ ] Fighter event list links are keyboard reachable (`/events`)
- [ ] Register and withdraw buttons operable without pointer (`/events/[eventId]`)
- [ ] Registration status not conveyed by color alone (text includes status label)
- [ ] Timezone visible in schedule/event datetime copy

## US4 — Schedule board

- [ ] Schedule entry form fields labeled on organizer schedule page
- [ ] Timezone shown in board heading or entry text

## US6 — Registration summary

- [ ] Summary table has header cells and withdraw actions keyboard-operable
- [ ] On-behalf form labeled

## Staff / public (polish)

- [ ] Staff registration section labeled separately from fighter controls
- [ ] Public event page (`PUBLIC_EVENTS=true`) readable without auth
