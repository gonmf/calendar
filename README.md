# calendar

TODO:

- calendar options
  - edit name, 12 color palette, share with view only access, authorization (edit/remove/add password), remove from list, delete
  - Rename, Share, Settings (Color Palette, Authorization, Delete Calendar), Forget
- able to delete one particular recurrence, or from one day forward
- able to drag and move an event forward/back a few days
- ical import/export
- rate throttle with @nestjs/throttler, trusting an nginx gateway on top
- deploy to Oracle Cloud (Always Free VPS), Mongo Atlas free tier
- BUG: on first visit, it is reading all past calendars from localStorage, and crashing if any is unavailable (deleted); instead of reading them from the URL and only requiring those
