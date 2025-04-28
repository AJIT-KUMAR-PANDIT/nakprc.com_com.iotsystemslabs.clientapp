// card.jsx
import React from 'react';

const Card = ({ children, className, ...props }) => {
  return (
    <div
      className={` shadow-md rounded-md overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardContent = ({ children, className, ...props }) => {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export { Card, CardContent };
