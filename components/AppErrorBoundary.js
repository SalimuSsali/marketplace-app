"use client";

import { Component } from "react";
import Link from "next/link";
import { devError } from "../lib/devLog";

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    devError("[AppErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-100 px-6 py-12 text-center">
          <h1 className="text-lg font-bold text-neutral-900">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm text-neutral-600">
            Please reload the page. If the problem continues, try again later.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
            <Link
              href="/"
              className="text-sm font-semibold text-emerald-700 underline"
            >
              Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
