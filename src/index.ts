import "reflect-metadata";

import "dotenv/config";

import { createConnection } from "typeorm";

import path from "path";
import logDebug from "debug";
import express from "express";

import session from "express-session";

// uncomment the follow to enable session via redis
// import connect_redis from "connect-redis";

import { ApolloServer, ApolloServerExpressConfig } from "apollo-server-express";
import { my_util } from "./MyUtil";
import { configure, _passport } from "./auth";
import { ApiKey } from "./entity/ApiKey";
import { OauthClient } from "./entity/OauthClient";
import _ = require("lodash");
import { buildSchema } from "type-graphql";
import cors = require("cors");
import bodyParser from "body-parser";
import shortid = require("shortid");
import { oauth_helper } from "./modules/auth/OAuthHelper";
import { OAuthUser } from "./entity/OAuthUser";

logDebug.log = console.log.bind(console);
logDebug.enable = true;

const startServer = async () => {
	if (!process.env.INITIAL_ADMIN_USERNAME) {
		throw new Error("Missing required configuration INITIAL_ADMIN_USERNAME");
	}
	if (!process.env.INITIAL_ADMIN_PASSWORD) {
		throw new Error("Missing required configuration INITIAL_ADMIN_PASSWORD");
	}
	if (!process.env.EXPRESS_SESSION_SECRET) {
		throw new Error("Missing required configuration EXPRESS_SESSION_SECRET");
	}

	const schema = await buildSchema({
		resolvers: [__dirname + "/entity/**/*.ts", __dirname + "/modules/graphql/resolvers/**/*.ts"],
		authChecker: ({ root, args, context: { req }, info }, roles) => {
			return !!req.session.userId;
		}
	});

	// console.log("schema:", schema);

	const apollo_server_opts = {
		schema,
		context: ({ req, res }) => ({ req, res })
	} as ApolloServerExpressConfig;

	if (process.env.ENABLE_GRAPHQL_PLAYGROUND) {
		apollo_server_opts.playground = apollo_server_opts.introspection = !!process.env.ENABLE_GRAPHQL_PLAYGROUND;
	}

	const server = new ApolloServer(apollo_server_opts);

	await createConnection({
		type: "mongodb",
		host: process.env.MONGODB_HOST || "localhost",
		port: (process.env.MONGODB_PORT && parseInt(process.env.MONGODB_PORT)) || 27017,
		username: process.env.MONGODB_USER || "",
		password: process.env.MONGODB_PASS || "",
		database: process.env.MONGODB_DB || "GraphQLWithOAuth2",
		synchronize: true,
		logging: true,
		entities: ["src/entity/**/*.ts"],
		migrations: ["src/migration/**/*.ts"],
		subscribers: ["src/subscriber/**/*.ts"],
		cli: {
			entitiesDir: "src/entity",
			migrationsDir: "src/migration",
			subscribersDir: "src/subscriber"
		}
	});

	if ((await OAuthUser.count()) === 0) {
		await oauth_helper.createAdminUser(process.env.INITIAL_ADMIN_USERNAME, process.env.INITIAL_ADMIN_PASSWORD);
	}

	const app = express();

	app.use((req, res, next) => {
		console.log("------------------------------------------------------------------------------------------");
		console.log("------------------------------------------------------------------------------------------");
		console.log("------------------------------------------------------------------------------------------");
		// console.log("req", req);
		console.log("req.session", req.session);
		next();
	});

	app.use(require("morgan")("dev"));

	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());
	app.use(express.static(path.join(__dirname, "../../public")));
	// app.use(cors())

	configure(app);

	// uncomment the following to enable session via redis
	// const RedisStore = connect_redis(session);

	app.use(
		session({
			// @ts-ignore
			// uncomment the following to enable session via redis
			// store: new RedisStore({ client: redisClient }),
			saveUninitialized: false,
			resave: false,
			name: "oaw",
			secret: process.env.EXPRESS_SESSION_SECRET,
			cookie: {
				domain: process.env.WEBSITE_DOMAIN || undefined,
				httpOnly: false,
				secure: process.env.NODE_ENV === "production",
				maxAge: 600000,
				path: "/"
			}
		})
	);

	app.use(express.static(__dirname + "/public"));

	server.applyMiddleware({
		app,
		cors: {
			origin: process.env.FRONTEND_BASE_URL || "http://localhost:3000",
			credentials: true
		}
	}); // app is from an existing express app

	const port = (process.env.PORT && parseInt(process.env.PORT)) || 4003;

	app.listen({ port }, () => console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`));
};

startServer().catch(err => {
	console.log("index.ts:: err:", err);
});
