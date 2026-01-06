-- Fix search_path warnings for functions
-- This improves function performance and security

-- Fix handle_updated_at function
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- Fix handle_new_user function
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Fix decrement_booster_uses function
ALTER FUNCTION public.decrement_booster_uses(user_id uuid, booster_type text) SET search_path = public;

-- Fix update_updated_at_column function
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Fix handle_new_user_vault_profile function
ALTER FUNCTION public.handle_new_user_vault_profile() SET search_path = public;

-- Fix activate_user_booster function
ALTER FUNCTION public.activate_user_booster(p_user_id uuid, p_booster_type text) SET search_path = public;

-- Fix check_booster_expiry function
ALTER FUNCTION public.check_booster_expiry(p_user_id uuid) SET search_path = public;
