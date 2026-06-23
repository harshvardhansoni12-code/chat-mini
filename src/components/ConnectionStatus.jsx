"use client";

export function ConnectionStatus({ isConnected, error }) {
  if (isConnected && !error) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-200">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-green-700">Connected</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-200">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-sm text-red-700">
          Error: {error.message || "Connection error"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200">
      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
      <span className="text-sm text-yellow-700">Connecting...</span>
    </div>
  );
}
