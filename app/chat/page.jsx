"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Send,
  MoreVertical,
  Trash2,
  Image,
  User,
  Phone,
  Video,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";

const MessagingPage = () => {
  const router = useRouter();

  // State management
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Fixed variable name

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Custom toast implementation
  const toast = {
    success: (message) => {
      console.log("SUCCESS:", message);
      // You can replace this with a proper toast component
    },
    error: (message) => {
      console.error("ERROR:", message);
      // You can replace this with a proper toast component
    },
  };

  // Fixed logout function
  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent double clicks

    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Logged out successfully");
        router.push("/login"); // Better to redirect to login page
      } else {
        const data = await response.json();
        toast.error(data.message || "Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Network error during logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch contacts on component mount
  useEffect(() => {
    fetchContacts();
    getCurrentUser();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== undefined) {
        fetchContacts();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Get current user info
  const getCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      } else if (response.status === 401) {
        // Not authenticated, redirect to login
        router.push("/login");
      }
    } catch (error) {
      console.error("Failed to get current user:", error);
      toast.error("Failed to get user info");
    }
  };

  // Fetch all contacts
  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/users?search=${encodeURIComponent(searchQuery)}&excludeSelf=true`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch contacts");
      }

      const data = await response.json();
      if (data.success && data.data?.users) {
        setContacts(data.data.users);
      } else {
        throw new Error(data.message || "Invalid response format");
      }
    } catch (error) {
      toast.error("Failed to load contacts");
      console.error("Fetch contacts error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages with selected user
  const fetchMessages = async (userId) => {
    if (!userId) return;

    try {
      const response = await fetch(
        `/api/messages/user/${userId}?page=1&limit=50`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      if (data.success && data.data?.messages) {
        setMessages(data.data.messages);
      } else {
        throw new Error(data.message || "Invalid response format");
      }
    } catch (error) {
      toast.error("Failed to load messages");
      console.error("Fetch messages error:", error);
    }
  };

  // Handle contact selection
  const selectUser = (user) => {
    setSelectedUser(user);
    fetchMessages(user.id);
    if (isMobile) {
      setShowMobileChat(true);
    }
  };

  // Send message
  const sendMessage = async (type = "TEXT", content = null) => {
    if (
      (!newMessage.trim() && type === "TEXT") ||
      !selectedUser ||
      sendingMessage
    )
      return;

    setSendingMessage(true);
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          toId: selectedUser.id,
          text: type === "TEXT" ? newMessage.trim() : null,
          type: type,
          imageUrl: type === "IMAGE" ? content : null,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send message");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setMessages((prev) => [...prev, data.data]);
        setNewMessage("");
        toast.success("Message sent!");
      } else {
        throw new Error(data.message || "Invalid response");
      }
    } catch (error) {
      toast.error(error.message || "Failed to send message");
      console.error("Send message error:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      // In a real app, you'd upload to cloud storage first
      // For now, we'll create a temporary URL
      const imageUrl = URL.createObjectURL(file);
      sendMessage("IMAGE", imageUrl);
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/messages/delete?messageId=${messageId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete message");
      }

      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      toast.success("Message deleted");
    } catch (error) {
      toast.error(error.message || "Failed to delete message");
      console.error("Delete message error:", error);
    }
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter(
    (contact) =>
      contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format time
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";

      const now = new Date();
      const diff = now - date;

      if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Left Sidebar - Contacts */}
      <div
        className={`bg-white border-r border-gray-200 flex flex-col ${
          isMobile ? (showMobileChat ? "hidden" : "w-full") : "w-80"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Loading contacts...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No contacts found
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => selectUser(contact)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedUser?.id === contact.id
                    ? "bg-purple-50 border-purple-200"
                    : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={contact.profileUrl}
                    alt={contact.name}
                    className="w-12 h-12 rounded-full"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        contact.name
                      )}&background=6366f1&color=ffffff&size=128`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {contact.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {contact.email}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Messages */}
      <div
        className={`flex-1 flex flex-col ${
          isMobile ? (showMobileChat ? "w-full" : "hidden") : ""
        }`}
      >
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isMobile && (
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <img
                  src={selectedUser.profileUrl}
                  alt={selectedUser.name}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      selectedUser.name
                    )}&background=6366f1&color=ffffff&size=128`;
                  }}
                />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedUser.name}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  No messages yet. Start a conversation!
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.from?.id === currentUser?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isOwnMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group ${
                          isOwnMessage
                            ? "bg-purple-600 text-white"
                            : "bg-white text-gray-800 border"
                        }`}
                      >
                        {message.type === "TEXT" ? (
                          <p className="text-sm">{message.text}</p>
                        ) : (
                          <img
                            src={message.imageUrl}
                            alt="Shared image"
                            className="rounded max-w-full h-auto"
                            onError={(e) => {
                              e.target.src =
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='0.3em' font-family='sans-serif' font-size='16' fill='%236b7280'%3EImage not found%3C/text%3E%3C/svg%3E";
                            }}
                          />
                        )}
                        <p
                          className={`text-xs mt-1 ${
                            isOwnMessage ? "text-purple-200" : "text-gray-500"
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </p>

                        {/* Delete button (only for own messages) */}
                        {isOwnMessage && (
                          <button
                            onClick={() => deleteMessage(message.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                  title="Upload image"
                >
                  <Image className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && !e.shiftKey && sendMessage()
                  }
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={sendingMessage}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No Chat Selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500">
                Choose a contact from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingPage;
