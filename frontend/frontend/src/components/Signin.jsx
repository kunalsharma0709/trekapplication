import { useState } from "react";
import axios from "axios";
import "./signup.css"; // reuse the Signup CSS, works for Signin too

export function Signin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSignin = () => {
    axios.post("http://localhost:3000/users/signin", {
      username,
      password,
    })
      .then((response) => {
        const token = `Bearer ${response.data.token}`;
        localStorage.setItem("token", token);
        alert("Signed in successfully!");
      })
      .catch((error) => {
        console.error(error);
        alert("Signin failed! " + (error.response?.data?.msg || ""));
      });
  };

  return (
    <div className="signup-bg">
      <div className="signup-card">
        <h2 className="signup-title">Welcome Back 🏔️</h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleSignin}>Sign In</button>

        <p className="signin-link">
          Don't have an account? <a href="/signup">Sign up</a>
        </p>
      </div>
    </div>
  );
}
