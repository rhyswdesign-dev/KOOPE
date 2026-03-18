// @ts-nocheck
import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { log } from '../lib/logger';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: number;
  servings?: number;
  ingredients: Array<{
    name: string;
    amount: string;
    optional?: boolean;
  }>;
  instructions: string[];
  tags: string[];
  author?: {
    name: string;
    username?: string;
  };
  notes?: string[];
}

class PDFService {
  private generateRecipeHTML(recipe: Recipe): string {
    const difficultyColor = this.getDifficultyColor(recipe.difficulty);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${recipe.title}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
            color: #333;
            background-color: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #D4A574;
            padding-bottom: 20px;
          }
          .title {
            font-size: 32px;
            font-weight: bold;
            color: #1E1712;
            margin: 0 0 10px 0;
          }
          .subtitle {
            font-size: 18px;
            color: #666;
            font-style: italic;
            margin: 0;
          }
          .recipe-meta {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 20px 0;
            flex-wrap: wrap;
          }
          .meta-item {
            background: #F4ECE4;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            color: #1E1712;
            border: 2px solid #D4A574;
          }
          .difficulty {
            background: ${difficultyColor};
            color: white;
          }
          .description {
            font-size: 16px;
            line-height: 1.8;
            margin: 30px 0;
            text-align: center;
            font-style: italic;
            color: #555;
          }
          .section {
            margin: 40px 0;
          }
          .section-title {
            font-size: 24px;
            font-weight: bold;
            color: #1E1712;
            margin-bottom: 20px;
            border-bottom: 2px solid #D4A574;
            padding-bottom: 10px;
          }
          .ingredients {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
          }
          .ingredient {
            display: flex;
            align-items: center;
            padding: 12px;
            background: #F4ECE4;
            border-radius: 8px;
            border-left: 4px solid #D4A574;
          }
          .ingredient.optional {
            border-left-color: #ccc;
            opacity: 0.8;
          }
          .ingredient-amount {
            font-weight: bold;
            color: #D4A574;
            min-width: 80px;
            margin-right: 15px;
          }
          .ingredient-name {
            flex: 1;
            color: #1E1712;
          }
          .instructions {
            counter-reset: step-counter;
          }
          .instruction {
            counter-increment: step-counter;
            margin: 20px 0;
            padding: 20px;
            background: #F9F7F4;
            border-radius: 12px;
            border-left: 5px solid #D4A574;
            position: relative;
          }
          .instruction::before {
            content: counter(step-counter);
            position: absolute;
            left: -20px;
            top: 50%;
            transform: translateY(-50%);
            background: #D4A574;
            color: white;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
          }
          .instruction-text {
            margin-left: 25px;
            font-size: 16px;
            line-height: 1.7;
          }
          .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 30px;
          }
          .tag {
            background: #1E1712;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .notes {
            background: #FFF9E6;
            border: 2px dashed #D4A574;
            border-radius: 12px;
            padding: 20px;
            margin-top: 30px;
          }
          .notes-title {
            font-weight: bold;
            color: #1E1712;
            margin-bottom: 15px;
            font-size: 18px;
          }
          .note {
            margin: 10px 0;
            padding-left: 20px;
            position: relative;
          }
          .note::before {
            content: '💡';
            position: absolute;
            left: 0;
            top: 0;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #999;
            font-size: 14px;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          .author {
            color: #D4A574;
            font-weight: bold;
          }
          
          @media print {
            body { padding: 20px; }
            .meta-item { margin: 5px; }
            .recipe-meta { flex-direction: column; align-items: center; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${recipe.title}</h1>
          ${recipe.description ? `<p class="subtitle">${recipe.description}</p>` : ''}
          
          <div class="recipe-meta">
            <div class="meta-item difficulty">${recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}</div>
            <div class="meta-item">⏱️ ${recipe.prepTime} min</div>
            ${recipe.servings ? `<div class="meta-item">👥 ${recipe.servings} servings</div>` : ''}
          </div>
        </div>

        ${recipe.description ? `<div class="description">${recipe.description}</div>` : ''}

        <div class="section">
          <h2 class="section-title">🥄 Ingredients</h2>
          <div class="ingredients">
            ${recipe.ingredients.map(ingredient => `
              <div class="ingredient ${ingredient.optional ? 'optional' : ''}">
                <span class="ingredient-amount">${ingredient.amount}</span>
                <span class="ingredient-name">${ingredient.name}${ingredient.optional ? ' (optional)' : ''}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">📝 Instructions</h2>
          <div class="instructions">
            ${recipe.instructions.map(instruction => `
              <div class="instruction">
                <div class="instruction-text">${instruction}</div>
              </div>
            `).join('')}
          </div>
        </div>

        ${recipe.notes && recipe.notes.length > 0 ? `
          <div class="notes">
            <div class="notes-title">📋 Chef's Notes</div>
            ${recipe.notes.map(note => `<div class="note">${note}</div>`).join('')}
          </div>
        ` : ''}

        ${recipe.tags.length > 0 ? `
          <div class="tags">
            ${recipe.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
          </div>
        ` : ''}

        <div class="footer">
          <p>Recipe generated by Home Game Advantage</p>
          ${recipe.author ? `<p>Created by <span class="author">${recipe.author.name}</span>${recipe.author.username ? ` (@${recipe.author.username})` : ''}</p>` : ''}
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;
  }

  private getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return '#9E9E9E';
    }
  }

  private async createPDF(html: string, filename: string): Promise<string> {
    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612,
        height: 792,
      });

      // Move file to documents directory with proper name
      const documentsDir = FileSystem.documentDirectory;
      const newUri = `${documentsDir}${filename}.pdf`;
      
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      return newUri;
    } catch (error) {
      log.error('PDFService', 'Error creating PDF', error);
      throw new Error('Failed to create PDF');
    }
  }

  async generateRecipePDF(recipe: Recipe, options?: {
    share?: boolean;
    save?: boolean;
  }): Promise<string> {
    try {
      const html = this.generateRecipeHTML(recipe);
      const filename = `${recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_recipe`;
      const pdfUri = await this.createPDF(html, filename);

      // Handle sharing or saving based on options
      if (options?.share) {
        await this.shareRecipePDF(pdfUri, recipe.title);
      }

      if (options?.save) {
        Alert.alert(
          'Recipe Saved!',
          `"${recipe.title}" has been saved as a PDF to your device.`,
          [{ text: 'OK' }]
        );
      }

      return pdfUri;
    } catch (error) {
      log.error('PDFService', 'Error generating recipe PDF', error, { title: recipe.title });
      Alert.alert(
        'Error',
        'Failed to generate PDF. Please try again.',
        [{ text: 'OK' }]
      );
      throw error;
    }
  }

  async shareRecipePDF(pdfUri: string, title: string): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${title} Recipe`,
        });
      } else {
        await Sharing.shareAsync(pdfUri);
      }
      log.info('PDFService', 'PDF shared successfully', { title });
    } catch (error) {
      log.error('PDFService', 'Error sharing PDF', error, { title });
      Alert.alert('Error', 'Failed to share PDF');
    }
  }

  async generateBulkRecipesPDF(recipes: Recipe[]): Promise<string> {
    if (recipes.length === 0) {
      throw new Error('No recipes provided');
    }

    const combinedHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recipe Collection</title>
        <style>
          ${this.generateRecipeHTML(recipes[0]).match(/<style>([\s\S]*?)<\/style>/)?.[1] || ''}
          .recipe-separator {
            page-break-before: always;
            margin-top: 50px;
          }
          .collection-title {
            text-align: center;
            font-size: 36px;
            font-weight: bold;
            color: #1E1712;
            margin: 50px 0;
            border-bottom: 5px solid #D4A574;
            padding-bottom: 20px;
          }
          .collection-meta {
            text-align: center;
            color: #666;
            margin-bottom: 50px;
          }
        </style>
      </head>
      <body>
        <div class="collection-title">Recipe Collection</div>
        <div class="collection-meta">
          ${recipes.length} Recipes • Generated on ${new Date().toLocaleDateString()}
        </div>
        
        ${recipes.map((recipe, index) => `
          ${index > 0 ? '<div class="recipe-separator"></div>' : ''}
          ${this.generateRecipeHTML(recipe).match(/<body>([\s\S]*?)<\/body>/)?.[1] || ''}
        `).join('')}
      </body>
      </html>
    `;

    const filename = `recipe_collection_${recipes.length}_recipes`;
    return await this.createPDF(combinedHTML, filename);
  }

  async listSavedRecipes(): Promise<Array<{name: string, uri: string, date: Date}>> {
    try {
      const documentsDir = FileSystem.documentDirectory;
      if (!documentsDir) return [];

      const files = await FileSystem.readDirectoryAsync(documentsDir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf') && file.includes('recipe'));

      const recipes = await Promise.all(
        pdfFiles.map(async (filename) => {
          const uri = `${documentsDir}${filename}`;
          const info = await FileSystem.getInfoAsync(uri);
          return {
            name: filename.replace(/_recipe\.pdf$/, '').replace(/_/g, ' '),
            uri,
            date: new Date((info.exists && 'modificationTime' in info) ? info.modificationTime : 0),
          };
        })
      );

      return recipes.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      log.error('PDFService', 'Error listing saved recipes', error);
      return [];
    }
  }

  async deleteRecipePDF(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri);
      log.info('PDFService', 'Recipe PDF deleted', { uri });
    } catch (error) {
      log.error('PDFService', 'Error deleting recipe PDF', error, { uri });
      throw new Error('Failed to delete PDF');
    }
  }
}

export const pdfService = new PDFService();