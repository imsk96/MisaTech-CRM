/**
 * Authentication Manager
 * Handles user authentication, sessions, and role management
 */

import { SupabaseClient } from '../lib/supabase.js';
import { ROLES, STORAGE_KEYS } from '../utils/constants.js';
import { toast, getInitials } from '../utils/helpers.js';

class AuthManager {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.companyId = null;
    this.userRole = null;
    this.isAuthenticated = false;
    this.authListeners = [];
  }

  /**
   * Initialize Supabase client
   */
  init(supabaseUrl, supabaseKey) {
    this.supabase = new SupabaseClient(supabaseUrl, supabaseKey);
    window.supabase = this.supabase;
    return this;
  }

  /**
   * Check if user is already logged in
   */
  async checkSession() {
    try {
      const sessionData = localStorage.getItem(STORAGE_KEYS.USER);
      if (!sessionData) {
        return false;
      }

      const session = JSON.parse(sessionData);
      
      // Verify session is still valid
      const user = await this.getCurrentUser();
      if (user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        await this.loadUserCompany();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Session check failed:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Sign up new user
   */
  async signUp(email, password, companyName) {
    try {
      // In a real implementation, this would use Supabase auth
      // For now, we'll simulate the flow
      
      const userId = `user_${Date.now()}`;
      
      // Create company first
      const companyResponse = await this.supabase.from('companies').insert({
        name: companyName,
        created_at: new Date().toISOString()
      });

      if (companyResponse.length > 0) {
        this.companyId = companyResponse[0].id;
      } else {
        // Fallback - generate local ID
        this.companyId = `comp_${Date.now()}`;
      }

      // Store user info
      const userData = {
        id: userId,
        email,
        company_id: this.companyId,
        role: ROLES.ADMIN,
        company_name: companyName
      };

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify({
        id: this.companyId,
        name: companyName
      }));

      this.currentUser = userData;
      this.userRole = ROLES.ADMIN;
      this.isAuthenticated = true;

      toast.success('Account created successfully!');
      return { success: true, user: userData };

    } catch (error) {
      console.error('Sign up error:', error);
      toast.error('Failed to create account. Please try again.');
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign in existing user
   */
  async signIn(email, password) {
    try {
      // Fetch user from Supabase
      const users = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (!users || users.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = Array.isArray(users) ? users[0] : users;

      // In production, verify password hash here
      // For demo, we accept any password for existing users

      // Get company info
      const companies = await this.supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single();

      const company = Array.isArray(companies) ? companies[0] : companies;

      const userData = {
        id: user.id,
        email: user.email,
        company_id: user.company_id,
        role: user.role || ROLES.STAFF,
        company_name: company?.name || 'Unknown'
      };

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify({
        id: user.company_id,
        name: company?.name || 'Unknown'
      }));

      this.currentUser = userData;
      this.userRole = userData.role;
      this.companyId = user.company_id;
      this.isAuthenticated = true;

      toast.success(`Welcome back, ${user.email}!`);
      return { success: true, user: userData };

    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Invalid email or password');
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      this.clearSession();
      this.notifyListeners('logout');
      toast.info('Signed out successfully');
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const sessionData = localStorage.getItem(STORAGE_KEYS.USER);
      if (sessionData) {
        this.currentUser = JSON.parse(sessionData);
        return this.currentUser;
      }
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Get user's company ID
   */
  getCompanyId() {
    return this.companyId || this.currentUser?.company_id;
  }

  /**
   * Get user's role
   */
  getUserRole() {
    return this.userRole || this.currentUser?.role;
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.getUserRole() === ROLES.ADMIN;
  }

  /**
   * Check if user is staff
   */
  isStaff() {
    return this.getUserRole() === ROLES.STAFF;
  }

  /**
   * Load user's company information
   */
  async loadUserCompany() {
    try {
      if (!this.currentUser?.company_id) return;

      const companies = await this.supabase
        .from('companies')
        .select('*')
        .eq('id', this.currentUser.company_id)
        .single();

      const company = Array.isArray(companies) ? companies[0] : companies;
      
      if (company) {
        localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(company));
      }
    } catch (error) {
      console.error('Load company error:', error);
    }
  }

  /**
   * Clear session data
   */
  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.COMPANY);
    this.currentUser = null;
    this.companyId = null;
    this.userRole = null;
    this.isAuthenticated = false;
  }

  /**
   * Add auth state listener
   */
  addAuthListener(callback) {
    this.authListeners.push(callback);
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify listeners of auth changes
   */
  notifyListeners(event) {
    this.authListeners.forEach(callback => callback(event, this.currentUser));
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials() {
    const email = this.currentUser?.email || '';
    const name = email.split('@')[0];
    return getInitials(name);
  }

  /**
   * Require authentication - redirect if not authenticated
   */
  requireAuth(redirectPath = '/auth.html') {
    if (!this.isAuthenticated) {
      window.location.href = redirectPath;
      return false;
    }
    return true;
  }

  /**
   * Require admin role - redirect if not admin
   */
  requireAdmin(redirectPath = '/') {
    if (!this.isAdmin()) {
      toast.error('Access denied. Admin privileges required.');
      window.location.href = redirectPath;
      return false;
    }
    return true;
  }
}

// Export singleton instance
export const authManager = new AuthManager();
export default authManager;
