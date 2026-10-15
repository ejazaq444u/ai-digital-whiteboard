import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { WhiteboardProvider } from './context/WhiteboardContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <WhiteboardProvider>
          <App />
        </WhiteboardProvider>
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
);
