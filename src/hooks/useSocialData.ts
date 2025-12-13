import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  location?: string;
  joinDate: string;
  isVerified?: boolean;
  stats: {
    followers: number;
    following: number;
    posts: number;
    recipes: number;
    achievements: number;
  };
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  coverImage?: string;
  category: 'cocktails' | 'spirits' | 'bars' | 'events' | 'general';
  memberCount: number;
  isPrivate: boolean;
  tags: string[];
  createdDate: string;
  owner: User;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  images?: string[];
  type: 'text' | 'recipe' | 'photo' | 'review';
  timestamp: string;
  likes: number;
  comments: number;
  isLiked?: boolean;
  group?: Group;
}

export interface Recipe {
  id: string;
  author: User;
  title: string;
  description: string;
  image?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: number;
  ingredients: Array<{
    name: string;
    amount: string;
    optional?: boolean;
  }>;
  instructions: string[];
  tags: string[];
  likes: number;
  saves: number;
  timestamp: string;
  isLiked?: boolean;
  isSaved?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'social' | 'recipes' | 'learning' | 'events' | 'special';
  rarity: 'common' | 'rare' | 'legendary';
  unlockedDate?: string;
  progress?: {
    current: number;
    total: number;
  };
}

export interface SocialState {
  currentUser: User;
  followers: User[];
  following: User[];
  joinedGroups: Group[];
  discoveredGroups: Group[];
  posts: Post[];
  recipes: Recipe[];
  achievements: Achievement[];
  suggestedUsers: User[];
  suggestedGroups: Group[];
}

const SOCIAL_STORAGE_KEY = 'socialData';

// Mock data
const mockCurrentUser: User = {
  id: 'current-user',
  name: 'Alex Johnson',
  username: 'mixmaster_alex',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=60',
  bio: 'Cocktail enthusiast & home bartender 🍸 Sharing my favorite recipes and bar discoveries',
  location: 'San Francisco, CA',
  joinDate: '2023-01-15',
  isVerified: true,
  stats: {
    followers: 0,
    following: 0,
    posts: 0,
    recipes: 42,
    achievements: 18,
  },
};

const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Sarah Chen',
    username: 'cocktail_sarah',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b359?auto=format&fit=crop&w=400&q=60',
    bio: 'Professional bartender at The Alchemist',
    location: 'New York, NY',
    joinDate: '2022-08-20',
    isVerified: true,
    stats: { followers: 2840, following: 156, posts: 324, recipes: 89, achievements: 32 },
  },
  {
    id: 'user-2',
    name: 'Marcus Thompson',
    username: 'spirit_seeker',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=60',
    bio: 'Whiskey collector & cocktail historian',
    location: 'Chicago, IL',
    joinDate: '2022-12-03',
    stats: { followers: 892, following: 234, posts: 98, recipes: 23, achievements: 15 },
  },
  {
    id: 'user-3',
    name: 'Emma Rodriguez',
    username: 'craft_cocktails_em',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=60',
    bio: 'Craft cocktail creator & ingredient explorer',
    location: 'Austin, TX',
    joinDate: '2023-03-12',
    stats: { followers: 1564, following: 445, posts: 203, recipes: 67, achievements: 24 },
  },
];

const mockGroups: Group[] = [
  {
    id: 'group-1',
    name: 'Craft Cocktail Enthusiasts',
    description: 'A community for lovers of handcrafted cocktails and artisanal spirits',
    avatar: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=400&q=60',
    coverImage: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=800&q=60',
    category: 'cocktails',
    memberCount: 12847,
    isPrivate: false,
    tags: ['cocktails', 'mixology', 'craft', 'recipes'],
    createdDate: '2022-05-15',
    owner: mockUsers[0],
  },
  {
    id: 'group-2',
    name: 'Whiskey Appreciation Society',
    description: 'Exploring the world of whiskey, from bourbon to scotch and everything in between',
    avatar: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=400&q=60',
    coverImage: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?auto=format&fit=crop&w=800&q=60',
    category: 'spirits',
    memberCount: 8234,
    isPrivate: false,
    tags: ['whiskey', 'bourbon', 'scotch', 'tasting'],
    createdDate: '2022-08-20',
    owner: mockUsers[1],
  },
  {
    id: 'group-3',
    name: 'SF Bay Area Bar Scene',
    description: 'Discovering the best bars, events, and cocktail culture in the San Francisco Bay Area',
    avatar: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=60',
    category: 'bars',
    memberCount: 3421,
    isPrivate: false,
    tags: ['san francisco', 'bars', 'events', 'local'],
    createdDate: '2023-01-10',
    owner: mockUsers[2],
  },
];

const mockAchievements: Achievement[] = [
  {
    id: 'ach-1',
    title: 'First Steps',
    description: 'Created your first post',
    icon: 'footsteps-outline',
    category: 'social',
    rarity: 'common',
    unlockedDate: '2023-01-16',
  },
  {
    id: 'ach-2',
    title: 'Recipe Master',
    description: 'Shared 25 cocktail recipes',
    icon: 'book-outline',
    category: 'recipes',
    rarity: 'rare',
    unlockedDate: '2023-08-22',
  },
  {
    id: 'ach-3',
    title: 'Social Butterfly',
    description: 'Gained 1000 followers',
    icon: 'people-outline',
    category: 'social',
    rarity: 'rare',
    unlockedDate: '2023-11-15',
  },
  {
    id: 'ach-4',
    title: 'Mixology Student',
    description: 'Complete 10 cocktail lessons',
    icon: 'school-outline',
    category: 'learning',
    rarity: 'common',
    progress: { current: 7, total: 10 },
  },
  {
    id: 'ach-5',
    title: 'Event Explorer',
    description: 'Attend 5 cocktail events',
    icon: 'calendar-outline',
    category: 'events',
    rarity: 'common',
    progress: { current: 3, total: 5 },
  },
];

export function useSocialData() {
  const [socialData, setSocialData] = useState<SocialState>({
    currentUser: mockCurrentUser,
    followers: [],
    following: [],
    joinedGroups: [],
    discoveredGroups: mockGroups,
    posts: [],
    recipes: [],
    achievements: mockAchievements,
    suggestedUsers: mockUsers,
    suggestedGroups: mockGroups.slice(1),
  });

  // Load social data from AsyncStorage
  useEffect(() => {
    loadSocialData();
  }, []);

  const loadSocialData = async () => {
    try {
      const stored = await AsyncStorage.getItem(SOCIAL_STORAGE_KEY);
      if (stored) {
        const parsedData = JSON.parse(stored);
        setSocialData(prevData => ({
          ...prevData,
          followers: parsedData.followers || [],
          following: parsedData.following || [],
          joinedGroups: parsedData.joinedGroups || [],
        }));
      }
    } catch (error) {
      log.warn('useSocialData', 'Error loading social data', { error });
    }
  };

  const saveToStorage = async (newData: Partial<SocialState>) => {
    try {
      const dataToStore = {
        followers: newData.followers || socialData.followers,
        following: newData.following || socialData.following,
        joinedGroups: newData.joinedGroups || socialData.joinedGroups,
      };
      await AsyncStorage.setItem(SOCIAL_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      log.warn('useSocialData', 'Error saving social data', { error });
    }
  };

  // Follow/Unfollow functionality
  const toggleFollow = (user: User) => {
    setSocialData(prevData => {
      const isFollowing = prevData.following.some(u => u.id === user.id);
      const newFollowing = isFollowing
        ? prevData.following.filter(u => u.id !== user.id)
        : [...prevData.following, user];
      
      const updatedData = { ...prevData, following: newFollowing };
      saveToStorage(updatedData);
      return updatedData;
    });
  };

  const isFollowing = (userId: string) => {
    return socialData.following.some(u => u.id === userId);
  };

  // Group join/leave functionality
  const toggleGroupMembership = (group: Group) => {
    setSocialData(prevData => {
      const isMember = prevData.joinedGroups.some(g => g.id === group.id);
      const newJoinedGroups = isMember
        ? prevData.joinedGroups.filter(g => g.id !== group.id)
        : [...prevData.joinedGroups, group];
      
      const updatedData = { ...prevData, joinedGroups: newJoinedGroups };
      saveToStorage(updatedData);
      return updatedData;
    });
  };

  const isGroupMember = (groupId: string) => {
    return socialData.joinedGroups.some(g => g.id === groupId);
  };

  // Post interactions
  const toggleLike = (postId: string) => {
    setSocialData(prevData => ({
      ...prevData,
      posts: prevData.posts.map(post =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1
            }
          : post
      )
    }));
  };

  // Recipe interactions
  const toggleRecipeLike = (recipeId: string) => {
    setSocialData(prevData => ({
      ...prevData,
      recipes: prevData.recipes.map(recipe =>
        recipe.id === recipeId
          ? {
              ...recipe,
              isLiked: !recipe.isLiked,
              likes: recipe.isLiked ? recipe.likes - 1 : recipe.likes + 1
            }
          : recipe
      )
    }));
  };

  const toggleRecipeSave = (recipeId: string) => {
    setSocialData(prevData => ({
      ...prevData,
      recipes: prevData.recipes.map(recipe =>
        recipe.id === recipeId
          ? {
              ...recipe,
              isSaved: !recipe.isSaved,
              saves: recipe.isSaved ? recipe.saves - 1 : recipe.saves + 1
            }
          : recipe
      )
    }));
  };

  // Achievement progress
  const updateAchievementProgress = (achievementId: string, progress: number) => {
    setSocialData(prevData => ({
      ...prevData,
      achievements: prevData.achievements.map(achievement =>
        achievement.id === achievementId && achievement.progress
          ? {
              ...achievement,
              progress: {
                ...achievement.progress,
                current: Math.min(progress, achievement.progress.total)
              },
              unlockedDate: progress >= achievement.progress.total ? new Date().toISOString() : undefined
            }
          : achievement
      )
    }));
  };

  return {
    socialData,
    toggleFollow,
    isFollowing,
    toggleGroupMembership,
    isGroupMember,
    toggleLike,
    toggleRecipeLike,
    toggleRecipeSave,
    updateAchievementProgress,
    loadSocialData,
  };
}