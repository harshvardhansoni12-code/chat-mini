"use client";

export function MemberList({ members, currentUserId }) {
  if (!members || members.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        <p className="font-semibold mb-2">Members (0)</p>
        <p className="text-sm">No members in this room</p>
      </div>
    );
  }

  const currentUser = members.find((m) => m.userId === currentUserId);
  const otherMembers = members.filter((m) => m.userId !== currentUserId);

  return (
    <div className="w-64 bg-white border-l border-gray-200 p-4 h-screen overflow-y-auto">
      <p className="font-semibold mb-3">Members ({members.length})</p>

      {currentUser && (
        <div className="mb-3 pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium">{currentUser.userName}</p>
              <p className="text-xs text-gray-500">(You)</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {otherMembers.map((member) => (
          <div key={member.userId} className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="text-sm">{member.userName || "Anonymous"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
