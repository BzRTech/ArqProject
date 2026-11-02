import { createBrowserRouter } from 'react-router'
import ErrorPage from './ErrorPage'
import HomePage from './HomePage'
import Layout from './Layout'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    HydrateFallback: () => null,
    ErrorBoundary: ErrorPage,
    children: [
      { index: true, Component: HomePage, ErrorBoundary: ErrorPage },
      {
        path: 'editor',
        ErrorBoundary: ErrorPage,
        lazy: async () => ({
          Component: (await import('@/features/plan-editor/EditorPage')).default,
        }),
      },
      {
        path: 'dev/primitivas',
        ErrorBoundary: ErrorPage,
        lazy: async () => ({
          Component: (await import('@/features/dev-primitives/PrimitivesPage')).default,
        }),
      },
      {
        path: 'spikes/3d',
        ErrorBoundary: ErrorPage,
        lazy: async () => ({ Component: (await import('@/spikes/three/ThreeSpike')).default }),
      },
    ],
  },
])
