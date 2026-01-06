-- Fix the last 2 remaining function search_path warnings

-- Fix decrement_booster_uses function
DO $$
DECLARE
    func_signature text;
BEGIN
    -- Find the actual function signature
    SELECT pg_get_function_identity_arguments(p.oid) INTO func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'decrement_booster_uses'
    LIMIT 1;

    IF func_signature IS NOT NULL THEN
        EXECUTE format('ALTER FUNCTION public.decrement_booster_uses(%s) SET search_path = public', func_signature);
        RAISE NOTICE 'Fixed decrement_booster_uses with signature: %', func_signature;
    ELSE
        RAISE NOTICE 'decrement_booster_uses function not found';
    END IF;
END $$;

-- Fix activate_user_booster function
DO $$
DECLARE
    func_signature text;
BEGIN
    -- Find the actual function signature
    SELECT pg_get_function_identity_arguments(p.oid) INTO func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'activate_user_booster'
    LIMIT 1;

    IF func_signature IS NOT NULL THEN
        EXECUTE format('ALTER FUNCTION public.activate_user_booster(%s) SET search_path = public', func_signature);
        RAISE NOTICE 'Fixed activate_user_booster with signature: %', func_signature;
    ELSE
        RAISE NOTICE 'activate_user_booster function not found';
    END IF;
END $$;
