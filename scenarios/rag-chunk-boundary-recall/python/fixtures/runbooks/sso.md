# Single sign-on

Orbit supports SAML single sign-on for organizations on the Team and Enterprise plans. Members sign in through the identity provider and are matched to Orbit accounts by verified email address.

## Configure SAML

1. In the organization settings, open Authentication and choose Add SAML provider.
2. Copy the Orbit assertion consumer URL and entity identifier into your identity provider.
3. Paste the provider's sign-on URL and signing certificate into Orbit.
4. Map the email attribute. Orbit requires the email claim and ignores other attributes.
5. Use Test connection with your own account before saving.

## Enforce SSO

Enforcement requires every member to sign in through the provider.

1. Confirm that every member's email domain is one the provider owns. Members outside the domain will be locked out.
2. Turn on Require SSO. Existing sessions end within fifteen minutes.
3. Announce the change to members, because password sign-in stops working at once.

## Break-glass access

Organization owners keep one recovery path in case the identity provider goes down. Each owner should store a recovery code generated from the Authentication page in a password manager. A recovery code allows one password sign-in while enforcement is on, and using it sends a notice to all other owners.
