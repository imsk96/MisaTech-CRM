// netlify/functions/indiamart-push.js

// Supabase library ko import karein
const { createClient } = require('@supabase/supabase-js');

// Environment Variables se Supabase keys lein (jo humne Netlify me save ki thi)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Supabase client banayein
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Main function jo Netlify run karega
exports.handler = async function(event, context) {
    // Sirf POST requests ko allow karein (IndiaMART POST request bhejta hai)
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
        };
    }

    try {
        // Step 1: URL se API key nikalein (e.g., ...?apiKey=crm_xxxx)
        const apiKey = event.queryStringParameters.apiKey;
        if (!apiKey) {
            return { statusCode: 401, body: 'API key is required.' };
        }

        // Step 2: API key se organization ko dhoondhein
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('api_key', apiKey)
            .single(); // .single() se ek hi result milega

        // Agar key galat hai ya nahi mili, to error bhejein
        if (orgError || !org) {
            return { statusCode: 403, body: 'Invalid API key.' };
        }
        
        // Step 3: IndiaMART se aaya hua data (JSON format me hota hai)
        const leadData = JSON.parse(event.body);

        // Step 4: Database me save karne ke liye record taiyyar karein
        const recordToInsert = {
            organization_id: org.id, // Sahi organization ki ID daalein
            data: leadData           // Pura lead data JSON 'data' column me daalein
        };

        // Step 5: 'leads' table me data insert karein
        const { error: insertError } = await supabase.from('leads').insert(recordToInsert);

        if (insertError) {
            // Agar database me save karte waqt error aaye
            throw new Error(`Supabase insert error: ${insertError.message}`);
        }

        // Step 6: IndiaMART ko success response bhejein
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Lead processed successfully' }),
        };

    } catch (error) {
        // Agar poore process me kahin bhi error aaye
        console.error('Error processing lead:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to process lead: ${error.message}` }),
        };
    }
};