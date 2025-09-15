import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new NextResponse(JSON.stringify({ message: "Method Not Allowed" }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new NextResponse(JSON.stringify({ message: "User ID is required." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Initialize Supabase client with the Service Role Key for server-side operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete the user from auth.users.
    // Due to ON DELETE CASCADE, this will also delete associated profiles and subscriptions.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting user from Supabase:", deleteError);
      return new NextResponse(JSON.stringify({ message: deleteError.message || "Failed to delete user." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return NextResponse.json({ message: "User and associated data deleted successfully." });
  } catch (error: any) {
    console.error("Error in /api/delete-user:", error);
    return new NextResponse(JSON.stringify({ message: error.message || "Internal Server Error" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}