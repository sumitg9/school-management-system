import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      
      if (response.success) {
        const { user, token, roles, permissions } = response.data;
        
        // Store token and user
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ ...user, roles, permissions }));
        
        setToken(token);
        setUser({ ...user, roles, permissions });
        
        toast.success(response.message || 'Login successful!');
        return { success: true };
      }
    } catch (error) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
      return { success: false, error };
    }
  };

  const register = async (data) => {
    try {
      const response = await authAPI.register(data);
      
      if (response.success) {
        const { user, token } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        setToken(token);
        setUser(user);
        
        toast.success(response.message || 'Registration successful!');
        return { success: true };
      }
    } catch (error) {
      toast.error(error.message || 'Registration failed.');
      return { success: false, error };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      toast.info('Logged out successfully');
    }
  };

  const updateUser = async () => {
    try {
      const response = await authAPI.me();
      if (response.success) {
        const { user, roles, permissions } = response.data;
        const updatedUser = { ...user, roles, permissions };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const hasRole = (role) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const isAdmin = () => {
    return hasRole('super-admin') || hasRole('admin');
  };

  const isTeacher = () => {
    return hasRole('teacher');
  };

  const isStudent = () => {
    return hasRole('student');
  };

  const isParent = () => {
    return hasRole('parent');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    hasRole,
    hasPermission,
    isAdmin,
    isTeacher,
    isStudent,
    isParent,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

