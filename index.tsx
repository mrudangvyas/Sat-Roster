
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppV2 from './AppV2';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const searchParams = new URLSearchParams(window.location.search);
const isV2Path = window.location.pathname.toLowerCase().startsWith('/v2');
const isV2Query = searchParams.get('ui') === 'v2';
const RootApp = isV2Path || isV2Query ? AppV2 : App;

root.render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
