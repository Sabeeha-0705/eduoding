// client/src/components/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={err:null,info:null}; }
  static getDerivedStateFromError(err){ return {err}; }
  componentDidCatch(err, info){ console.error("ErrorBoundary caught:", err, info); this.setState({info}); }
  render(){
    if (this.state.err) {
      return (
        <div style={{ padding: 20 }}>
          <h2>Something went wrong</h2>
          <pre>{String(this.state.err)}</pre>
          <details style={{ whiteSpace: "pre-wrap" }}>{this.state.info?.componentStack}</details>
        </div>
      );
    }
    return this.props.children;
  }
}
