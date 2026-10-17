# Data export

A project export packages every record the project owns into compressed JSON files. Exports run asynchronously and are retained for seven days after completion.

## Request an export

1. Open the project settings page and choose Export.
2. Select the record types to include. Leaving the list empty exports everything.
3. Choose a delivery target: a signed download link or a bucket the project has connected.
4. Submit the request. A job identifier appears, and the export.completed webhook fires when the files are ready.

## File layout

Each export contains one file per record type, named for that type, plus a manifest listing every file with its row count and checksum. Rows are newline-delimited JSON ordered by creation time. Timestamps are UTC in ISO 8601 form.

## Scheduled exports

Exports can repeat daily or weekly. Scheduled exports always deliver to a connected bucket because signed links expire too quickly for unattended delivery. Each run overwrites nothing: files land under a prefix named for the run date.

## Troubleshoot a stuck export

An export that has shown status running for more than two hours is stuck.

1. Open the job from the Export page and note the job identifier.
2. Check whether the connected bucket still accepts writes. A revoked bucket policy is the most common cause.
3. Cancel the stuck job. Cancellation is safe because partial files are never delivered.
4. Submit a new export. If the second run also stalls, open a support ticket that includes both job identifiers.
