import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  createRoutesFromElements,
  Route,
  Outlet,
} from 'react-router-dom';
import Home from './pages/home/Home';
import Profiles from './pages/home/Profiles';
import Settings from './pages/home/Settings';
import MainAppBar from './components/appbar/MainAppBar';
import ThemeWrapper from './components/theme/ThemeWrapper';
import useLogStream from './hooks/useLogStream';

function Layout() {
  // Mount the log stream at app level so the rolling buffer accumulates
  // regardless of which page the user is on. Without this, logs that fire
  // while the user isn't on Settings (where LogContainer lives) would be
  // missed because LogContainer is the only other consumer of useLogStream.
  useLogStream();
  return (
    <ThemeWrapper>
      <MainAppBar />
      <Outlet />
    </ThemeWrapper>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route index element={<Home />} />
      <Route path="/profiles" element={<Profiles />} />
      <Route path="/settings" element={<Settings />} />
    </Route>,
  ),
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
