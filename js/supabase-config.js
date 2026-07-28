// Substitua pelos seus dados do painel Supabase (Settings > API)
const SUPABASE_URL = 'https://wthvlmdoxolosacruosb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0aHZsbWRveG9sb3NhY3J1b3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDEyNDcsImV4cCI6MjEwMDgxNzI0N30.JW3GispsRDpe-2IsxlzbXFmdXquVe_JgLicQqkm-0q4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);