import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jhemdroqixfzchdwlttz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZW1kcm9xaXhmemNoZHdsdHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNjg3OTYsImV4cCI6MjA5MDk0NDc5Nn0.EmxG8XBwW-GnrkVv6prEAGGOR282TxYHhOhGNfJmTn8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
