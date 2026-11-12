import { Component, type ReactNode } from "react";

/** A non-essential surface must never break its host: any failure inside it (chunk, auth) renders nothing. */
export class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* intentionally silent */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
