const unsupported = (operation: string): never => {
  throw new Error(
    `${operation} is no longer supported via WordPress helpers. Use Supabase auth utilities instead.`,
  )
}

export async function signIn(_username: string, _password: string): Promise<never> {
  return unsupported("signIn")
}

export async function getCurrentUser(_token: string): Promise<never> {
  return unsupported("getCurrentUser")
}

export async function signUp(_username: string, _email: string, _password: string): Promise<never> {
  return unsupported("signUp")
}

export async function resetPassword(_email: string): Promise<never> {
  return unsupported("resetPassword")
}

export async function getAuthToken(_request: Request): Promise<never> {
  return unsupported("getAuthToken")
}

export async function signOut(): Promise<never> {
  return unsupported("signOut")
}
