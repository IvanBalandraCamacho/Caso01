'use client';

import React from 'react';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';
import { useServerInsertedHTML } from 'next/navigation';

export function AntdStyleRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = React.useState(() => createCache());
  const isServerInserted = React.useRef<boolean>(false);

  useServerInsertedHTML(() => {
    // Avoid duplicate CSS insert
    if (isServerInserted.current) {
      return;
    }
    isServerInserted.current = true;
    
    const styleText = extractStyle(cache, true);
    return (
      <style
        id="antd"
        dangerouslySetInnerHTML={{ __html: styleText }}
      />
    );
  });

  return (
    <StyleProvider cache={cache} hashPriority="high" ssrInline>
      {children}
    </StyleProvider>
  );
}
