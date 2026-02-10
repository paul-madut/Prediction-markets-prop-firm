"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReportIssue = () => {
    const { error, errorInfo } = this.state;

    console.group("🐛 Error Report");
    console.error("Error:", error);
    console.error("Component Stack:", errorInfo?.componentStack);
    console.error("Timestamp:", new Date().toISOString());
    console.error("User Agent:", navigator.userAgent);
    console.groupEnd();

    // In a real app, this would send to an error tracking service
    alert(
      "Error details have been logged to the console. " +
      "In production, this would be sent to our error tracking service."
    );
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-md w-full"
          >
            <div className="bg-white rounded-xl border border-red-200 shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-8 border-b border-red-200">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-red-600 rounded-full">
                    <AlertTriangle className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 text-center">
                  Something went wrong
                </h2>
                <p className="text-sm text-gray-600 text-center mt-2">
                  We encountered an unexpected error. Don't worry, your data is safe.
                </p>
              </div>

              {/* Error Details (collapsible in dev mode) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                    Error Details (Development Mode)
                  </summary>
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs font-mono text-red-800 break-all">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="mt-2 text-xs font-mono text-red-700 overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="px-6 py-6 space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleReportIssue}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  <Bug className="h-4 w-4" />
                  Report Issue
                </button>
              </div>

              {/* Footer Help Text */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  If this problem persists, please contact support or try refreshing the page.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience wrapper component for common use cases
export const AdminErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <ErrorBoundary>{children}</ErrorBoundary>;
};
