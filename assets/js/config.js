/* Nestify public configuration.
   Only browser-safe values belong here. The anon key is designed to be public and is
   limited by row-level security. NEVER put a service-role key or M-Pesa secret in this file. */
window.NESTIFY_CONFIG = {
  supabaseUrl: 'https://bpowsaqvxfsvbcdkjcbp.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwb3dzYXF2eGZzdmJjZGtqY2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NjM0NjksImV4cCI6MjEwNzMzOTQ2OX0.s2BnnCX6f_N2wnA4AMP2m8hRbKFdsyIWtr_Gd9bN5_8',
  googleMapsApiKey: '', // optional: enables address search and a draggable pin in the agent portal
  appName: 'Nestify',
  currency: 'KES',
  country: 'KE'
};
