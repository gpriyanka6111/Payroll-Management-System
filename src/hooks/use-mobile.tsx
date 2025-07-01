import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Set the value on the client side only after the initial render
    checkDevice()
    window.addEventListener("resize", checkDevice)

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", checkDevice)
  }, [])

  return isMobile
}
