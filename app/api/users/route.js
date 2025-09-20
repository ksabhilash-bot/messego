// app/api/users/route.js
import { NextResponse } from "next/server";
import { withAuth, getUser } from "@/lib/auth";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

// Get all users (GET)
export const GET = withAuth(async function (request) {
  try {
    const currentUser = getUser(request);
    const url = new URL(request.url);

    // Query parameters
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(url.searchParams.get("limit")) || 10, 50); // Max 50 users per page
    const excludeSelf = url.searchParams.get("excludeSelf") !== "false"; // Default true

    const skip = (page - 1) * limit;

    // Build where clause
    let whereClause = {};

    // Exclude current user by default
    if (excludeSelf) {
      whereClause.id = {
        not: currentUser.userId,
      };
    }

    // Search by email or name
    if (search.trim()) {
      whereClause.OR = [
        {
          email: {
            contains: search.trim(),
            mode: "insensitive", // Case insensitive search
          },
        },
        {
          name: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
      ];
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          // Add profile URL if you have it in your schema
          // profileUrl: true,
        },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        skip: skip,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    // Add profile URL placeholder (since it's not in your current schema)
    const usersWithProfile = users.map((user) => ({
      ...user,
      profileUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.name
      )}&background=6366f1&color=ffffff&size=128`,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        users: usersWithProfile,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// Get user by ID (for user details)
export const POST = withAuth(async function (request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        // Get message counts with this user
        _count: {
          select: {
            sentMessage: true,
            receivedMessage: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Add profile URL
    const userWithProfile = {
      ...user,
      profileUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.name
      )}&background=6366f1&color=ffffff&size=128`,
      messageStats: {
        totalSent: user._count.sentMessage,
        totalReceived: user._count.receivedMessage,
      },
    };

    // Remove _count from response
    delete userWithProfile._count;

    return NextResponse.json({
      success: true,
      data: { user: userWithProfile },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch user details" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});
