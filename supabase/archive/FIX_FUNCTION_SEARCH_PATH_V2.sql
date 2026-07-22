-- Fix search_path warnings for functions (Updated Version)
-- This improves function performance and security

-- First, let's check which functions exist and fix only those
-- Run each ALTER statement separately to see which ones work

-- Fix handle_updated_at function (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        ALTER FUNCTION public.handle_updated_at() SET search_path = public;
        RAISE NOTICE 'Fixed handle_updated_at';
    END IF;
END $$;

-- Fix handle_new_user function (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        ALTER FUNCTION public.handle_new_user() SET search_path = public;
        RAISE NOTICE 'Fixed handle_new_user';
    END IF;
END $$;

-- Fix update_updated_at_column function (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
        RAISE NOTICE 'Fixed update_updated_at_column';
    END IF;
END $$;

-- Fix handle_new_user_vault_profile function (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user_vault_profile') THEN
        ALTER FUNCTION public.handle_new_user_vault_profile() SET search_path = public;
        RAISE NOTICE 'Fixed handle_new_user_vault_profile';
    END IF;
END $$;

-- Try to fix decrement_booster_uses with different signatures
DO $$
BEGIN
    -- Try with (uuid, text) signature
    BEGIN
        ALTER FUNCTION public.decrement_booster_uses(uuid, text) SET search_path = public;
        RAISE NOTICE 'Fixed decrement_booster_uses(uuid, text)';
    EXCEPTION WHEN undefined_function THEN
        -- Try with named parameters
        BEGIN
            ALTER FUNCTION public.decrement_booster_uses(user_id uuid, booster_type text) SET search_path = public;
            RAISE NOTICE 'Fixed decrement_booster_uses(user_id uuid, booster_type text)';
        EXCEPTION WHEN undefined_function THEN
            RAISE NOTICE 'decrement_booster_uses function not found';
        END;
    END;
END $$;

-- Try to fix activate_user_booster with different signatures
DO $$
BEGIN
    -- Try with (uuid, text) signature
    BEGIN
        ALTER FUNCTION public.activate_user_booster(uuid, text) SET search_path = public;
        RAISE NOTICE 'Fixed activate_user_booster(uuid, text)';
    EXCEPTION WHEN undefined_function THEN
        -- Try with named parameters
        BEGIN
            ALTER FUNCTION public.activate_user_booster(p_user_id uuid, p_booster_type text) SET search_path = public;
            RAISE NOTICE 'Fixed activate_user_booster(p_user_id uuid, p_booster_type text)';
        EXCEPTION WHEN undefined_function THEN
            RAISE NOTICE 'activate_user_booster function not found';
        END;
    END;
END $$;

-- Try to fix check_booster_expiry with different signatures
DO $$
BEGIN
    -- Try with (uuid) signature
    BEGIN
        ALTER FUNCTION public.check_booster_expiry(uuid) SET search_path = public;
        RAISE NOTICE 'Fixed check_booster_expiry(uuid)';
    EXCEPTION WHEN undefined_function THEN
        -- Try with named parameter
        BEGIN
            ALTER FUNCTION public.check_booster_expiry(p_user_id uuid) SET search_path = public;
            RAISE NOTICE 'Fixed check_booster_expiry(p_user_id uuid)';
        EXCEPTION WHEN undefined_function THEN
            RAISE NOTICE 'check_booster_expiry function not found';
        END;
    END;
END $$;
