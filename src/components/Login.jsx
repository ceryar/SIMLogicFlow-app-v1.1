import { useState } from 'react';
import axios from 'axios';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post('/api/v1/auth/login', {
        email,
        password
      });

      const { token, email: returnedEmail, role, userId, mustChangePassword } = response.data;

      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('email', returnedEmail);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', userId);
      localStorage.setItem('mustChangePassword', mustChangePassword);

      // Notify parent component
      onLoginSuccess();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <img src="/icons/pwa-192.png" alt="PWA Logo" className="pwa-logo-img" />
          </div>
          <div className="pwa-badge">PROGRESIVE WEB APP</div>
          <h2>SimLogicFlow</h2>
          <p>Please enter your details to sign in.</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className={`login-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
