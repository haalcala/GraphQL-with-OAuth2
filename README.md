# GraphQL With OAuth2

This is a bare essential GraphQL with OAuth2.0 support or OAuth2.0 server with graphql capability, depending on how to want to utilise this base setup.

It's also been restructured to allow your wrap your existing system. See [Bonus](#bonus-add-an-oauth2-capability-on-your-existing-or-legacy-system-in-two-easy-steps)

## So what does this exactly do?

You can login via /graphql (mutation: login) or via OAuth 2.0 and doing so will get the OAuthUser instance injected to the request object for further access to the rest of the mutation/query

### Use case #1:

You can just either use this project to serve as an ready-made OAuth2 server for your system. In this case, graphql is entirely optional. You can use the graphql to create the API Keys/secret for consistency (refer to the commands below)

### Use case #2:

Build a suite of graphql queries that compliment your business needs and enjoy a super admin access via Oauth2.

### BONUS! Add an OAuth2 capability on your existing or legacy system in two easy steps!

By default authorization happens by making a call to the local user database and make the necesary verification. But with the latest update, you will be able to replace the authorization which effectively enables your existing or legacy system to have an OAuth2 layer/feature without changing your existing system.

This can be achieved by extending the `DefaultAuthHandler` class and override the `verifyUser` method. And specify the new authhandler in the `index.js`. And if it's not very obvious and not covered here, you would need to write your `MyExistingSystemClient` that can allow you to communicate with your existing existing system like LDAP, some REST endpoints and whatnot.

You can override more methods in `DefaultAuthHandler`.

Ex:

In `MyCustomAuthHandler.ts`:

```javascript
export class MyCustomAuthHandler extends DefaultAuthHandler {
	async verifyUser(username: string, password: string): Promise<{ user: OAuthUser, sessionId?: string }> {
		const user = await super.getUser(username);

		if (user.scope.indexOf("admin") >= 0) {
			// if the user is an admin user, verify with default method
			let { user } = await super.verifyUser(username, password);

			return { user };
		} else {
			const client = new MyExistingSystemClient({ ...some_config });

			const resp = await client.login({ username, password });

			// BIG NOTE!!!
			// If you existing system expects a sessionId for suceeding calls, you should return it
			// so that you can THIS system can keep it when the toke is refreshed
			return { user, sessionId: resp.session }; // <<-- This sessionId will be tied to the OAuth token
		}
	}
}
```

in `index.ts`:

FROM:

```javascript
const auth_provider = new DefaultAuthHandler(); // replace this with your custom auth provider

startServer(auth_provider).catch(err => {
	logDebug.enabled && logDebug("index.ts:: err:", err);
});
```

TO:

```javascript
const auth_provider = new MyCustomAuthHandler(); // replace this with your custom auth provider

startServer(auth_provider).catch(err => {
	logDebug.enabled && logDebug("index.ts:: err:", err);
});
```

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Steps to run this project:

1. Run `yarn` command
2. Setup database settings inside `.env` file (for Heroku deployment, configure the same keys found in .env-SAMPLE in the Settings/Config Vars)
3. Customise src/auth.ts according to your authentication needs
4. Run `yarn start_dev` command (or `yarn start` in production)

## Setup your OAuth2 access

You can use `curl` or the UI with your browser at `http://localhost:4003/graphql`

### Login as admin

Use the values for `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD`

```bash
curl --cookie cookies.jar --cookie-jar cookies.jar -H 'Content-Type: application/json' \
    -XPOST http://localhost:4003/graphql \
    -d "{\"operationName\":null, \
    \"variables\":{}, \
    \"query\":\"mutation { \
        login(username: \\\"my_admin\\\", password: \\\"my_admin\\\") \
        { id email  } \
    }\"}"
```

Sample output:

```json
{ "data": { "login": { "id": "5cdd1295cb7c214366c1b76c", "email": "" } } }
```

### A quick test

````bash
curl --cookie cookies.jar --cookie-jar cookies.jar -H 'Content-Type: application/json' \
    -XPOST http://localhost:4003/graphql \
    -d "{\"operationName\":null,\"variables\":{}, \
    \"query\":\"{  \
    getUsers { userId  } \
}\"}"
```

Sample output:

```json
{ "data": { "getUsers": [] } }
````

### Create a client_id and secret key for your app (or client)!

```bash
curl --cookie cookies.jar --cookie-jar cookies.jar -H 'Content-Type: application/json' \
    -XPOST http://localhost:4003/graphql \
    -d "{\"operationName\":null,\"variables\":{}, \
    \"query\":\"mutation {  \
    createOAuthClient(client_id:\\\"my_client\\\" title:\\\"My Client Access\\\") {
        clientId clientSecret
    }
}\"}"
```

Sample output:

```json
{ "data": { "createOAuthAccess": { "clientId": "my_admin", "clientSecret": "c4d226c99081d984562c55a74bfc245b2ad21a70a441873b102e15b521c2a7da" } } }
```

### Create a (normal) user access (scope: [user]) (via OAuth)

```bash
curl --cookie cookies.jar --cookie-jar cookies.jar -H 'Content-Type: application/json' \
    -XPOST http://localhost:4003/graphql \
    -d "{\"operationName\":null,\"variables\":{}, \
    \"query\":\"mutation {  \
    createUserAccess(username:\\\"normal_user_name\\\", password:\\\"normal_user_password\\\") { userId } \
}\"}"
```

Sample output:

```json
{ "data": { "createUserAccess": { "userId": "normal_user_name" } } }
```

## Session Structure

    req
      +- user -- is a small version of OAuthUser object
           +- userId -- is a OAuthUser.userId
           +- scope -- is a OAuthUser.scope
      +- session
           +- userId -- is a OAuthUser.userId

## GraphQL Notes

Use `@UseMiddleware(AdminOnly)` or `@UseMiddleware(UserOnly)` annotation (or decorator) to restrict the query or mutation to the users with `admin` or `user` role only, respectively.

## OAuth Notes

Third-party consuming service should use the following endpoints

Authorisation : `<host uri>/authorize.html` (or your custom .html file)

Request Token : `<host uri>/oauth/token` (you can change this according to your liking in the auth.ts)

Refresh Token : `<host uri>/oauth/token` (you can change this according to your liking in the auth.ts)

Test/Validation : `<host uri>/oauth/account` (you can change this according to your liking in the auth.ts)

## Upgrade Note

This project's structure is designed to overwrite your copy with simple copy & paste (merge mode if you're in Mac) to upgrade your project. But there's just ONE NOTE: Don't overwrite your `index.ts`.
