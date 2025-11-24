// Fallback API responses for when backend is not available
// This prevents unhandled promise rejections during development

// Mock users for authentication fallback
const mockUsers = [
  {
    id: 1,
    username: "admin",
    email: "admin@nxe.com",
    displayName: "Admin User",
    role: "admin",
    isVerified: true,
    walletBalance: "1500000"
  },
  {
    id: 2,
    username: "owner",
    email: "owner@nxe.com", 
    displayName: "System Owner",
    role: "owner",
    isVerified: true,
    walletBalance: "10000000"
  },
  {
    id: 3,
    username: "testuser",
    email: "user@nxe.com",
    displayName: "Test User",
    role: "user", 
    isVerified: true,
    walletBalance: "250000"
  }
];

export const fallbackResponses = {
  '/products': [
    {
      id: 1,
      title: 'ML Mythic Account - 50 Skins',
      description: 'Akun Mobile Legends rank Mythic dengan 50+ skin hero premium.',
      category: 'MOBA',
      price: 150000,
      thumbnail: 'https://via.placeholder.com/300x200',
      rating: 4.8,
      seller: { username: 'gamer123', display_name: 'Pro Gamer' }
    },
    {
      id: 2,
      title: 'PUBG Mobile Conqueror Account',
      description: 'Akun PUBG Mobile rank Conqueror dengan outfit rare.',
      category: 'Battle Royale',
      price: 200000,
      thumbnail: 'https://via.placeholder.com/300x200',
      rating: 4.9,
      seller: { username: 'gamer123', display_name: 'Pro Gamer' }
    }
  ],
  '/user': () => {
    // Check if user is authenticated in fallback mode
    const token = localStorage.getItem('auth_token');
    const persistedUser = localStorage.getItem('auth_user');
    
    if (token && persistedUser && token.startsWith('mock_jwt_token_')) {
      try {
        return JSON.parse(persistedUser);
      } catch {
        return null;
      }
    }
    return null;
  },
  '/login': { 
    success: (email: string, password: string) => {
      // Mock login validation
      const validCredentials = [
        { email: 'admin@nxe.com', password: 'admin123', user: mockUsers[0] },
        { email: 'owner@nxe.com', password: 'owner123', user: mockUsers[1] },
        { email: 'user@nxe.com', password: 'user123', user: mockUsers[2] }
      ];
      
      const match = validCredentials.find(cred => cred.email === email && cred.password === password);
      if (match) {
        const token = 'mock_jwt_token_' + Date.now();
        // Persist user in localStorage for fallback mode session persistence
        localStorage.setItem('auth_user', JSON.stringify(match.user));
        return { token, user: match.user };
      }
      throw new Error('Invalid credentials');
    }
  },
  '/register': {
    success: (userData: any) => {
      const newUser = {
        id: Date.now(),
        username: userData.username,
        email: userData.email,
        displayName: userData.displayName || userData.username,
        role: 'user',
        isVerified: false,
        walletBalance: '0'
      };
      const token = 'mock_jwt_token_' + Date.now();
      // Persist user in localStorage for fallback mode session persistence
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      return { token, user: newUser };
    }
  },
  '/logout': { 
    success: () => {
      // Clear persisted user data in fallback mode
      localStorage.removeItem('auth_user');
      return { success: true };
    }
  },
  '/chats': [],
  '/transactions': [],
  '/status-updates': []
};

export function getFallbackResponse(endpoint: string, method: string = 'GET', body?: any) {
  const key = endpoint.replace('/api', '');
  const response = fallbackResponses[key as keyof typeof fallbackResponses];
  
  // Handle authentication endpoints with body data
  if (key === '/login' && method === 'POST' && body) {
    try {
      const { email, password } = JSON.parse(body);
      return (response as any).success(email, password);
    } catch (error) {
      throw new Error('Invalid login request');
    }
  }
  
  if (key === '/register' && method === 'POST' && body) {
    try {
      const userData = JSON.parse(body);
      return (response as any).success(userData);
    } catch (error) {
      throw new Error('Invalid registration request');
    }
  }
  
  if (key === '/logout' && method === 'POST') {
    return (response as any).success();
  }
  
  if (key === '/user' && method === 'GET') {
    return typeof response === 'function' ? (response as any)() : response;
  }
  
  return response || [];
}