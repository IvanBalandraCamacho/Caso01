# Mock Authentication Setup

## Overview
Mock authentication has been set up to allow testing without a live backend. This fallback system will only activate if the real backend is unavailable.

## Available Test Credentials

| Email | Password | Description |
|-------|----------|-------------|
| `demo@tivit.com` | `demo123456` | Demo user account |
| `admin@tivit.com` | `admin123456` | Admin user account |
| `test@tivit.com` | `test123456` | Test user account |

## How It Works

1. The login form attempts to authenticate against the real backend at `/auth/login`
2. If the backend request fails, it automatically falls back to mock credentials
3. If credentials match a mock user, a mock token is generated
4. The mock token is stored in localStorage just like a real authentication would

**Note:** If the backend is running and returns a proper response (even an error), the mock fallback is NOT used.

## How to Remove Mock Authentication

### Step 1: Delete the mock auth file
```bash
rm frontend/src/lib/mockAuth.ts
```

### Step 2: Remove mock auth from login page
Edit `frontend/src/app/login/page.tsx` and:

1. **Remove the import statement** (line 8):
   ```typescript
   // Remove this line:
   import { getMockToken } from "@/lib/mockAuth";
   ```

2. **Remove the fallback logic** (lines 54-61 approx):
   ```typescript
   // Remove these 8 lines from the handleLogin function:
   const mockResult = getMockToken(email, password);
   if (mockResult) {
     const data = mockResult;
     localStorage.setItem('access_token', data.access_token);
     window.dispatchEvent(new Event('loginSuccess'));
     showToast(`¡Bienvenido ${data.full_name}! (Datos Mock)`, "welcome");
     setTimeout(() => router.push('/'), 800);
     return;
   }
   ```

### Step 3: Verify

After removing:
- The login form will only work with a live backend
- Any authentication attempt without a backend will show an error
- The "(Datos Mock)" indicator will no longer appear in welcome messages

## Files Modified

- `frontend/src/app/login/page.tsx` - Added mock fallback logic
- `frontend/src/lib/mockAuth.ts` - New file with mock credentials (can be deleted)

## Troubleshooting

**Getting "(Datos Mock)" in welcome message:**
- The backend is not responding properly
- Check that your backend API is running on the configured port
- Ensure `NEXT_PUBLIC_API_BASE_URL` environment variable is set correctly

**Mock authentication not working:**
- Check if the credentials match exactly (case-sensitive)
- Verify the email and password from the table above
- Check browser console for error messages
