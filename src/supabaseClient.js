import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mzidgtzkeuykhiukyygo.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_AQa5opF_tPVb2eg7vvfDtw_GyM68Iem'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)