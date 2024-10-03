import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Navigation from "./Navigation";
import "./App.css";

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
