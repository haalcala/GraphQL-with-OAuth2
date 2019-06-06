import React from "react";
import queryString from "query-string";

// @ts-ignore
const AuthorizeView = props => {
	// @ts-ignore
	const params = queryString.parse(props.location.search);
	const { grant_type, client_id, state } = params;
	let { redirect_uri } = params;

	console.log("redirect_uri:", redirect_uri);
	console.log("grant_type:", grant_type);
	console.log("client_id:", client_id);
	console.log("state:", state);

	if (redirect_uri) {
		redirect_uri = redirect_uri + (redirect_uri.indexOf("?") >= 0 ? "&" : "?") + "state=" + state;
	}

	let error = "";

	["redirect_uri", "grant_type", "client_id", "state"].map(key => {
		if (!error && typeof params[key] === "undefined") {
			error = `Missing required parameter ${key}`;
		}
	});

	return (
		<section className="main">
			<div id="login-container">
				<img src={require("./images/logo_login.png")} />

				{error ? (
					<section className="error-box">
						<p>{error}</p>
					</section>
				) : (
					""
				)}

				<form
					method="POST"
					action="/oauth/authorize"
					onSubmit={e => {
						if (error) {
							console.log("Submit cancelled");
							e.preventDefault();
						}
					}}
				>
					<div>
						<input name="username" className="form-control" type="text" placeholder="V-CUBE ID" />
					</div>
					<div>
						<input name="password" className="form-control" type="password" placeholder="Password" />
					</div>
					<div>
						<button className={"button_login" + (error ? " button_login_disabled" : "")} type="submit">
							Login
						</button>
					</div>
					<input id="redirect_uri" name="redirect_uri" type="hidden" value={redirect_uri || ""} />
					<input id="grant_type" name="grant_type" type="hidden" value={grant_type || ""} />
					<input id="client_id" name="client_id" type="hidden" value={client_id || ""} />
				</form>
				<section id="tnc-container">
					You have agreed to our <a href="#">Terms & Conditions</a> to use our services.
				</section>
			</div>
		</section>
	);
};

export default AuthorizeView;
