import React from 'react';

export default function QLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="qlab-layout-wrapper">
      {children}
    </div>
  );
}
