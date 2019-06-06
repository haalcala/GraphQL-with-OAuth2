import React from "react";
import { Switch, Route, HashRouter } from "react-router-dom";
import App from "./App";
import AuthorizeView from "./AuthorizeView";
import Footer from "./Footer";

const Routes = () => {
  return (
    <HashRouter>
      <div style={{ height: "100%", display: "flex", flexDirection: "column-reverse" }}>
        <Footer />
        <Switch>
          <Route path="/" exact component={App} />
          <Route path="/authorize" component={AuthorizeView} />
        </Switch>
      </div>
    </HashRouter>
  );
};

export default Routes;
