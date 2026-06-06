export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    // example: read roomId and memberId from query
    const roomId = searchParams.get("roomId");
    const memberId = searchParams.get("memberId");
    return Response.json({ roomId, memberId });
  } catch (error) {
    return Response.json({ message: "internal server error" }, { status: 500 });
  }
}
