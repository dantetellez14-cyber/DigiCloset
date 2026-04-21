/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Camera, 
  Sparkles, 
  Mic, 
  MicOff, 
  Heart, 
  Calendar, 
  Shirt, 
  Search,
  ChevronRight,
  Trash2,
  Loader2,
  X,
  Check,
  Menu,
  User,
  ArrowRight,
  MessageSquare,
  Send,
  Bell,
  Users,
  Settings,
  Volume2,
  Sun,
  Pin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ClosetItem, Category, Outfit } from './types';
import { generateOutfitSuggestion, chatWithStylist } from './services/geminiService';

const INITIAL_CLOSET: ClosetItem[] = [
  {
    id: "9cs9c7wj8",
    name: "Pink miu miu",
    category: "Shoes",
    imageUrl: "/9cs9c7wj8.png"
  },
  {
    id: "bdw9eqkvr",
    name: "Silk pink",
    category: "Dresses",
    imageUrl: "/bdw9eqkvr.png"
  },
  {
    id: "5t2ga95yv",
    name: "Jeans",
    category: "Bottoms",
    imageUrl: "/5t2ga95yv.png"
  },
  {
    id: "bnwui6v5u",
    name: "Hollister",
    category: "Tops",
    imageUrl: "/bnwui6v5u.png"
  }
];

export default function App() {
  const [closet, setCloset] = useState<ClosetItem[]>(() => {
    const saved = localStorage.getItem('digi-closet-items-v3');
    return saved ? JSON.parse(saved) : INITIAL_CLOSET;
  });
  const [activeTab, setActiveTab] = useState<'closet' | 'outfits' | 'plan' | 'chat'>('closet');
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ClosetItem>>({ category: 'Tops' });
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Pieces');
  const [searchQuery, setSearchQuery] = useState('');
  const [showIntro, setShowIntro] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarView, setSidebarView] = useState<'none' | 'updates' | 'community' | 'profile' | 'settings'>('none');
  
  // Profile State
  const [nickname, setNickname] = useState(() => localStorage.getItem('digi-closet-nickname') || 'Muse');
  
  // Settings State
  const [brightness, setBrightness] = useState(100);
  const [volume, setVolume] = useState(80);

  // Community State
  const [communityPosts, setCommunityPosts] = useState<{ id: string; author: string; content: string; imageUrl: string; likes: number }[]>([
    { id: '1', author: 'Elena V.', content: 'Spring vibes in Paris! 🌸', imageUrl: 'https://loremflickr.com/600/800/paris,fashion,spring', likes: 24 },
    { id: '2', author: 'Julian K.', content: 'Minimalism is key.', imageUrl: 'https://loremflickr.com/600/800/minimalist,fashion,white', likes: 18 },
  ]);
  const [newPostContent, setNewPostContent] = useState('');

  // Updates State
  const [updates] = useState([
    { id: '1', title: 'v2.0 Release', content: 'Introducing the new AI Stylist and Community features!', date: '2024-03-20', pinned: true },
    { id: '2', title: 'Spring Collection', content: 'New seasonal items added to the archive.', date: '2024-03-15', pinned: false },
  ]);

  // Schedule State
  const [schedule, setSchedule] = useState<Record<number, ClosetItem | null>>(() => {
    const saved = localStorage.getItem('digi-closet-schedule');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Lookbook State
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>(() => {
    const saved = localStorage.getItem('digi-closet-saved-outfits');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Bonjour, darling. I am your personal fashion concierge. How may I elevate your style today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('digi-closet-items-v3', JSON.stringify(closet));
  }, [closet]);

  useEffect(() => {
    localStorage.setItem('digi-closet-nickname', nickname);
  }, [nickname]);

  useEffect(() => {
    localStorage.setItem('digi-closet-schedule', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('digi-closet-saved-outfits', JSON.stringify(savedOutfits));
  }, [savedOutfits]);

  // Voice Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        
        if (transcript.includes('hey digirl') || transcript.includes('hey digi girl')) {
          if (transcript.includes('make me an outfit') || transcript.includes('generate outfit')) {
            handleGenerateOutfit();
            setVoiceFeedback("Curating your look...");
          } else {
            setVoiceFeedback("Bonjour, how can I assist?");
          }
          
          setTimeout(() => setVoiceFeedback(null), 3000);
        }
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const handleGenerateOutfit = async () => {
    setActiveTab('outfits');
    setIsGenerating(true);
    try {
      const result = await generateOutfitSuggestion(closet, "Elegant", "Dinner", "Evening");
      setSuggestions(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await chatWithStylist(closet, [...chatMessages, { role: 'user', text: userMessage }]);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const addItem = () => {
    const imageUrl = previewUrl || (newItem.name && newItem.category ? `https://loremflickr.com/600/800/${(newItem.name || newItem.category || 'fashion').replace(/\s+/g, ',').toLowerCase()}` : null);
    
    if (imageUrl) {
      const item: ClosetItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: newItem.name || 'Unlabeled Piece',
        category: (newItem.category as Category) || 'Tops',
        imageUrl: imageUrl,
        color: newItem.color || 'Unknown',
      };
      setCloset([...closet, item]);
      setShowUploadModal(false);
      setNewItem({ category: 'Tops' });
      setPreviewUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAuth = async () => {
    if (!authEmail || !authPassword) {
      setAuthError('Please fill in all fields');
      return;
    }

    setIsAuthLoading(true);
    setAuthError(null);

    try {
      // Mock network delay since backend is removed for Vercel
      await new Promise(resolve => setTimeout(resolve, 800));

      setVoiceFeedback(authMode === 'signup' ? "Welcome to the Atelier!" : "Welcome back, darling.");
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const saveOutfit = (suggestion: any) => {
    const outfitItems = suggestion.itemIds
      .map((id: string) => closet.find(item => item.id === id))
      .filter(Boolean) as ClosetItem[];

    const newOutfit: Outfit = {
      id: Math.random().toString(36).substr(2, 9),
      name: suggestion.name,
      items: outfitItems,
      description: suggestion.description,
      createdAt: new Date().toISOString(),
    };

    setSavedOutfits([newOutfit, ...savedOutfits]);
    setVoiceFeedback("Lookbook updated.");
  };

  return (
    <AnimatePresence mode="wait">
      {showIntro ? (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
          className="fixed inset-0 z-[200] bg-baby-pink-50 flex flex-col items-center justify-center text-center p-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, delay: 0.5, ease: [0.19, 1, 0.22, 1] }}
            className="space-y-12"
          >
            <div className="space-y-4">
              <motion.h1 
                initial={{ letterSpacing: "0.1em", opacity: 0 }}
                animate={{ letterSpacing: "0.3em", opacity: 1 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="text-5xl md:text-8xl font-serif uppercase text-chique-slate"
              >
                Digi-Closet
              </motion.h1>
              <p className="text-[10px] md:text-xs uppercase tracking-[0.6em] text-baby-pink-400">Your Digital Archive of Style</p>
            </div>
            
            <div className="h-px w-16 bg-chique-slate/20 mx-auto" />
            
            <motion.button
              whileHover={{ scale: 1.02, letterSpacing: "0.5em" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowIntro(false)}
              className="px-16 py-5 border border-chique-slate text-chique-slate text-[10px] uppercase tracking-[0.4em] hover:bg-chique-slate hover:text-white transition-all duration-700 ease-in-out"
            >
              Enter Atelier
            </motion.button>
          </motion.div>
          
          <div className="absolute bottom-12 left-0 right-0">
            <p className="text-[8px] uppercase tracking-[0.4em] text-baby-pink-300">Est. 2024 • Haute Couture Digital</p>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="min-h-screen bg-baby-pink-50 selection:bg-baby-pink-200"
        >
          {/* Minimalist Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-baby-pink-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => setShowSidebar(true)}
            className="p-2 text-chique-slate hover:text-baby-pink-500 transition-colors"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-serif tracking-[0.2em] uppercase text-chique-slate">Digi-Closet</h1>
            <span className="text-[8px] uppercase tracking-[0.4em] text-baby-pink-400 -mt-1">Paris • London • New York</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleListening}
              className={`p-2 transition-all ${isListening ? 'text-baby-pink-500' : 'text-chique-slate'}`}
            >
              {isListening ? <Mic size={20} strokeWidth={1.5} /> : <MicOff size={20} strokeWidth={1.5} />}
            </button>
            <button 
              onClick={() => setShowAuthModal(true)}
              className="p-2 text-chique-slate hover:text-baby-pink-500 transition-colors"
            >
              <User size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Voice Feedback */}
      <AnimatePresence>
        {voiceFeedback && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 80, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[60] bg-chique-slate text-white px-8 py-2 text-[10px] uppercase tracking-[0.2em] font-medium shadow-xl"
          >
            {voiceFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 z-[100] bg-chique-slate/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 z-[110] bg-white shadow-2xl p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-[0.4em] text-baby-pink-400">Atelier</span>
                  <span className="text-xl font-serif text-chique-slate">Menu</span>
                </div>
                <button onClick={() => setShowSidebar(false)} className="text-baby-pink-300 hover:text-chique-slate transition-colors">
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-8 flex-1">
                <button 
                  onClick={() => { setSidebarView('updates'); setShowSidebar(false); }}
                  className="flex items-center gap-4 w-full text-left group"
                >
                  <div className="p-2 bg-baby-pink-50 text-baby-pink-400 group-hover:bg-chique-slate group-hover:text-white transition-all">
                    <Bell size={16} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-chique-slate font-medium">Updates</span>
                </button>

                <button 
                  onClick={() => { setSidebarView('community'); setShowSidebar(false); }}
                  className="flex items-center gap-4 w-full text-left group"
                >
                  <div className="p-2 bg-baby-pink-50 text-baby-pink-400 group-hover:bg-chique-slate group-hover:text-white transition-all">
                    <Users size={16} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-chique-slate font-medium">Community</span>
                </button>

                <button 
                  onClick={() => { setSidebarView('profile'); setShowSidebar(false); }}
                  className="flex items-center gap-4 w-full text-left group"
                >
                  <div className="p-2 bg-baby-pink-50 text-baby-pink-400 group-hover:bg-chique-slate group-hover:text-white transition-all">
                    <User size={16} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-chique-slate font-medium">Your Profile</span>
                </button>

                <button 
                  onClick={() => { setSidebarView('settings'); setShowSidebar(false); }}
                  className="flex items-center gap-4 w-full text-left group"
                >
                  <div className="p-2 bg-baby-pink-50 text-baby-pink-400 group-hover:bg-chique-slate group-hover:text-white transition-all">
                    <Settings size={16} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-chique-slate font-medium">Settings</span>
                </button>
              </div>

              <div className="pt-8 border-t border-baby-pink-50">
                <p className="text-[8px] uppercase tracking-[0.2em] text-baby-pink-300">Digi-Closet v2.4.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar Content Views */}
      <AnimatePresence>
        {sidebarView !== 'none' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[120] bg-baby-pink-50 overflow-y-auto p-6 md:p-12"
          >
            <div className="max-w-4xl mx-auto">
              <button 
                onClick={() => setSidebarView('none')}
                className="mb-12 flex items-center gap-2 text-baby-pink-400 hover:text-chique-slate transition-colors"
              >
                <ArrowRight size={16} className="rotate-180" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Back to Closet</span>
              </button>

              {sidebarView === 'updates' && (
                <div className="space-y-12">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-serif italic text-chique-slate">Announcements</h2>
                    <p className="text-xs uppercase tracking-widest text-baby-pink-400">Latest from the developers</p>
                  </div>
                  <div className="space-y-6">
                    {updates.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1)).map(update => (
                      <div key={update.id} className={`bg-white p-8 border ${update.pinned ? 'border-chique-slate' : 'border-baby-pink-100'} relative`}>
                        {update.pinned && (
                          <div className="absolute top-4 right-4 text-chique-slate flex items-center gap-2">
                            <Pin size={12} />
                            <span className="text-[8px] uppercase tracking-widest font-bold">Pinned</span>
                          </div>
                        )}
                        <span className="text-[10px] text-baby-pink-300 font-mono">{update.date}</span>
                        <h3 className="text-xl font-serif text-chique-slate mt-2">{update.title}</h3>
                        <p className="mt-4 text-sm text-chique-slate/70 leading-relaxed">{update.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sidebarView === 'community' && (
                <div className="space-y-12">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-serif italic text-chique-slate">Community</h2>
                    <p className="text-xs uppercase tracking-widest text-baby-pink-400">Share your style with the world</p>
                  </div>

                  <div className="bg-white p-8 border border-baby-pink-100 space-y-4">
                    <textarea 
                      placeholder="Share your outfit thoughts..."
                      className="w-full bg-baby-pink-50 p-4 text-sm focus:outline-none min-h-[100px]"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    <div className="flex justify-between items-center">
                      <button className="text-baby-pink-400 hover:text-chique-slate transition-colors">
                        <Camera size={20} strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={() => {
                          if (!newPostContent.trim()) return;
                          setCommunityPosts([{
                            id: Date.now().toString(),
                            author: nickname,
                            content: newPostContent,
                            imageUrl: `https://loremflickr.com/600/800/${newPostContent.slice(0, 30).replace(/\s+/g, ',').toLowerCase()}`,
                            likes: 0
                          }, ...communityPosts]);
                          setNewPostContent('');
                        }}
                        className="btn-chique px-8"
                      >
                        Post Outfit
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {communityPosts.map(post => (
                      <div key={post.id} className="bg-white border border-baby-pink-100 overflow-hidden group">
                        <div className="aspect-[3/4] overflow-hidden relative">
                          <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                          <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1 flex items-center gap-2">
                            <Heart size={12} className="text-baby-pink-500" />
                            <span className="text-[10px] font-bold">{post.likes}</span>
                          </div>
                        </div>
                        <div className="p-6 space-y-2">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-chique-slate">{post.author}</span>
                          <p className="text-sm text-chique-slate/70 italic">"{post.content}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sidebarView === 'profile' && (
                <div className="space-y-12 max-w-md">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-serif italic text-chique-slate">Your Profile</h2>
                    <p className="text-xs uppercase tracking-widest text-baby-pink-400">Manage your digital identity</p>
                  </div>

                  <div className="bg-white p-12 border border-baby-pink-100 space-y-8 text-center">
                    <div className="w-32 h-32 bg-baby-pink-100 rounded-full mx-auto flex items-center justify-center text-chique-slate">
                      <User size={48} strokeWidth={1} />
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1 text-left">
                        <label className="text-[8px] uppercase tracking-[0.2em] font-bold text-baby-pink-400">Nickname</label>
                        <input 
                          type="text" 
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className="w-full bg-transparent border-b border-baby-pink-100 py-2 text-xl font-serif focus:outline-none focus:border-chique-slate transition-colors"
                        />
                      </div>
                    </div>
                    <button className="btn-chique w-full py-4" onClick={() => setSidebarView('none')}>Save Profile</button>
                  </div>
                </div>
              )}

              {sidebarView === 'settings' && (
                <div className="space-y-12 max-w-md">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-serif italic text-chique-slate">Settings</h2>
                    <p className="text-xs uppercase tracking-widest text-baby-pink-400">Customize your experience</p>
                  </div>

                  <div className="bg-white p-12 border border-baby-pink-100 space-y-12">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Sun size={16} className="text-baby-pink-400" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-chique-slate">Brightness</span>
                        </div>
                        <span className="text-[10px] font-mono">{brightness}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={brightness}
                        onChange={(e) => setBrightness(parseInt(e.target.value))}
                        className="w-full accent-chique-slate"
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Volume2 size={16} className="text-baby-pink-400" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-chique-slate">Volume</span>
                        </div>
                        <span className="text-[10px] font-mono">{volume}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="w-full accent-chique-slate"
                      />
                    </div>

                    <div className="pt-8 border-t border-baby-pink-50 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-widest text-baby-pink-400">Dark Mode</span>
                        <div className="w-10 h-5 bg-baby-pink-100 rounded-full relative cursor-pointer">
                          <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-widest text-baby-pink-400">Notifications</span>
                        <div className="w-10 h-5 bg-chique-slate rounded-full relative cursor-pointer">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-baby-pink-100">
                      <button 
                        onClick={() => {
                          if (window.confirm("Are you sure you want to reset your wardrobe to the default curated collection? This will delete your current items.")) {
                            setCloset(INITIAL_CLOSET);
                            setVoiceFeedback("Wardrobe reset to default.");
                            setSidebarView('none');
                          }
                        }}
                        className="w-full py-4 border border-baby-pink-200 text-baby-pink-400 text-[10px] uppercase tracking-widest hover:bg-baby-pink-50 transition-colors"
                      >
                        Reset Wardrobe to Default
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-32 pb-32 px-6 max-w-7xl mx-auto">
        {activeTab === 'closet' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-4xl font-serif italic text-chique-slate">The Collection</h2>
                <p className="text-xs uppercase tracking-widest text-baby-pink-400">Curated Wardrobe • {closet.length} Pieces</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-baby-pink-300" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search Archive" 
                    className="bg-white border border-baby-pink-100 pl-10 pr-4 py-2 text-xs uppercase tracking-widest focus:outline-none focus:border-baby-pink-300 w-48"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="btn-chique flex items-center gap-2"
                >
                  <Plus size={14} /> Archive Item
                </button>
              </div>
            </div>

            {/* Editorial Category Filter */}
            <div className="flex gap-8 border-b border-baby-pink-100 pb-4 overflow-x-auto no-scrollbar">
              {['All Pieces', 'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'].map((cat) => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] uppercase tracking-[0.2em] whitespace-nowrap transition-colors ${selectedCategory === cat ? 'text-chique-slate font-bold border-b border-chique-slate' : 'text-baby-pink-400 hover:text-chique-slate'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Alta-style Grid */}
            <div className="alta-grid">
              {closet
                .filter(item => (selectedCategory === 'All Pieces' || item.category === selectedCategory) && 
                               (item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                item.color?.toLowerCase().includes(searchQuery.toLowerCase())))
                .map((item, idx) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="chique-card group"
                >
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button 
                      onClick={() => setCloset(closet.filter(i => i.id !== item.id))}
                      className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 text-chique-slate"
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="p-4 space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-baby-pink-400">{item.category}</p>
                    <h3 className="text-sm font-serif text-chique-slate truncate">{item.name}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'outfits' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto space-y-16"
          >
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-serif italic text-chique-slate">L'Atelier</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-baby-pink-400">AI-Powered Curation</p>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={handleGenerateOutfit}
                disabled={isGenerating}
                className="group relative px-12 py-6 bg-chique-slate text-white overflow-hidden transition-all hover:px-16"
              >
                <span className="relative z-10 text-xs uppercase tracking-[0.4em] flex items-center gap-4">
                  {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                  {isGenerating ? "Curating..." : "Generate Lookbook"}
                </span>
                <div className="absolute inset-0 bg-baby-pink-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              </button>
            </div>

            <div className="grid gap-24">
              {suggestions.map((outfit, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="grid md:grid-cols-2 gap-12 items-center"
                >
                  <div className={`space-y-6 ${idx % 2 === 1 ? 'md:order-2' : ''}`}>
                    <span className="text-[10px] uppercase tracking-[0.5em] text-baby-pink-400">Look No. 0{idx + 1}</span>
                    <h3 className="text-4xl font-serif text-chique-slate underline decoration-baby-pink-200 underline-offset-8">{outfit.name}</h3>
                    <p className="editorial-text leading-relaxed">"{outfit.description}"</p>
                    <button 
                      onClick={() => saveOutfit(outfit)}
                      className="btn-pink flex items-center gap-4 group"
                    >
                      Save to Lookbook <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                    </button>
                  </div>
                  
                  <div className="relative aspect-square">
                    <div className="absolute inset-0 border border-baby-pink-200 translate-x-4 translate-y-4" />
                    <div className="relative h-full bg-white p-8 grid grid-cols-2 gap-4 shadow-2xl">
                      {outfit.itemIds.slice(0, 4).map((id: string, i: number) => {
                        const item = closet.find(item => item.id === id);
                        if (!item) return null;
                        return (
                          <div key={id} className={`relative overflow-hidden ${i === 0 ? 'row-span-2' : ''}`}>
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {savedOutfits.length > 0 && (
              <div className="pt-24 space-y-12">
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-serif italic text-chique-slate">The Lookbook</h3>
                  <p className="text-[10px] uppercase tracking-widest text-baby-pink-400">Your Curated Archive</p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                  {savedOutfits.map((outfit) => (
                    <motion.div 
                      key={outfit.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white border border-baby-pink-50 p-8 space-y-6 relative group"
                    >
                      <button 
                        onClick={() => setSavedOutfits(savedOutfits.filter(o => o.id !== outfit.id))}
                        className="absolute top-4 right-4 text-baby-pink-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="space-y-2">
                        <h4 className="text-xl font-serif text-chique-slate">{outfit.name}</h4>
                        <p className="text-xs text-chique-slate/60 italic">"{outfit.description}"</p>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {outfit.items.map(item => (
                          <div key={item.id} className="aspect-[3/4] bg-baby-pink-50 overflow-hidden">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 flex justify-between items-center border-t border-baby-pink-50">
                        <span className="text-[8px] uppercase tracking-widest text-baby-pink-300">
                          {new Date(outfit.createdAt).toLocaleDateString()}
                        </span>
                        <button className="text-[10px] uppercase tracking-widest font-bold text-chique-slate hover:text-baby-pink-500 transition-colors">
                          View Details
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'plan' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto space-y-12"
          >
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-serif italic text-chique-slate">The Calendar</h2>
              <p className="text-xs uppercase tracking-widest text-baby-pink-400">Plan your aesthetic journey</p>
            </div>
            
            <div className="bg-white border border-baby-pink-100 p-12 text-center space-y-8">
              <Calendar size={32} strokeWidth={1} className="mx-auto text-baby-pink-300" />
              <p className="font-serif italic text-xl text-chique-slate">"Elegance is the only beauty that never fades."</p>
              <div className="grid grid-cols-7 gap-4">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="space-y-2">
                    <span className="text-[8px] uppercase tracking-widest text-baby-pink-300">{day}</span>
                    <div 
                      onClick={() => { setSelectedDay(i); setShowScheduleModal(true); }}
                      className="aspect-square border border-baby-pink-50 hover:bg-baby-pink-50 transition-colors cursor-pointer relative overflow-hidden group"
                    >
                      {schedule[i] ? (
                        <img 
                          src={schedule[i]?.imageUrl} 
                          alt="Scheduled" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-baby-pink-200 group-hover:text-baby-pink-400">
                          <Plus size={16} strokeWidth={1} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-chique w-full" onClick={() => { setSelectedDay(0); setShowScheduleModal(true); }}>Schedule Fitting</button>
            </div>
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto h-[calc(100vh-250px)] flex flex-col"
          >
            <div className="text-center mb-8">
              <h2 className="text-4xl font-serif italic text-chique-slate">The Concierge</h2>
              <p className="text-xs uppercase tracking-widest text-baby-pink-400">Personal Styling Service</p>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 p-4">
              {chatMessages.map((msg, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-4 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-chique-slate text-white' 
                      : 'bg-white border border-baby-pink-100 text-chique-slate font-serif italic'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-baby-pink-100 p-4">
                    <Loader2 size={16} className="animate-spin text-baby-pink-400" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="mt-6 flex gap-4">
              <input 
                type="text" 
                placeholder="Ask your stylist..."
                className="flex-1 bg-white border border-baby-pink-100 px-6 py-4 text-xs uppercase tracking-widest focus:outline-none focus:border-chique-slate"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                onClick={handleSendMessage}
                disabled={isChatLoading}
                className="bg-chique-slate text-white px-6 flex items-center justify-center hover:bg-chique-slate/90 transition-colors disabled:opacity-50"
              >
                <Send size={18} strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Chique Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav px-8 py-6">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <button 
            onClick={() => setActiveTab('closet')}
            className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'closet' ? 'text-chique-slate scale-110' : 'text-baby-pink-300 hover:text-baby-pink-500'}`}
          >
            <Shirt size={18} strokeWidth={activeTab === 'closet' ? 2 : 1.5} />
            <span className="text-[8px] uppercase tracking-[0.2em] font-bold">Archive</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('outfits')}
            className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'outfits' ? 'text-chique-slate scale-110' : 'text-baby-pink-300 hover:text-baby-pink-500'}`}
          >
            <Sparkles size={18} strokeWidth={activeTab === 'outfits' ? 2 : 1.5} />
            <span className="text-[8px] uppercase tracking-[0.2em] font-bold">Atelier</span>
          </button>

          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'chat' ? 'text-chique-slate scale-110' : 'text-baby-pink-300 hover:text-baby-pink-500'}`}
          >
            <MessageSquare size={18} strokeWidth={activeTab === 'chat' ? 2 : 1.5} />
            <span className="text-[8px] uppercase tracking-[0.2em] font-bold">Concierge</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('plan')}
            className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'plan' ? 'text-chique-slate scale-110' : 'text-baby-pink-300 hover:text-baby-pink-500'}`}
          >
            <Calendar size={18} strokeWidth={activeTab === 'plan' ? 2 : 1.5} />
            <span className="text-[8px] uppercase tracking-[0.2em] font-bold">Journal</span>
          </button>
        </div>
      </nav>

      {/* Schedule Fitting Modal */}
      <AnimatePresence>
        {showScheduleModal && selectedDay !== null && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScheduleModal(false)}
              className="absolute inset-0 bg-chique-slate/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white p-12 shadow-2xl space-y-8 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-3xl font-serif italic text-chique-slate">Schedule Fitting</h3>
                  <p className="text-[10px] uppercase tracking-widest text-baby-pink-400">Select an ensemble for {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][selectedDay]}</p>
                </div>
                <button onClick={() => setShowScheduleModal(false)} className="text-baby-pink-300 hover:text-chique-slate transition-colors">
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {closet.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setSchedule({ ...schedule, [selectedDay]: item });
                      setShowScheduleModal(false);
                    }}
                    className="aspect-[3/4] border border-baby-pink-50 cursor-pointer hover:border-chique-slate transition-all group relative overflow-hidden"
                  >
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[8px] uppercase tracking-widest text-white font-bold">Select</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {schedule[selectedDay] && (
                <button 
                  onClick={() => {
                    const newSchedule = { ...schedule };
                    delete newSchedule[selectedDay];
                    setSchedule(newSchedule);
                    setShowScheduleModal(false);
                  }}
                  className="w-full py-4 border border-red-100 text-red-400 text-[10px] uppercase tracking-widest hover:bg-red-50 transition-colors"
                >
                  Clear Schedule
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-chique-slate/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white p-12 shadow-2xl space-y-8 text-center"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-6 right-6 text-baby-pink-300 hover:text-chique-slate transition-colors"
              >
                <X size={20} strokeWidth={1.5} />
              </button>

              <div className="space-y-2">
                <h3 className="text-3xl font-serif italic text-chique-slate">
                  {authMode === 'signin' ? 'Welcome Back' : 'Join the Atelier'}
                </h3>
                <p className="text-[10px] uppercase tracking-[0.2em] text-baby-pink-400">
                  {authMode === 'signin' ? 'Sign in to your archive' : 'Create your digital closet'}
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[8px] uppercase tracking-[0.2em] font-bold text-baby-pink-400">Email Address</label>
                    <input 
                      type="email" 
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="muse@atelier.com"
                      className="w-full bg-transparent border-b border-baby-pink-100 py-2 text-sm focus:outline-none focus:border-chique-slate transition-colors"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[8px] uppercase tracking-[0.2em] font-bold text-baby-pink-400">Password</label>
                    <input 
                      type="password" 
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent border-b border-baby-pink-100 py-2 text-sm focus:outline-none focus:border-chique-slate transition-colors"
                    />
                  </div>
                </div>

                {authError && (
                  <p className="text-[8px] uppercase tracking-widest text-red-400 font-bold">{authError}</p>
                )}

                <button 
                  onClick={handleAuth}
                  disabled={isAuthLoading}
                  className="btn-chique w-full py-4 flex items-center justify-center gap-2"
                >
                  {isAuthLoading && <Loader2 size={14} className="animate-spin" />}
                  {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>

                <div className="pt-4 border-t border-baby-pink-50">
                  <button 
                    onClick={() => {
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                      setAuthError(null);
                    }}
                    className="text-[10px] uppercase tracking-[0.1em] text-baby-pink-400 hover:text-chique-slate transition-colors"
                  >
                    {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already a member? Sign In"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Refined Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-chique-slate/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white p-12 shadow-2xl space-y-8"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-serif italic text-chique-slate">New Archive Entry</h3>
                <button onClick={() => setShowUploadModal(false)} className="text-baby-pink-300 hover:text-chique-slate transition-colors">
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-6">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange}
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[4/3] bg-baby-pink-50 border border-dashed border-baby-pink-200 flex flex-col items-center justify-center gap-4 text-baby-pink-400 cursor-pointer hover:bg-baby-pink-100 transition-all group overflow-hidden relative"
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={32} strokeWidth={1} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] uppercase tracking-widest font-medium">Upload from Gallery</span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-[0.2em] font-bold text-baby-pink-400">Nomenclature</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Silk Camisole"
                      className="w-full bg-transparent border-b border-baby-pink-100 py-2 text-sm focus:outline-none focus:border-chique-slate transition-colors"
                      value={newItem.name || ''}
                      onChange={e => setNewItem({...newItem, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[8px] uppercase tracking-[0.2em] font-bold text-baby-pink-400">Classification</label>
                    <select 
                      className="w-full bg-transparent border-b border-baby-pink-100 py-2 text-sm focus:outline-none focus:border-chique-slate transition-colors appearance-none"
                      value={newItem.category}
                      onChange={e => setNewItem({...newItem, category: e.target.value as Category})}
                    >
                      {['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Accessories', 'Outerwear'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={addItem}
                  className="btn-chique w-full py-4 mt-4"
                >
                  Confirm Entry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
    )}
    </AnimatePresence>
  );
}
