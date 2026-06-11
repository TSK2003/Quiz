import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { auth } from './config/firebase'
import { signOut } from 'firebase/auth'

// Force clear old local sessions once to enforce session persistence
if (localStorage.getItem('clear_old_session_v1') !== 'true') {
  signOut(auth).then(() => {
    localStorage.setItem('clear_old_session_v1', 'true');
  }).catch(console.error);
}

// Note: The admin has already been seeded.
// seedDefaultAdmin();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
