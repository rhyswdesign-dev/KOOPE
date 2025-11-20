import '../src/lib/supabase';
import { supabase } from '../src/lib/supabase';

async function checkRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, image_url')
    .or('title.ilike.%john collins%,title.ilike.%ward 8%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== Recipe Check ===\n');
  data?.forEach(recipe => {
    console.log(`ID: ${recipe.id}`);
    console.log(`Title: ${recipe.title}`);
    console.log(`Image URL: ${recipe.image_url}`);
    console.log('---');
  });
}

checkRecipes().then(() => process.exit(0));
