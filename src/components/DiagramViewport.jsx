import { useId, useRef, useState } from 'react';

// Keep the overview available on a narrow screen while letting labels reach
// their intended size. Only the drawing scrolls; controls and captions stay put.
export default function DiagramViewport({ children, width = 800, aspect, frameClassName = '' }) {
  const [enlarged, setEnlarged] = useState(false);
  const viewportRef = useRef(null);
  const id = useId();
  const detailWidth = Math.max(1200, width * 1.5);

  return (
    <div className={`diagram-viewer${enlarged ? ' is-enlarged' : ''}`}>
      <div className="diagram-tools">
        <button
          type="button"
          className="btn"
          aria-pressed={enlarged}
          aria-controls={`${id}-viewport`}
          onClick={() => {
            if (viewportRef.current) viewportRef.current.scrollLeft = 0;
            setEnlarged((value) => !value);
          }}
        >
          {enlarged ? 'Fit diagram to page' : 'Enlarge diagram'}
        </button>
        <span id={`${id}-hint`} className="diagram-hint">
          {enlarged ? 'Scroll sideways to inspect. Arrow keys work when the diagram is focused.' : 'Enlarge for readable labels and details.'}
        </span>
      </div>
      <div
        ref={viewportRef}
        id={`${id}-viewport`}
        className="diagram-scroll"
        role="region"
        aria-label="Diagram"
        aria-describedby={`${id}-hint`}
        tabIndex={enlarged ? 0 : undefined}
      >
        <div
          className={`diagram-content ${frameClassName}`.trim()}
          style={{ '--diagram-detail-width': `${detailWidth}px`, ...(aspect ? { aspectRatio: aspect } : {}) }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
