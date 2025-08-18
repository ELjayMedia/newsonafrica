import { signIn, signUp, resetPassword, getCurrentUser, getAuthToken, signOut } from "./authFunctions"
import env from "@/lib/config/env";

export const getLinkedInAuthUrl = () => {
  const clientId = env.LINKEDIN_API_KEY
  if (!clientId) {
    throw new Error("LinkedIn API key not configured")
  }

  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&scope=r_liteprofile%20r_emailaddress%20w_member_social&state=linkedin_auth`
}

// Named exports for deployment compatibility
export { signIn, signUp, resetPassword, getCurrentUser, getAuthToken, signOut }
