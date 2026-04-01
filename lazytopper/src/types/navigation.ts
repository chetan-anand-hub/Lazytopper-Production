// src/types/navigation.ts
export interface NavigationState<TPayload = unknown> {
  back?: string;         // pathname + search of the page to return to
  backLabel?: string;    // optional label for the back button
  payload?: TPayload;    // any data you want to carry to the next page
  mode?: string;         // e.g. 'solve', 'explain' or 'planner'
}
