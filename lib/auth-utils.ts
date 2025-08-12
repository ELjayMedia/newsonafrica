import { client } from "@/lib/api/wordpress"
import { gql } from "graphql-request"

interface User {
  id: string
  name: string
  email: string
}

export async function createOrUpdateUser(userData: { id: string; name: string; email: string }): Promise<User> {
  const mutation = gql`
    mutation CreateOrUpdateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        user {
          id
          name
          email
        }
      }
    }
  `

  const variables = {
    input: {
      username: userData.id,
      email: userData.email,
      name: userData.name,
      roles: ["subscriber"],
    },
  }

  try {
    const response = await client.request(mutation, variables)
    return response.createUser.user
  } catch (error) {
    console.error("Error creating or updating user:", error)
    throw new Error("Failed to create or update user")
  }
}

export async function createUserSession(user: User): Promise<string> {
  // In a real-world scenario, you'd create a session in your database
  // and return a session token. For this example, we'll use a simple JWT.
  const jwt = require("jsonwebtoken")
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" })
  return token
}
