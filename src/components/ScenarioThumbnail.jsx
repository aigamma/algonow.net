// Conceptual workflows identify practice areas without implying measured
// results or exposing a scenario's reference solution.
const WORKFLOWS = {
  rag: [['document', 'Documents'], ['chunks', 'Chunks'], ['search', 'Retrieval']],
  'data-pipelines': [['document', 'Raw data'], ['checks', 'Validation'], ['database', 'Dataset']],
  'fine-tuning': [['database', 'Examples'], ['model', 'Training'], ['model', 'Adapted model']],
  distillation: [['model', 'Teacher'], ['document', 'Examples'], ['model', 'Student']],
  evaluation: [['document', 'Outputs'], ['checks', 'Checks'], ['report', 'Report']],
  serving: [['document', 'Request'], ['chunks', 'Queue'], ['model', 'Inference']],
};

function NodeIcon({ kind }) {
  switch (kind) {
    case 'document': return <><path d="M-11-15H5L12-8V15H-11Z M5-15V-8H12" /><path d="M-6-3H6M-6 3H6M-6 9H2" /></>;
    case 'chunks': return <>{[-12, 0, 12].map((y) => <rect key={y} x="-13" y={y - 4} width="26" height="8" rx="2" />)}</>;
    case 'search': return <><circle cx="-3" cy="-3" r="10" /><path d="M4 4L14 14M-7-3H1M-3-7V1" /></>;
    case 'checks': return <><path d="M-14-10L-11-7L-6-13M-14 1L-11 4L-6-2M-14 12L-11 15L-6 9M0-10H13M0 1H13M0 12H13" /></>;
    case 'database': return <><ellipse cy="-11" rx="14" ry="5" /><path d="M-14-11V11C-14 18 14 18 14 11V-11M-14 0C-14 7 14 7 14 0" /></>;
    case 'report': return <><path d="M-13-16H13V16H-13Z M-7 10V3M0 10V-4M7 10V-10" /></>;
    default: return <><rect x="-12" y="-12" width="24" height="24" rx="3" /><rect x="-5" y="-5" width="10" height="10" rx="1" /><path d="M-5-18V-12M5-18V-12M-5 12V18M5 12V18M-18-5H-12M-18 5H-12M12-5H18M12 5H18" /></>;
  }
}

export default function ScenarioThumbnail({ track, title }) {
  const workflow = WORKFLOWS[track] || WORKFLOWS.serving;
  return (
    <div className="scenario-thumbnail">
      <span className="thumbnail-caption">Workflow overview</span>
      <svg viewBox="0 0 320 82" role="img" aria-label={`${title}: ${workflow.map(([, label]) => label).join(' to ')}`}>
        {[0, 1].map((index) => <path className="workflow-edge" key={index} d={`M${80 + index * 108} 47h52m-5-4 5 4-5 4`} />)}
        {workflow.map(([kind, label], index) => <g key={label} transform={`translate(${52 + index * 108} 47)`}>
          <rect className="workflow-node" x="-27" y="-27" width="54" height="54" rx="8" />
          <g className="workflow-icon"><NodeIcon kind={kind} /></g>
        </g>)}
      </svg>
      <div className="workflow-labels" aria-hidden="true">{workflow.map(([, label]) => <span key={label}>{label}</span>)}</div>
    </div>
  );
}
