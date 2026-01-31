# Technical Overview

## Purpose
State Weaver is a browser-based editor for designing, validating, and exporting instrument state machines. It lets users create instrument projects, model topics as state graphs, preview PlantUML renderings, and export project artifacts (JSON + PUML bundles). The app is a single-page React application built with Vite, TypeScript, and Tailwind/shadcn-ui components. The runtime includes client-side persistence, diagram editing, validation, and export tooling. 

## High-level architecture
The application is organized into four primary layers:

1. **Presentation (React UI)**
   - Pages: Gallery (`/`) and Editor (`/editor/:id`) plus a 404 route.
   - UI components for layout, the diagram canvas, inspectors, and previews.
2. **State management (Zustand store)**
   - A single workspace store manages projects, topics, states, transitions, selection, and view mode.
   - The store is persisted in local storage for continuity across refreshes.
3. **Domain + validation**
   - Strongly typed domain models define instruments, topics, states, transitions, and validation issues.
   - Validation logic enforces naming conventions, required transitions, and field-config constraints.
4. **Export/preview pipeline**
   - PlantUML is generated from the in-memory graph state.
   - Preview rendering uses the Kroki API to fetch SVG for live visualization.
   - Export utilities assemble project assets into a ZIP bundle.

## Application flow
### Bootstrapping & routing
- The app is mounted in `src/main.tsx` and routed in `src/App.tsx`.
- Providers include React Query, tooltips, and toasts for UI feedback.
- Routes:
  - `/` → **Gallery**: manage instrument projects (create, edit, import/export).
  - `/editor/:id` → **Editor**: graph canvas + inspectors + preview.
  - `*` → **NotFound**.

### Gallery (Project workspace)
The Gallery presents a multi-project workspace:
- Projects can be created, duplicated, edited, or deleted.
- Import/export is supported via JSON and ZIP utilities.
- Projects are grouped and filtered by revision and searchable by metadata.

### Editor (Graph modeler)
The Editor is a three-panel layout:
- **Structure Sidebar**: manages topics and their root/normal status.
- **Diagram Canvas**: interactive graph with nodes (states) and edges (transitions).
- **Inspector Panel**: edit state/transition properties, validation issues, and routing.
- **Preview Panel**: live PlantUML preview (topic or aggregate view).

## State & data model
### Core domain types
Defined in `src/types/diagram.ts`:
- **DiagramProject**: top-level instrument container containing topics and selection metadata.
- **TopicData**: topic definition plus its state nodes and transitions.
- **StateNode**: position, label, system-node flags, and end-of-topic markers.
- **Transition**: edges with message attributes and routing metadata.

### Store behavior
The Zustand store (`src/store/diagramStore.ts`) manages:
- Multi-project workspace state.
- Current selection (node/edge) and view mode (topic vs aggregate).
- Field configuration used for validation + UI dropdowns.
- CRUD actions for projects, topics, states, and transitions.
- Import/export logic for JSON project snapshots.
- Transition visibility + routing adjustments.

Persistence is handled with `zustand/middleware/persist` so projects survive reloads.

## Diagram editing pipeline
### Canvas rendering
The canvas is powered by `@xyflow/react`:
- Nodes are states, edges are transitions.
- Edges support routing, reconnection, and “teleport” mode for split-path rendering.
- Context menu actions create new states or forks.

### Validation
The validation module checks:
- Naming conventions (Java-style enum identifiers).
- Required transitions (start + end coverage).
- Configuration consistency (field config values).
- Structural warnings like orphans, unreachable states, and unused forks.

## Preview & export
### PlantUML generation
`src/lib/pumlGenerator.ts` converts project graphs into PlantUML:
- **Topic view**: renders a single topic with system nodes and end markers.
- **Aggregate view**: renders all topics within an instrument container.

Forks are “visual-only” routing aids; transitions are expanded to bypass forks.

### Live rendering
`src/lib/krokiRenderer.ts` calls the Kroki API to convert PUML to SVG:
- Requests are POSTed to `https://kroki.io/plantuml/svg`.
- Results are cached in-memory for responsiveness.

### Export
`src/lib/exportUtils.ts` packages outputs into a ZIP:
- `builder/statemachine_snapshot.json` captures the full store state.
- Per-topic `.puml` files plus an aggregate `complete.puml` file are generated.
- Folder structure uses `REVISION/TYPE` conventions for easy cataloging.

## Technology stack
- **Frontend:** React + TypeScript + Vite
- **State:** Zustand + immer + persist
- **UI:** shadcn-ui + Tailwind CSS
- **Canvas:** @xyflow/react (React Flow)
- **Preview:** PlantUML + Kroki API
- **Utilities:** JSZip for exports

## Key design decisions
- **Client-only persistence:** Projects persist locally with `zustand` storage for low-friction workflows.
- **Type-safe modeling:** Domain types act as the contract for UI, validation, and export.
- **Separation of concerns:** Diagram editing, validation, and export are distinct modules.
- **Preview fidelity:** PlantUML output is always derived from in-memory graph state.
