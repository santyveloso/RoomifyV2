import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "jsmith@example.com" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        console.log("Credentials received:", credentials);
        
        // Check if credentials are provided
        if (!credentials) {
          console.log("No credentials provided");
          return null
        }

        // Check if email and password are provided
        if (!credentials.email || !credentials.password) {
          console.log("Email or password missing:", credentials.email, credentials.password);
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          console.log("User found:", user);

          if (user && bcrypt.compareSync(credentials.password, user.password)) {
            return { id: user.id, name: user.name, email: user.email }
          } else {
            console.log("Invalid credentials for user:", credentials.email);
            return null
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
})