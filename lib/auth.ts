import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

/**
 * NextAuth configuration for email/password authentication
 * 
 * @description
 * Configures:
 * - Credentials provider with bcrypt password validation
 * - JWT session strategy (required for credentials)
 * - Custom session cookie configuration
 * - Session callbacks for user data persistence
 * - Development-friendly debug mode
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      /**
       * Validates user credentials against database
       * 
       * @param credentials - Email and password from login form
       * @returns User object if valid, null otherwise
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined, // Convert null to undefined for NextAuth compatibility
          role: user.role
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',  // We need to keep JWT for credentials provider
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `gibby-chat.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  callbacks: {
    /**
     * JWT callback - Enriches token with user data
     * 
     * @description
     * Handles:
     * - Initial login: Adds user data to token
     * - Session updates: Refreshes user data from database
     */
    async jwt({ token, user, trigger, session: _session }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = (user as any).role || 'user'
      }
      
      // Handle session updates (when update() is called)
      if (trigger === 'update' && token.id) {
        // Fetch the latest user data from database
        const latestUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        })
        
        if (latestUser) {
          token.name = latestUser.name
          token.email = latestUser.email
          token.role = latestUser.role
        }
      }
      
      return token
    },
    /**
     * Session callback - Populates session with token data
     * 
     * @description
     * Ensures session.user contains all necessary fields from JWT
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        ;(session.user as any).role = token.role || 'user'
      }
      return session
    }
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  debug: false, // Disable debug mode to remove console warnings
}