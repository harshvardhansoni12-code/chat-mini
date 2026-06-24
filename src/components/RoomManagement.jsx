"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { CreateRoomForm } from "@/components/CreateRoomForm";
import { JoinRoomForm } from "@/components/JoinRoomForm";

const AVATAR_GRADIENTS = [
  "avatar-gradient-1",
  "avatar-gradient-2",
  "avatar-gradient-3",
  "avatar-gradient-4",
  "avatar-gradient-5",
  "avatar-gradient-6",
];

function getAvatarGradient(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function RoomManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [activeTab, setActiveTab] = useState("list"); // list, create, join

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchRooms();
    }
  }, [status]);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const res = await fetch("/api/rooms/list-room");
      const data = await res.json();

      if (res.ok) {
        setRooms(data.rooms || []);
      } else {
        console.error(data.message);
      }
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleRoomCreated = () => {
    fetchRooms();
  };

  const handleRoomJoined = () => {
    fetchRooms();
  };

  const handleEnterRoom = (roomId) => {
    router.push(`/chat/${roomId}`);
  };

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-3 border-gray-200 border-t-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const tabs = [
    { id: "list", label: "Chats", icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )},
    { id: "create", label: "Create", icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    )},
    { id: "join", label: "Join", icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    )},
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className={`w-10 h-10 rounded-full ${getAvatarGradient(session?.user?.name)} flex items-center justify-center shadow-sm`}>
              <span className="text-white text-sm font-semibold">{getInitials(session?.user?.name)}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Chat</h1>
              <p className="text-xs text-gray-500">
                {session?.user?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSignOut}
              className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-5 flex gap-1 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-5 py-6">
        {/* My Rooms Tab */}
        {activeTab === "list" && (
          <div className="animate-fade-in">
            {loadingRooms ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded shimmer" />
                      <div className="h-3 w-20 rounded shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">No chats yet</h3>
                <p className="text-gray-500 text-sm mb-6">Create a room or join one to start chatting</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setActiveTab("create")}
                    className="px-5 py-2.5 rounded-xl btn-primary text-sm font-medium"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => setActiveTab("join")}
                    className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-medium"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((room, index) => (
                  <button
                    key={room.id}
                    onClick={() => handleEnterRoom(room.id)}
                    className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 card-hover border border-gray-100 text-left group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Room Avatar */}
                    <div className={`w-12 h-12 rounded-full ${getAvatarGradient(room.roomname)} flex items-center justify-center shrink-0 shadow-sm`}>
                      <span className="text-white text-sm font-semibold">{getInitials(room.roomname)}</span>
                    </div>

                    {/* Room Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="text-[15px] font-semibold text-gray-900 truncate">
                          {room.roomname}
                        </h3>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {room.roomcode}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {room._count?.members || 0} member{(room._count?.members || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Room Tab */}
        {activeTab === "create" && (
          <div className="flex justify-center animate-slide-up">
            <CreateRoomForm onRoomCreated={handleRoomCreated} />
          </div>
        )}

        {/* Join Room Tab */}
        {activeTab === "join" && (
          <div className="flex justify-center animate-slide-up">
            <JoinRoomForm onRoomJoined={handleRoomJoined} />
          </div>
        )}
      </div>
    </div>
  );
}
