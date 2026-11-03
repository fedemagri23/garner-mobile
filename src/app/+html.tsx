import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { colors } from '@/theme/tokens';

/**
 * Focus: the browser's outline would draw a square inside rounded fields, so
 * a focused field (or the box around one) takes the accent colour instead.
 * Everything else that can be reached by keyboard gets a visible ring.
 */
const webStyles = `
html, body { background-color: ${colors.ground}; }
input:focus, textarea:focus { outline: none; }
/* The web's switch is 20 px high: the invisible control over it reaches further. */
input[role="switch"] { top: -12px !important; bottom: -12px !important; height: auto !important; }
input:focus-visible { border-color: ${colors.accent} !important; }
div:has(> input:focus-visible) { border-color: ${colors.accent} !important; }
[role="button"]:focus-visible, [role="tab"]:focus-visible, [role="radio"]:focus-visible,
[role="checkbox"]:focus-visible, [role="switch"]:focus-visible, [role="link"]:focus-visible, a:focus-visible, button:focus-visible {
  outline: 2px solid ${colors.accent};
  outline-offset: 2px;
}
`;

/** The web document around the app. Only runs when the static pages are built. */
export default function RootHtml({ children }: PropsWithChildren) {
  // headNodes and bodyNodes carry the styles and the app's own scripts: without
  // them the page is served empty and never starts.
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();

  return (
    <html lang="es" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover is what gives a phone browser its safe areas. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={colors.ground} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: webStyles }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
