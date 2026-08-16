import React from 'react';

interface VeyloLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export const VeyloLogo: React.FC<VeyloLogoProps> = ({
  className = "w-8 h-8",
  color = "currentColor",
}) => {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left Wing of 'V' */}
      <path
        d="M 24 32 C 24 28 28 24 34 24 L 72 24 C 76 24 79 27 77 31 L 90 108 C 91 112 88 116 84 116 L 70 116 C 66 116 63 113 61 109 Z"
        fill={color}
      />
      {/* Right Wing of 'V' */}
      <path
        d="M 176 32 C 176 28 172 24 166 24 L 128 24 C 124 24 121 27 123 31 L 110 108 C 109 112 112 116 116 116 L 130 116 C 134 116 137 113 139 109 Z"
        fill={color}
      />
      {/* Perspective Highway/Road Dashes in Center */}
      {/* Bottom Road Segment */}
      <polygon points="90,144 110,144 107,122 93,122" fill={color} />
      {/* Middle Road Dash */}
      <polygon points="94,114 106,114 104,98 96,98" fill={color} />
      {/* Upper Middle Road Dash */}
      <polygon points="96.5,92 103.5,92 102.5,80 97.5,80" fill={color} />
      {/* Top Road Dash */}
      <polygon points="98,75 102,75 101.5,66 98.5,66" fill={color} />
      {/* Apex Tip Dash */}
      <polygon points="99,62 101,62 100.7,55 99.3,55" fill={color} />
    </svg>
  );
};
