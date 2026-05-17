import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';


const SUPABASE_URL = 'https://pzacwnblpoiilkimrgrn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BDarYfGZGj8U_GicZ9aNvg_PdCqca0r';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);