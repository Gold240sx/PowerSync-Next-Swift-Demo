"use client";

import dynamic from 'next/dynamic';
import React from 'react';

/**
 * Only use PowerSync in client side rendering
 */
export const DynamicSystemProvider = dynamic(() => import('~/library/providers/SystemProvider').then(mod => ({ default: mod.SystemProvider })), {
  ssr: false
});
