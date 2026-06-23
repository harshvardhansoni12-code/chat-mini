"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { CreateRoomForm } from "@/components/CreateRoomForm";
import { JoinRoomForm } from "@/components/JoinRoomForm";

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Chat Rooms</h1>
            <p className="text-gray-600 text-sm">
              Welcome, {session?.user?.name}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 flex gap-4">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === "list"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            My Rooms
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === "create"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setActiveTab("join")}
            className={`px-4 py-3 font-medium border-b-2 transition ${
              activeTab === "join"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            Join Room
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* My Rooms Tab */}
        {activeTab === "list" && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Rooms</h2>

            {loadingRooms ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading rooms...</p>
                </div>
              </div>
            ) : rooms.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600 mb-4">No rooms yet</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  Create Your First Room
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                  >
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {room.roomname}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Code:{" "}
                      <span className="font-mono font-semibold text-gray-800">
                        {room.roomcode}
                      </span>
                    </p>
                    <p className="text-gray-500 text-xs mb-4">
                      {room._count?.members || 0} member
                      {room._count?.members !== 1 ? "s" : ""}
                    </p>
                    <button
                      onClick={() => handleEnterRoom(room.id)}
                      className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
                    >
                      Enter Room
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Room Tab */}
        {activeTab === "create" && (
          <div className="flex justify-center">
            <CreateRoomForm onRoomCreated={handleRoomCreated} />
          </div>
        )}

        {/* Join Room Tab */}
        {activeTab === "join" && (
          <div className="flex justify-center">
            <JoinRoomForm onRoomJoined={handleRoomJoined} />
          </div>
        )}
      </div>
    </div>
  );
}
