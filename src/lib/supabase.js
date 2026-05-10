/**
 * Supabase Client Configuration
 * Handles authentication and database operations
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Simple Supabase client implementation
class SupabaseClient {
  constructor(url, anonKey) {
    this.url = url;
    this.anonKey = anonKey;
    this.headers = {
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
      'Content-Type': 'application/json'
    };
  }

  async from(table) {
    return new TableQuery(this, table);
  }

  async rpc(functionName, params = {}) {
    const response = await fetch(`${this.url}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`RPC error: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async _request(endpoint, options = {}) {
    const response = await fetch(`${this.url}${endpoint}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || response.statusText);
    }

    return await response.json();
  }
}

class TableQuery {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.queryParams = {};
  }

  select(columns = '*') {
    this.queryParams.select = columns;
    return this;
  }

  eq(column, value) {
    this.queryParams[`${column}.eq`] = value;
    return this;
  }

  neq(column, value) {
    this.queryParams[`${column}.neq`] = value;
    return this;
  }

  gt(column, value) {
    this.queryParams[`${column}.gt`] = value;
    return this;
  }

  gte(column, value) {
    this.queryParams[`${column}.gte`] = value;
    return this;
  }

  lt(column, value) {
    this.queryParams[`${column}.lt`] = value;
    return this;
  }

  lte(column, value) {
    this.queryParams[`${column}.lte`] = value;
    return this;
  }

  like(column, pattern) {
    this.queryParams[`${column}.like`] = pattern;
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.queryParams.order = `${column}.${ascending ? 'asc' : 'desc'}`;
    return this;
  }

  limit(count) {
    this.queryParams.limit = count;
    return this;
  }

  offset(count) {
    this.queryParams.offset = count;
    return this;
  }

  single() {
    this.queryParams.single = true;
    return this;
  }

  async then(resolve, reject) {
    this.exec().then(resolve).catch(reject);
  }

  async exec() {
    let endpoint = `/rest/v1/${this.table}`;
    
    const params = new URLSearchParams();
    if (this.queryParams.select) {
      params.append('select', this.queryParams.select);
    }
    if (this.queryParams.single) {
      params.append('single', 'true');
    }

    // Build filter params
    Object.entries(this.queryParams).forEach(([key, value]) => {
      if (!['select', 'single'].includes(key)) {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    return this.client._request(endpoint);
  }

  async insert(data) {
    return this.client._request(`/rest/v1/${this.table}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async update(data) {
    return this.client._request(`/rest/v1/${this.table}?${new URLSearchParams(this.queryParams).toString()}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async delete() {
    return this.client._request(`/rest/v1/${this.table}?${new URLSearchParams(this.queryParams).toString()}`, {
      method: 'DELETE'
    });
  }
}

// Auth helpers
async function signUp(email, password, companyName) {
  const supabase = window.supabase;
  
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        company_name: companyName
      }
    }
  });

  if (authError) throw authError;

  return authData;
}

async function signIn(email, password) {
  const supabase = window.supabase;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  return data;
}

async function signOut() {
  const supabase = window.supabase;
  await supabase.auth.signOut();
}

async function getCurrentUser() {
  const supabase = window.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getSession() {
  const supabase = window.supabase;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Export for use in modules
export { 
  SupabaseClient, 
  signUp, 
  signIn, 
  signOut, 
  getCurrentUser, 
  getSession,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
};
