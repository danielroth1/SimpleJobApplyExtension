# Copilot instructions for this repo

These instructions guide AI code generation in this project. Treat them as hard constraints unless a maintainer explicitly chooses to deviate.

## General principles
- should be available as browser extension that works for chrome and firefox -> use Manifest V3
- always perform typecheck after code generation
- prefer modular, testable, and maintainable code
- prefer readability and clarity over cleverness or brevity
- prefer explicitness over implicitness

## Creating Git commit messages
When generating git commit messages, follow this format:
- short descriptive title with empty space underneeth
- short description of changes as list of bullet points

## Architecture and design
- Prefer React Context API to inject services and shared state. Expose services via a top-level `ServiceProvider` and consume them with typed hooks (e.g., `useServices`).
- Keep application/business logic in separate service modules under `src/services/`. Components should be thin, delegating logic to services.
- Keep components small and focused (single responsibility). If a component grows too large/complex, extract subcomponents or custom hooks.
- Use CSS Modules for component-level styling (`*.module.css`). Avoid inline styles except for dynamic one-offs.

## React patterns
- Use functional components with React hooks only. Do not create class components.
- Follow the Rules of Hooks strictly:
  - Do not call hooks conditionally or inside loops.
  - Put all hook calls at the top level of the component or custom hook.
  - Keep `useEffect` dependency arrays correct and complete.
- Use `React.FC` ONLY for components that accept `children`. For other components, prefer typed function components: `function MyComp(props: Props) { ... }`.
- Prefer local state first, then Context for cross-cutting concerns. Avoid prop drilling.
- Prefer custom hooks to extract reusable component logic.

## File structure conventions
- `src/services/` — pure/impure application logic, pure functions preferred; handle side-effects behind a clear API.
- `src/contexts/` — React Contexts and Providers for services or app-wide state.
- `src/components/` — presentational, small, focused components using hooks.
- `src/styles/` — global styles. Component styles should live alongside components as `*.module.css`.

## Service + Context pattern (reference)

```tsx
// src/services/userService.ts
export type UserService = {
  fetchProfile(userId: string): Promise<User>;
};

export function createUserService(api = fetch): UserService {
  return {
    async fetchProfile(userId) {
      const res = await api(`/api/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  };
}
```

```tsx
// src/contexts/ServicesContext.tsx
import React, { createContext, useContext, useMemo } from "react";
import { createUserService, type UserService } from "../services/userService";

type Services = { userService: UserService };

const ServicesContext = createContext<Services | null>(null);

export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const services = useMemo<Services>(() => ({
    userService: createUserService(),
  }), []);

  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
};

export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("useServices must be used within ServicesProvider");
  return ctx;
}
```

```tsx
// src/components/ProfileCard.tsx
import React from "react";
import { useServices } from "../contexts/ServicesContext";
import styles from "./ProfileCard.module.css";

type Props = { userId: string };

export function ProfileCard({ userId }: Props) {
  const { userService } = useServices();
  // ...use hooks and service methods to fetch/render data
  return <div className={styles.card}>...</div>;
}
```

## Styling
- Default to CSS Modules for component styles: `ComponentName.module.css` imported as `styles`.
- Use bootstrap classes for common UI patterns when appropriate.

## Testing
- Write unit tests for services (pure logic) and integration tests for components with React Testing Library.
- Mock services at component boundaries; do not mock React internals.

## TypeScript
- Prefer precise types and `unknown` over `any`.
- Keep public types in `src/types/` when shared across modules. Export narrow interfaces.

## Do not
- Do not place business logic in components when it belongs in services.
- Do not violate the Rules of Hooks (no conditional hooks).
- Do not create class components.
- Do not use global styles for component-specific concerns; use CSS Modules instead.

---

When in doubt, favor readability, composability, and testability. If a generated change conflicts with these instructions, revise the approach to align with this document.
