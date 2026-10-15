import { Children, isValidElement } from 'react';
import DiagramViewport from './DiagramViewport.jsx';

// A machine-drawn figure. The SVG is authored inline and deterministically,
// never fetched: an external image would break the content security policy on
// published pages, add a network round trip the no-runtime-fetch rule bans,
// and cost layout shift. Every figure carries a caption and a citation naming
// where the idea comes from, so a reader can go to the source.
export default function Figure({ id, caption, cite, children, aspect = '16 / 7' }) {
  const svg = Children.toArray(children).find((child) => isValidElement(child) && child.type === 'svg');
  const logicalWidth = Number(svg?.props.viewBox?.trim().split(/[\s,]+/)[2]) || 800;
  return (
    <figure className="fig" id={id}>
      <DiagramViewport width={logicalWidth} aspect={aspect} frameClassName="fig-canvas">
        {children}
      </DiagramViewport>
      <figcaption className="fig-cap">
        <span className="fig-caption-text">{caption}</span>
        {cite && (
          <cite className="fig-cite">
            {cite.text}
            {cite.href && (
              <>
                {' '}
                <a href={cite.href} rel="nofollow noopener" target="_blank">
                  source
                </a>
              </>
            )}
          </cite>
        )}
      </figcaption>
    </figure>
  );
}
