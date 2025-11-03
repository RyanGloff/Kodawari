import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import Tasks from "./pages/Tasks";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'tasks', element: <Tasks /> }
    ],
  },
  { path: "*", element: <h1>404 Not Found</h1> },
]);
