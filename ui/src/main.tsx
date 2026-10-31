import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeApp, useApp } from './store/app';
import './styles.css';

initializeApp();
if (useApp.getState().conversations.length === 0) useApp.getState().createConversation();

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

