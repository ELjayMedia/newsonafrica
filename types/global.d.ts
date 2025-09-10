interface Window {
  adsbygoogle?: any[]
}

interface NavigatorConnection {
  downlink?: number
  effectiveType?: string
  rtt?: number
  saveData?: boolean
}

interface Navigator {
  connection?: NavigatorConnection
}

declare module '@testing-library/jest-dom/matchers' {
  const matchers: any
  export default matchers
}
