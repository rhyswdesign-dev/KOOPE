-- Enable RLS on all public tables
-- This fixes the Security Advisor errors

-- Enable RLS on lesson_sections
ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;

-- Enable RLS on lesson_questions
ALTER TABLE public.lesson_questions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on lesson_attempts
ALTER TABLE public.lesson_attempts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on lesson_progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Enable RLS on recipe_ingredients
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ingredients
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

-- Enable RLS on recipe_tags
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lesson_sections (readable by all authenticated users)
CREATE POLICY "lesson_sections_select" ON public.lesson_sections
    FOR SELECT
    TO authenticated
    USING (true);

-- Create RLS policies for lesson_questions (readable by all authenticated users)
CREATE POLICY "lesson_questions_select" ON public.lesson_questions
    FOR SELECT
    TO authenticated
    USING (true);

-- Create RLS policies for profiles (users can read all, update own)
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id::uuid);

-- Create RLS policies for lesson_attempts (users can manage their own)
CREATE POLICY "lesson_attempts_select_own" ON public.lesson_attempts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id::uuid);

CREATE POLICY "lesson_attempts_insert_own" ON public.lesson_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "lesson_attempts_update_own" ON public.lesson_attempts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id::uuid);

-- Create RLS policies for lesson_progress (users can manage their own)
CREATE POLICY "lesson_progress_select_own" ON public.lesson_progress
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id::uuid);

CREATE POLICY "lesson_progress_insert_own" ON public.lesson_progress
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "lesson_progress_update_own" ON public.lesson_progress
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id::uuid);

-- Create RLS policies for recipe_ingredients (readable by all authenticated users)
CREATE POLICY "recipe_ingredients_select" ON public.recipe_ingredients
    FOR SELECT
    TO authenticated
    USING (true);

-- Create RLS policies for ingredients (readable by all authenticated users)
CREATE POLICY "ingredients_select" ON public.ingredients
    FOR SELECT
    TO authenticated
    USING (true);

-- Create RLS policies for recipe_tags (readable by all authenticated users)
CREATE POLICY "recipe_tags_select" ON public.recipe_tags
    FOR SELECT
    TO authenticated
    USING (true);

-- Create RLS policies for tags (readable by all authenticated users)
CREATE POLICY "tags_select" ON public.tags
    FOR SELECT
    TO authenticated
    USING (true);
