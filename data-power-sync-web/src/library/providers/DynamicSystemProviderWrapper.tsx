"use client";

import React from 'react';
import { DynamicSystemProvider } from './DynamicSystemProvider';

export function DynamicSystemProviderWrapper({ children }: { children: React.ReactNode }) {
  return <DynamicSystemProvider>{children}</DynamicSystemProvider>;
}
