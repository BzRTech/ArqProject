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
        path: 'entrar',
        ErrorBoundary: ErrorPage,
        lazy: async () => ({ Component: (await import('@/features/auth/LoginPage')).default }),
      },
      {
        // Rotas que exigem login (projetos no servidor)
        lazy: async () => ({ Component: (await import('@/features/auth/RequireAuth')).default }),
        ErrorBoundary: ErrorPage,
        children: [
          {
            path: 'projetos',
            ErrorBoundary: ErrorPage,
            lazy: async () => ({
              Component: (await import('@/features/projects/ProjectsPage')).default,
            }),
          },
          {
            path: 'banco',
            ErrorBoundary: ErrorPage,
            lazy: async () => ({
              Component: (await import('@/features/library/LibraryPage')).default,
            }),
          },
          {
            path: 'projetos/:id',
            ErrorBoundary: ErrorPage,
            lazy: async () => ({
              Component: (await import('@/features/projects/ProjectEditorPage')).default,
            }),
          },
        ],
      },
      {
        // Rascunho local (sem conta): salvo só neste navegador.
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
