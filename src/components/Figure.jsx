// A machine-drawn figure. The SVG is authored inline and deterministically,
// never fetched: an external image would break the content security policy on
// published pages, add a network round trip the no-runtime-fetch rule bans,
// and cost layout shift. Every figure carries a caption and a citation naming
// where the idea comes from, so a reader can go to the source.
export default function Figure({ id, caption, cite, children, aspect = '16 / 7' }) {
  return (
    <figure className="fig" id={id}>
      <div className="fig-canvas" style={{ aspectRatio: aspect }}>
        {children}
      </div>
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
