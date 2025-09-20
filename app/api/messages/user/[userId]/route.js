// app/api/messages/user/[userId]/route.js
import { NextResponse } from "next/server";
import { withAuth, getUser } from "@/lib/auth";
import { PrismaClient } from "../../../../generated/prisma";

const prisma = new PrismaClient();

// Get messages with specific user (GET)
export const GET = withAuth(async function (request, { params }) {
  try {
    const currentUser = getUser(request);
    const { userId } = await params;
    const url = new URL(request.url);

    // Query parameters
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 20;
    const markAsRead = url.searchParams.get("markAsRead") !== "false"; // Default true

    const skip = (page - 1) * limit;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const otherUserId = parseInt(userId);

    // Verify the other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, name: true, email: true },
    });

    if (!otherUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Get messages between current user and specified user
    const whereClause = {
      deletedAt: null,
      OR: [
        { fromId: currentUser.userId, toId: otherUserId },
        { fromId: otherUserId, toId: currentUser.userId },
      ],
    };

    const [messages, totalCount] = await Promise.all([
      prisma.message.findMany({
        where: whereClause,
        include: {
          from: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          to: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "asc" }, // Chronological order for conversation
        skip: skip,
        take: limit,
      }),
      prisma.message.count({ where: whereClause }),
    ]);

    // Mark messages from other user as read (if markAsRead is true)
    if (markAsRead) {
      const unreadMessages = await prisma.message.updateMany({
        where: {
          fromId: otherUserId,
          toId: currentUser.userId,
          isRead: false,
          deletedAt: null,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      console.log(`Marked ${unreadMessages.count} messages as read`);
    }

    // Get unread count for this conversation
    const unreadCount = await prisma.message.count({
      where: {
        fromId: otherUserId,
        toId: currentUser.userId,
        isRead: false,
        deletedAt: null,
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        messages,
        otherUser: {
          ...otherUser,
          profileUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            otherUser.name
          )}&background=6366f1&color=ffffff&size=128`,
        },
        conversation: {
          unreadCount,
          totalMessages: totalCount,
        },
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
    console.error("Get messages with user error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch messages" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// Delete all messages with specific user (DELETE)
export const DELETE = withAuth(async function (request, { params }) {
  try {
    const currentUser = getUser(request);
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const otherUserId = parseInt(userId);

    // Verify the other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
    });

    if (!otherUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Soft delete all messages between users (only messages sent by current user)
    const deletedMessages = await prisma.message.updateMany({
      where: {
        fromId: currentUser.userId,
        toId: otherUserId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${deletedMessages.count} messages deleted successfully`,
      data: {
        deletedCount: deletedMessages.count,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          email: otherUser.email,
        },
      },
    });
  } catch (error) {
    console.error("Delete messages with user error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete messages" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});
