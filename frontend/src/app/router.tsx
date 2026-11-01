import { createBrowserRouter } from 'react-router'
import HomePage from './HomePage'
import Layout from './Layout'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    HydrateFallback: () => null,
    children: [
      { index: true, Component: HomePage },
      {
        path: 'dev/primitivas',
        lazy: async () => ({
          Component: (await import('@/features/dev-primitives/PrimitivesPage')).default,
        }),
      },
      {
        path: 'spikes/3d',
        lazy: async () => ({ Component: (await import('@/spikes/three/ThreeSpike')).default }),
      },
    ],
  },
])
