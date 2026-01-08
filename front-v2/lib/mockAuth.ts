/**
 * MOCK DATA FOR DEVELOPMENT/TESTING ONLY
 * 
 * This file contains test credentials for development purposes.
 * 
 * HOW TO REMOVE:
 * 1. Delete this file: front-v2/lib/mockAuth.ts
 * 2. In front-v2/app/login/page.tsx, remove:
 *    - Line: import { getMockToken } from "@/lib/mockAuth";
 *    - The try-catch block that calls getMockToken
 * 3. Ensure your backend is running on the correct port
 * 
 * TEST CREDENTIALS:
 * Email: demo@tivit.com
 * Password: demo123456
 */

interface MockUser {
  email: string;
  password: string;
  full_name: string;
  access_token: string;
}

const MOCK_USERS: Record<string, MockUser> = {
  demo: {
    email: "demo@tivit.com",
    password: "demo123456",
    full_name: "Usuario Demo",
    access_token: "mock_token_demo_user_12345",
  },
  admin: {
    email: "admin@tivit.com",
    password: "admin123456",
    full_name: "Administrador",
    access_token: "mock_token_admin_user_12345",
  },
  test: {
    email: "test@tivit.com",
    password: "test123456",
    full_name: "Usuario Test",
    access_token: "mock_token_test_user_12345",
  },
};

/**
 * Simulates authentication by checking credentials against mock users
 * Returns a token if credentials match, otherwise returns null
 */
export function getMockToken(
  email: string,
  password: string,
): { access_token: string; full_name: string } | null {
  const user = Object.values(MOCK_USERS).find(
    (u) => u.email === email && u.password === password,
  );

  if (user) {
    return {
      access_token: user.access_token,
      full_name: user.full_name,
    };
  }

  return null;
}

/**
 * Get all available mock credentials for reference
 */
export function getAllMockCredentials() {
  return Object.values(MOCK_USERS).map((user) => ({
    email: user.email,
    password: user.password,
  }));
}
