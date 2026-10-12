import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://emnpbyitubgemwyaccxe.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_z8ImBTh1osfvEwikWCBotw_A_H4l7BG";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be set in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
