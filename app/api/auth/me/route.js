// app/api/auth/me/route.js
import { NextResponse } from "next/server";
import { withAuth, getUser } from "@/lib/auth";

// Get current authenticated user
export const GET = withAuth(async function (request) {
  try {
    const user = getUser(request);

    return NextResponse.json({
      success: true,
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
        profileUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.name
        )}&background=6366f1&color=ffffff&size=128`,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get user info" },
      { status: 500 }
    );
  }
});
