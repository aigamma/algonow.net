# Webhooks

Orbit sends webhooks for project events such as export.completed and member.invited. Each delivery is an HTTPS POST with a JSON body and a signature header. Endpoints must answer within ten seconds.

## Delivery and retries

A delivery counts as successful when the endpoint returns any status from 200 to 299. Anything else, including a timeout, schedules a retry.

1. The first retry fires one minute after the failed attempt.
2. Each later retry waits twice as long as the previous one, up to a maximum gap of six hours.
3. Orbit stops after twelve failed attempts and marks the delivery as dead.
4. An endpoint that accumulates fifty dead deliveries in a day is disabled, and the project owners receive an email.

## Verify a signature

Every delivery carries an Orbit-Signature header containing a timestamp and an HMAC digest.

1. Read the timestamp and the digest from the header.
2. Reject the delivery if the timestamp is more than five minutes old, which blocks replay of captured requests.
3. Compute an HMAC SHA-256 over the timestamp, a period, and the raw request body using the endpoint secret.
4. Compare your digest with the header digest using a constant-time comparison.

## Replay missed events

Dead deliveries stay available for thirty days.

1. Open the endpoint's delivery log and filter by status dead.
2. Select the deliveries to resend and choose Replay. Replayed deliveries keep their original event identifiers so idempotent handlers ignore duplicates.
3. Watch the log until each replay shows a success status.
