# calendar

TODO:

- add env var that disables sign ins without password, and requires a specific password, and shows a banner alerting that the website is in limited availability only.
- button to add new/open calendar from within the calendar view
- able to delete one particular recurrence, or from one day forward
- able to drag and move an event forward/back a few days
- after deleting an event, get an undo popup for a few moments, that if clicked would recreate it
- ical import/export
- calendar options: edit name, 12 color palette, share with view only access, authorization (edit/remove/add password), remove from list, delete
- delete older calendars and deleted events on a schedule via @nestjs/schedule
- rate throttle with @nestjs/throttler, trusting an nginx gateway on top
- deploy to Oracle Cloud (Always Free VPS), Mongo Atlas free tier
