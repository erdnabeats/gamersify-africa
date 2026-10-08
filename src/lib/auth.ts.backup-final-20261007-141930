type User = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  teamId?: string;
};

let cachedUser: User | null = null;
let checked = false;

async function getUser(): Promise<User | null> {
  if (checked) return cachedUser;

  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    if (!response.ok) {
      cachedUser = null;
      checked = true;
      return null;
    }

    const data = await response.json();

    cachedUser = data?.authenticated
      ? data.user
      : null;

    checked = true;
    return cachedUser;
  } catch {
    cachedUser = null;
    checked = true;
    return null;
  }
}

async function login(
  email: string,
  password: string
): Promise<User> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error || 'Invalid email or password.'
    );
  }

 const user = data?.user as User | undefined;

if (!user) {
  throw new Error('Login response did not contain a user.');
}

cachedUser = user;
checked = true;

return user;
}

async function signOut() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    cachedUser = null;
    checked = true;
  }
}

export const auth = {
  async login(email: string, password: string) {
    return login(email, password);
  },

  async signIn(_options?: any) {
    throw new Error(
      'Local login requires email and password.'
    );
  },

  async signOut() {
    return signOut();
  },

  async getUser() {
    return getUser();
  },

  isSignedIn() {
    return cachedUser !== null;
  },

  clear() {
    cachedUser = null;
    checked = false;
  },
};
