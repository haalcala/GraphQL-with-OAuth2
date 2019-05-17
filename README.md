# GraphQL With OAuth2

This is a bare bone GraphQL with OAuth2.0 support or OAuth2.0 server with graphql capability, depending on how to want to utilise this base setup.

Use case #1: You can just either use this project to serve as an ready-made OAuth2 server for your system. In this case, graphql is entirely optional. You can use the graphql to create the API Keys/secret for consistency (refer to the commands below)

Use case #2: Build a suite of graphql queries that compliment your business needs and enjoy a super admin access via Oauth2.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Steps to run this project:

1. Run `yarn` command
2. Setup database settings inside `.env` file
3. Customise src/auth.ts according to your authentication needs
4. Run `yarn start_dev` command

## Setup your OAuth2 access

### Login as admin

You can use curl or the UI with your browser at http://localhost:4003/graphql

Use the values for INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD

    curl --cookies cookies.jar --cookie-jar cookies.jar -H 'Content-Type: application/json' -XPOST http://localhost:4003/graphql -d '{"operationName":null,"variables":{},"query":"mutation {  loginAdmin(username: \"my_admin\", password: \"my_admin\") { id email  }}"}'

Sample output:

    {"data":{"loginAdmin":{"id":"5cdd1295cb7c214366c1b76c","email":""}}}

### A quick test

    curl --cookies cookies.jar --cookie-jar cookies.jar -H 'Content-Type: application/json' -XPOST http://localhost:4003/graphql -d '{"operationName":null,"variables":{},"query":"{  getUsers { id email  }}"}'

Sample output:

    {"data":{"getUsers":[]}}

### Create a client_id and secret key for your app!

    curl --cookies cookies.jar --cookie-jar cookies.jar -H 'Content-Type: application/json' -XPOST http://localhost:4003/graphql -d '{"operationName":null,"variables":{},"query":"mutation {  createOAuthAccess { clientId clientSecret  }}"}'

Sample output:

    {"data":{"createOAuthAccess":{"clientId":"my_admin","clientSecret":"c4d226c99081d984562c55a74bfc245b2ad21a70a441873b102e15b521c2a7da"}}}
