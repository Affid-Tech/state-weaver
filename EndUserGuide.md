# State Weaver (End‑User Guide)

State Weaver lets you design and maintain state machines for “instruments” (systems, products, workflows, etc.) using an interactive visual editor. You can create multiple instruments, organize them by revision, model topics and states, and preview/export the resulting diagrams.

## What you can do

- Create multiple instruments and manage them in a gallery.
- Build state machines visually with states and transitions.
- Organize messages by topic and set a root entry topic.
- Preview diagrams live and copy PlantUML output.
- Validate your models to find errors and warnings.
- Export and import your work for backup or sharing.
- Customize allowed field values (revisions, types, flow types, etc.).

## Quick start

1. Open the app to see the Instruments gallery.
2. Click **New Instrument** to create your first item.
3. Enter an **Instrument Type** and **Revision** (required).
4. Click **Create** to open the editor.
5. Add topics, states, and transitions to build your state machine.

## Gallery (Instrument list)

The gallery is your home base.

### Actions

- **Search** by instrument type, label, description, or name.
- **Filter by revision** using the dropdown.
- **New Instrument**: Create a new instrument.
- **Edit Details**: Update type, revision, label, or description.
- **Duplicate**: Copy an existing instrument.
- **Delete**: Remove an instrument.
- **Reload Project**: Import a previously exported JSON project file.
- **Export**: Download a ZIP containing your workspace and PlantUML files.
- **Field Config**: Customize dropdown values for revisions, types, flow types, etc.

### Export contents

When you export:

- A ZIP is generated with:
  - `builder/statemachine_snapshot.json` (full workspace snapshot)
  - One folder per **Revision/Instrument Type**
  - One `.puml` per topic
  - A `complete.puml` for each instrument

## Editor overview

The editor has four main areas:

1. **Top Bar**
   - Shows instrument name and revision.
   - Use **Gallery** to return to the instrument list.
2. **Structure Sidebar (left)**
   - Topics list (message subtypes).
   - Create topics using **+**.
   - Set a topic as **Root** (entry point) with the crown icon.
   - Rename or delete topics from the context menu.
3. **Canvas (center)**
   - Visual state machine editor.
   - Click and drag to position states.
   - Connect states to create transitions.
   - Right-click the canvas to add a state or fork.
4. **Inspector Panel (right)**
   - Edit properties of selected states and transitions.
   - Add new states and forks quickly.
   - View **Validation** errors and warnings.

## Key concepts

### Instrument

An overall state machine with a type and revision (e.g., `PAYMENTS / R1`). Each instrument can contain multiple topics.

### Topic

A message subtype or workflow segment. One topic can be set as **Root** (entry point). Each topic has its own states and transitions.

### State

A node in the state machine. You can:

- Rename it.
- Add a stereotype.
- Mark it as end-of-topic (positive or negative).

### Transition

A connection between states. You can:

- Set message properties (revision, instrument, topic, message type, flow type).
- Adjust routing (source/target side, curve offset).
- Enable teleport routing (split edges).

### Fork

A system node for visual routing. Forks help you branch paths visually but do not appear in PlantUML output.

## Live preview

The preview panel shows a rendered diagram and PlantUML code.

### View modes

- **Topic**: only the selected topic.
- **Aggregate**: the full instrument.

### Actions

- **Copy PUML** to your clipboard.
- **Refresh** to re-render.
- Resize the code panel by dragging the divider.

## Validation

The Validation tab highlights problems:

- **Errors**: must be fixed to make a valid model.
- **Warnings**: potential issues to review.

Click any issue to jump to the related element on the canvas.

## Field configuration

Use **Field Config** (from Gallery) to customize allowed values:

- Revisions
- Instrument Types
- Topic Types
- Message Types
- Flow Types (with colors)

**Important:** Values must follow Java enum naming rules:

- Start with a letter
- Letters, numbers, underscores only
- No spaces

## Tips & shortcuts

- **Delete / Backspace**: remove selected states or transitions.
- **Shift + drag**: select multiple items.
- **Alt + click** overlapping edges: cycle between them.
- **Right-click** canvas: add a state or fork.

## Data storage & backups

Your work is stored in your browser’s local storage. To back up or share projects, use **Export** and **Reload Project**.
