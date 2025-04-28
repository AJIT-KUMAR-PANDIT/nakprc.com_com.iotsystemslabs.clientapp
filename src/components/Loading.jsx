import React from "react";

export const Loading = ({ isLoading }) => {
  if (!isLoading) return null; // If loading is false, return nothing

  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-700"></div>
    </div>
  );
};
