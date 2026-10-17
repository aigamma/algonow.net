# API keys

Orbit API keys authenticate server-to-server calls. Every key belongs to one project and carries a scope list. Keys are shown once at creation and stored hashed, so a lost key cannot be recovered, only replaced.

## Create a key

1. Open the project settings page and choose Credentials.
2. Click New key and give it a name that says where it will live, for example billing-worker-prod.
3. Pick the narrowest scope set that the caller needs.
4. Copy the key into your secret manager before closing the dialog. It is not shown again.

## Rotate a key without downtime

Rotation keeps the old key valid while the new one rolls out, so callers never see a failed request.

1. Create a replacement key with the same scopes as the key being retired.
2. Deploy the replacement to every caller and confirm in the request log that the old key's request count has dropped to zero.
3. Set a revocation date on the old key seven days out.
4. After the date passes, confirm the old key shows as expired and delete it.

## Revoke a leaked key

A key committed to a public repository or pasted into a ticket is compromised the moment it leaves the secret manager.

1. Revoke the key immediately from the Credentials page. Revocation is instant and cannot be undone.
2. Create a replacement and deploy it. Callers will fail until the replacement lands, which is preferable to an open key.
3. Search the request log for calls made with the leaked key after the exposure time and record them in the incident.
4. Ask the owner of the repository or ticket to remove the secret and purge history.

## Scopes

A scope grants one family of operations. The read scope covers list and get calls. The write scope adds create, update, and delete. The admin scope adds credential and member management and should be reserved for automation that provisions projects.
