import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { authenticateByName, getUsers } from '../../services/jellyfinApi';
import './Login.css';

export default function Login() {
  const [loginMode, setLoginMode] = useState<'standard' | 'apikey'>('standard');
  const authServerUrl = useAuthStore(state => state.serverUrl);
  const [serverUrl, setServerUrl] = useState(authServerUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Normalize URL
    let url = serverUrl.trim();
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.startsWith('http')) {
      url = 'http://' + url;
    }

    if (!url) {
      setError('Server URL is required.');
      return;
    }

    setIsLoading(true);

    try {
      if (loginMode === 'standard') {
        if (!username) {
          setError('Username is required.');
          setIsLoading(false);
          return;
        }
        const response = await authenticateByName(url, username, password);
        
        if (!response.AccessToken || !response.User || !response.User.Id || !response.User.Name) {
          throw new Error('Invalid response from server');
        }

        setAuth(url, response.AccessToken, response.User.Id, response.User.Name);
      } else {
        if (!apiKey) {
          setError('API Key is required.');
          setIsLoading(false);
          return;
        }
        // Use API Key to fetch users and select the first one (typically admin)
        const users = await getUsers(url, apiKey);
        if (users && users.length > 0) {
          const primaryUser = users[0];
          if (!primaryUser.Id || !primaryUser.Name) {
            throw new Error('Invalid user data received');
          }
          setAuth(url, apiKey, primaryUser.Id, primaryUser.Name);
        } else {
          setError('No users found on this server.');
        }
      }
    } catch (err) {
      setError('Failed to connect or authenticate. Check your URL and credentials.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background with heavily blurred glassmorphism */}
      <div className="login-background"></div>
      
      <div className="login-card">
        <h1 className="login-title">Connect to Tokoshan</h1>
        <p className="login-subtitle">Enter your server details to continue to SpatialUI.</p>
        
        <div className="login-mode-toggle" style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
          <button 
            type="button" 
            className={loginMode === 'standard' ? 'btn-primary' : 'btn-secondary'} 
            onClick={() => setLoginMode('standard')}
            style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', cursor: 'pointer', border: 'none', background: loginMode === 'standard' ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white' }}
          >
            Username
          </button>
          <button 
            type="button" 
            className={loginMode === 'apikey' ? 'btn-primary' : 'btn-secondary'} 
            onClick={() => setLoginMode('apikey')}
            style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', cursor: 'pointer', border: 'none', background: loginMode === 'apikey' ? 'rgba(255,255,255,0.2)' : 'transparent', color: 'white' }}
          >
            API Key
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="serverUrl">Server URL</label>
            <input 
              id="serverUrl"
              type="text" 
              placeholder="e.g. http://192.168.1.100:8096"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {loginMode === 'standard' ? (
            <>
              <div className="input-group">
                <label htmlFor="username">Username</label>
                <input 
                  id="username"
                  type="text" 
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input 
                  id="password"
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </>
          ) : (
            <div className="input-group">
              <label htmlFor="apiKey">API Key</label>
              <input 
                id="apiKey"
                type="password" 
                placeholder="Enter your server API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Login'}
          </button>

          <button 
            type="button" 
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#e4e4e7',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'background 0.2s'
            }}
            onClick={() => setAuth('http://localhost:8096', 'demo-token', 'demo-user-id', 'Alex')}
          >
            Explore in Demo Mode
          </button>
        </form>
      </div>
    </div>
  );
}
