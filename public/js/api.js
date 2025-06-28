// public/js/api.js

// ⬇️ !! IMPORTANT !! ⬇️
// Yahan Supabase se copy ki hui URL aur Key daalein
const SUPABASE_URL = 'https://knjtpsygbbtjunethhoj.supabase.co'; // Isko replace karein
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuanRwc3lnYmJ0anVuZXRoaG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTA0MTMsImV4cCI6MjA2NjY4NjQxM30.ILwWlSbymruyz_UZJXbtqbm6i3dVZNKWV0iqUK-Z4fY'; // Isko replace karein

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- AUTH FUNCTIONS ---
async function signUp(email, password, companyName) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { company_name: companyName } // Trigger isse handle karega
        }
    });
    if (error) throw error;
    return data;
}

async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
    return data;
}

async function signOut() {
    await supabase.auth.signOut();
}

function getCurrentUser() {
    return supabase.auth.getUser();
}


// --- GENERIC DATABASE FUNCTIONS ---
/**
 * Database se data fetch karta hai
 * @param {string} table - Table ka naam (e.g., 'leads')
 * @returns {Promise<Array>}
 */
async function fetchData(table) {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) {
        console.error(`Error fetching from ${table}:`, error);
        return [];
    }
    return data;
}

/**
 * Database me naya data daalta hai
 * @param {string} table 
 * @param {object} record 
 * @returns {Promise<object>}
 */
async function insertData(table, record) {
    const { data, error } = await supabase.from(table).insert([record]).select();
    if (error) {
        console.error(`Error inserting into ${table}:`, error);
        throw error;
    }
    return data[0];
}

/**
 * Database se data delete karta hai
 * @param {string} table 
 * @param {number} id 
 */
async function deleteData(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
        console.error(`Error deleting from ${table}:`, error);
        throw error;
    }
}