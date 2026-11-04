import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  projects: [
    {
      name: 'ipad-webkit',
      testMatch: ['**/tablet.spec.ts', '**/base-plan-pdf.spec.ts'],
      use: {
        ...devices['iPad (gen 7)'],
        browserName: 'webkit',
        viewport: { width: 1024, height: 768 },
      },
    },
  ],
})
