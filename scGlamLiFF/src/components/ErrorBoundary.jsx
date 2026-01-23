import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (typeof window !== "undefined") {
      window.__SCGLAM_LAST_ERROR__ = {
        message: error?.message || String(error),
        stack: error?.stack || "",
        componentStack: info?.componentStack || ""
      };
    }
  }

  render() {
    const { error } = this.state;
    if (error) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
