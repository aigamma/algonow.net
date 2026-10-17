# Rate limits

Every API key has a request budget measured in requests per minute. Limits apply per key, not per project, so two keys in one project do not share a budget.

## Default limits

Read calls allow six hundred requests per minute and write calls allow one hundred twenty. Export and bulk endpoints allow ten requests per minute because each request starts background work.

## Limit headers

Each response carries three headers: the limit for the key, the requests remaining in the current window, and the number of seconds until the window resets. Clients should read the remaining count and slow down before it reaches zero rather than waiting for a rejection.

## Handle a 429 response

A status of 429 means the window is exhausted.

1. Read the retry-after header, which gives the number of seconds to wait.
2. Sleep for at least that long. Do not retry sooner, because early retries count against the next window.
3. Add random jitter of up to one second so that many clients do not resume in the same instant.
4. Log the event with the key name so that a persistently throttled caller can be found.

## Request a higher limit

1. Measure the caller's actual peak rate over a week from the request log.
2. Open a support ticket that names the key, the endpoint family, the measured peak, and the requested limit.
3. Expect a reply within two business days. Approved limits take effect without a key change.
