import { useState } from "react";
import axios from "axios";
import "./signup.css";

export function Signup() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSignup = () => {
    axios.post("http://localhost:3000/users/signup", {
      firstname: formData.firstName,
      lastname: formData.lastName,
      username: formData.username,
      password: formData.password,
    })
      .then((response) => {
        const token = `Bearer ${response.data.token}`;
        localStorage.setItem("token", token);
        alert("Signup successful!");
      })
      .catch((error) => {
        console.error(error);
        alert("Signup failed! " + (error.response?.data?.msg || ""));
      });
  };

  return (
    <div className="signup-bg">
      <div className="signup-card">
        <h2 className="signup-title">Join TrekMate 🏔️</h2>

        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
        />
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
        />

        <button onClick={handleSignup}>Sign Up</button>

        <p className="signin-link">
          Already have an account? <a href="/signin">Sign in</a>
        </p>
      </div>
    </div>
  );
}

