import assert from 'assert'
import { Module } from 'module'

// Mock next/navigation and react so we can run the hook outside of a React component
const pushed: string[] = []
const originalLoad = (Module as any)._load
;(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'next/navigation') {
    return {
      useRouter: () => ({ push: (url: string) => pushed.push(url) }),
      usePathname: () => '/',
    }
  }
  if (request === 'react') {
    return { useCallback: (fn: any) => fn }
  }
  return originalLoad.apply(this, arguments as any)
}

// Import after mocking
const { useNavigationRouting } = require('../hooks/useNavigationRouting')

;(function () {
  // Selecting "Eswatini" should push "/sz" so API calls target
  // https://newsonafrica.com/sz/... endpoints
  const { navigateTo } = useNavigationRouting()
  navigateTo(undefined, 'sz')

  // Restore original loader
  ;(Module as any)._load = originalLoad

  assert.strictEqual(pushed[0], '/sz', 'navigateTo should push /sz')
  console.log('navigationRouting test passed')
})()
