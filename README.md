# calendar

TODO:

- repeatable events
  - improve how they appear in modal
  - show repeats in calendar view
  - ability to delete one particular ocurrence
  - ability to edit one particular ocurrence only
- ability to drag an event to another day
- ical import/export
- calendar entity with id, 4 word slug, created time, last access time, deleted flag, deleteafter option, preferred timezone option, signin options
- when entering via direct link a calendar /cal/id, redirect to /cal/open to login with ID or slug
- homepage with Open Calendar / Create new
  - on opening an existing one (cal/open), ask for ID or 4 word string, like smart-tree-tropical-fish
    - if calendar requires password, request it
    - if calendar has 2FA, request token
    - save on user session as having access to that calendar
    - add settings menu, to allow changing the calendar password, deleting the calendar, import/export, and auto-delete if unused after some time (default and max is 2 years)
  - on create (cal/create) new show menu showing 4 word strings and allowing to add authetication options, and submit
- rate limits via redis
