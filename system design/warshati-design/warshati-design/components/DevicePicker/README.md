# DevicePicker

Restyles `components/DevicePicker.jsx` as it works today: Phone · Laptop · Console switch; links *Details* and *Type manually / Choose from list*; Brand and Model searchable lists (photo, model, spec summary, "added by hand"); the last row *Use "typed text" (type manually)* / *Not in the list? Type it manually*; manual mode with Brand and Model fields.

**Provide** `lang`, `category`, `brand`, `model`, `manual`, `openList` (`brand` | `model`), `query`, `brandItems`, `modelItems`, `picked`.

- The manual row is drawn as a dashed-separated, green, bold last row so it is easy to find.

**Keep the app's structure.** This restyles the existing component; it does not add, remove or rename props, fields, buttons or behaviour.
