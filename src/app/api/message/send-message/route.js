export async function POST(request) {
  const { message } = await request.json();
  //
  // Here you would typically handle the message, e.g., save it to a database or send it to a messaging service.
  console.log("Received message:", message);
  return new Response(JSON.stringify({ status: "Message received", message }), {
    headers: { "Content-Type": "application/json" },
  });
}
