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
        path: 'spikes/svg',
        lazy: async () => ({
          Component: (await import('@/spikes/svg-panzoom/SvgPanZoomSpike')).default,
        }),
      },
      {
        path: 'spikes/pdf',
        lazy: async () => ({ Component: (await import('@/spikes/pdf/PdfSpike')).default }),
      },
      {
        path: 'spikes/3d',
        lazy: async () => ({ Component: (await import('@/spikes/three/ThreeSpike')).default }),
      },
    ],
  },
])
