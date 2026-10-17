# Incident response

An incident is any unplanned event that degrades the Orbit service for customers. The on-call engineer owns the response until it is handed off or resolved.

## Severity levels

Severity one means the API or dashboard is unavailable for most customers. Severity two means a feature is broken or badly degraded for many customers. Severity three means a minor feature is affected or a workaround exists. Only severity one and two incidents require customer communication.

## Declare an incident

1. Post in the incidents channel with the severity, a one-line summary, and your name as incident commander.
2. Open an incident record from the status tool so that the timeline starts recording.
3. Page the owning team for the affected service.
4. Publish an initial status page notice within fifteen minutes of declaration, even if the cause is unknown.

## Customer communication

Severity one incidents receive a status page update at least every thirty minutes until resolved. Severity two incidents receive an update every hour. Each update states what is affected, what has changed since the last update, and when the next update will come. A resolved notice ends the sequence.

## Write the postmortem

1. Within two business days, draft the postmortem from the incident timeline.
2. Describe the impact in customer terms: who was affected, for how long, and what they saw.
3. List contributing causes rather than a single root cause, and give each one an action item with an owner and a date.
4. Review the draft in the weekly operations meeting and publish it to the whole company.
