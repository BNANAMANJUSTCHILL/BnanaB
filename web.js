import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, Download, Settings, LogOut, Menu, User, Lock, Mail, Brain, Zap } from 'lucide-react';

const BananaGPT = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const [settings, setSettings] = useState({
    temperature: 0.7,
    maxTokens: 4000,
    theme: 'light',
    apiKey: ''
  });
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isAuthenticated) {
      saveToStorage();
    }
  }, [chats, messages, currentChatId, user, settings, isAuthenticated]);

  const loadFromStorage = async () => {
    try {
      const userData = await window.storage.get('banana_user');
      const chatsData = await window.storage.get('banana_chats');
      const settingsData = await window.storage.get('banana_settings');
      
      if (userData && userData.value) {
        const parsedUser = JSON.parse(userData.value);
        setUser(parsedUser);
        setIsAuthenticated(true);
        setShowAuthModal(false);
      }
      
      if (chatsData && chatsData.value) {
        setChats(JSON.parse(chatsData.value));
      }
      
      if (settingsData && settingsData.value) {
        setSettings(JSON.parse(settingsData.value));
      }
    } catch (error) {
      console.log('No stored data found');
    }
  };

  const saveToStorage = async () => {
    try {
      if (user) {
        await window.storage.set('banana_user', JSON.stringify(user));
      }
      await window.storage.set('banana_chats', JSON.stringify(chats));
      await window.storage.set('banana_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Storage error:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (authMode === 'signup') {
      if (!authForm.name || !authForm.email || !authForm.password) {
        alert('Please fill in all fields');
        return;
      }
      
      const newUser = {
        id: Date.now().toString(),
        name: authForm.name,
        email: authForm.email,
        password: authForm.password,
        createdAt: new Date().toISOString()
      };
      
      setUser(newUser);
      setIsAuthenticated(true);
      setShowAuthModal(false);
      await window.storage.set('banana_user', JSON.stringify(newUser));
    } else {
      try {
        const userData = await window.storage.get('banana_user');
        if (userData && userData.value) {
          const storedUser = JSON.parse(userData.value);
          if (storedUser.email === authForm.email && storedUser.password === authForm.password) {
            setUser(storedUser);
            setIsAuthenticated(true);
            setShowAuthModal(false);
          } else {
            alert('Invalid credentials');
          }
        } else {
          alert('No account found. Please sign up first.');
        }
      } catch (error) {
        alert('Login failed');
      }
    }
    
    setAuthForm({ email: '', password: '', name: '' });
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setShowAuthModal(true);
    setUser(null);
    setChats([]);
    setMessages([]);
    setCurrentChatId(null);
  };

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      messages: []
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
    setMessages([]);
  };

  const deleteChat = (chatId) => {
    setChats(chats.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
  };

  const selectChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages || []);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (!currentChatId) {
      createNewChat();
    }

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      if (!settings.apiKey) {
        alert('Please set your Anthropic API key in settings.');
        setIsLoading(false);
        return;
      }

      const systemPrompt = 'You are BnanaB, a highly intelligent and helpful AI assistant. You are expert at everything including coding, writing, problem-solving, and general knowledge. You provide clear, accurate, and detailed responses. When writing code, always provide complete, working solutions with proper explanations.';

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: settings.maxTokens,
          temperature: settings.temperature,
          system: systemPrompt,
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();
      
      if (data.content) {
        const assistantMessage = {
          role: 'assistant',
          content: data.content[0].text,
          timestamp: new Date().toISOString()
        };

        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);

        const chatToUpdate = chats.find(c => c.id === currentChatId);
        if (chatToUpdate) {
          const title = input.slice(0, 50) + (input.length > 50 ? '...' : '');
          const updatedChats = chats.map(c =>
            c.id === currentChatId
              ? { ...c, messages: updatedMessages, title: c.title === 'New Chat' ? title : c.title }
              : c
          );
          setChats(updatedChats);
        }
      }
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const exportChat = () => {
    const chatData = {
      title: chats.find(c => c.id === currentChatId)?.title || 'Chat',
      messages: messages,
      exportedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chat-export-' + Date.now() + '.json';
    link.click();
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const content = message.content;

    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'code', language: match[1] || 'text', content: match[2].trim() });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return (
      <div key={index} className={'flex ' + (isUser ? 'justify-end' : 'justify-start') + ' mb-4'}>
        <div className={'max-w-3xl ' + (isUser ? 'bg-yellow-400' : 'bg-gray-100') + ' rounded-lg p-4'}>
          {parts.length > 0 ? parts.map((part, i) => (
            part.type === 'code' ? (
              <div key={i} className="my-2 bg-gray-900 rounded-lg overflow-hidden">
                <div className="flex justify-between items-center px-4 py-2 bg-gray-800">
                  <span className="text-gray-300 text-sm uppercase">{part.language}</span>
                  <button
                    onClick={() => copyCode(part.content)}
                    className="text-gray-300 hover:text-white text-sm"
                  >
                    Copy
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto">
                  <code className="text-green-400 text-sm">{part.content}</code>
                </pre>
              </div>
            ) : (
              <p key={i} className="whitespace-pre-wrap">{part.content}</p>
            )
          )) : <p className="whitespace-pre-wrap">{content}</p>}
        </div>
      </div>
    );
  };

  if (showAuthModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-6">
            <span className="text-4xl">🍌</span>
            <h1 className="text-3xl font-bold text-yellow-500 ml-2">BnanaB</h1>
          </div>
          
          <div className="flex mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={'flex-1 py-2 rounded-l-lg ' + (authMode === 'login' ? 'bg-yellow-400 text-white' : 'bg-gray-200')}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={'flex-1 py-2 rounded-r-lg ' + (authMode === 'signup' ? 'bg-yellow-400 text-white' : 'bg-gray-200')}
            >
              Sign Up
            </button>
          </div>

          <div>
            {authMode === 'signup' && (
              <div className="mb-4">
                <label className="flex items-center text-gray-700 mb-2">
                  <User size={18} className="mr-2" />
                  Name
                </label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Your name"
                />
              </div>
            )}
            
            <div className="mb-4">
              <label className="flex items-center text-gray-700 mb-2">
                <Mail size={18} className="mr-2" />
                Email
              </label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="your@email.com"
              />
            </div>

            <div className="mb-6">
              <label className="flex items-center text-gray-700 mb-2">
                <Lock size={18} className="mr-2" />
                Password
              </label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth(e)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={handleAuth}
              className="w-full bg-yellow-400 text-white py-3 rounded-lg hover:bg-yellow-500 transition-colors font-semibold"
            >
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Settings</h2>
            <button onClick={() => setShowSettings(false)}>
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 mb-2 font-semibold">AI Model</label>
              <div className="w-full px-4 py-3 border rounded-lg bg-gray-50">
                <div className="flex items-center">
                  <Brain className="w-5 h-5 text-yellow-500 mr-2" />
                  <span className="font-semibold">BnanaB AI</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Custom AI engine optimized for all tasks</p>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Temperature: {settings.temperature}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Lower = more focused, Higher = more creative</p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Max Tokens</label>
              <input
                type="number"
                value={settings.maxTokens}
                onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="flex items-center text-gray-700 mb-2 font-semibold">
                <Lock size={18} className="mr-2" />
                Anthropic API Key
              </label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="sk-ant-..."
              />
              <p className="text-xs text-gray-500 mt-1">Required for AI responses. Get from Anthropic dashboard.</p>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">User</label>
              <p className="text-gray-600">{user && user.name} ({user && user.email})</p>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(false)}
            className="w-full mt-6 bg-yellow-400 text-white py-3 rounded-lg hover:bg-yellow-500"
          >
            Save Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className={'transition-all duration-300 bg-gradient-to-b from-yellow-400 to-yellow-500 flex flex-col ' + (sidebarOpen ? 'w-64' : 'w-0 overflow-hidden')}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl">🍌</span>
            <h1 className="text-xl font-bold text-white ml-2">BnanaB</h1>
          </div>
        </div>

        <button
          onClick={createNewChat}
          className="mx-4 mb-4 bg-white text-yellow-600 py-3 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          New Chat
        </button>

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => selectChat(chat.id)}
              className={'p-3 rounded-lg cursor-pointer flex justify-between items-center group ' + (currentChatId === chat.id ? 'bg-white bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20')}
            >
              <span className="text-white text-sm truncate flex-1">{chat.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} className="text-white" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={() => currentChatId && exportChat()}
            className="w-full flex items-center text-white hover:bg-white hover:bg-opacity-20 p-3 rounded-lg transition-colors"
          >
            <Download size={18} className="mr-2" />
            Export Chat
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center text-white hover:bg-white hover:bg-opacity-20 p-3 rounded-lg transition-colors"
          >
            <Settings size={18} className="mr-2" />
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center text-white hover:bg-white hover:bg-opacity-20 p-3 rounded-lg transition-colors"
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={24} />
          </button>
          <div className="flex items-center">
            <span className="text-gray-600">Welcome, {user && user.name}!</span>
            <div className="ml-4 flex items-center bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-semibold">
              <Brain size={16} className="mr-2" />
              BnanaB AI
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <span className="text-6xl">🍌</span>
              <h2 className="text-2xl font-bold mt-4">Welcome to BnanaB!</h2>
              <p className="mt-2">Your intelligent AI assistant powered by BnanaB AI</p>
              <p className="mt-1 text-sm">Ask me anything - I'm here to help!</p>
            </div>
          ) : (
            messages.map((msg, idx) => renderMessage(msg, idx))
          )}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything..."
              className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-yellow-400 text-white p-3 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BananaGPT;
