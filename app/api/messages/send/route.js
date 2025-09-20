// app/api/messages/send/route.js
import { NextResponse } from "next/server";
import { withAuth, getUser } from "@/lib/auth";
import { PrismaClient } from "../../../generated/prisma";

const prisma = new PrismaClient();

// Send message (POST)
export const POST = withAuth(async function (request) {
  try {
    const user = getUser(request);
    const body = await request.json();
    const { toId, text, type = "TEXT", imageUrl } = body;

    // Validation
    if (!toId) {
      return NextResponse.json(
        { success: false, message: "Receiver ID is required" },
        { status: 400 }
      );
    }

    // Validate message content
    if (type === "TEXT" && !text) {
      return NextResponse.json(
        { success: false, message: "Text message cannot be empty" },
        { status: 400 }
      );
    }

    if (type === "IMAGE" && !imageUrl) {
      return NextResponse.json(
        { success: false, message: "Image URL is required for image messages" },
        { status: 400 }
      );
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: parseInt(toId) },
    });

    if (!receiver) {
      return NextResponse.json(
        { success: false, message: "Receiver not found" },
        { status: 404 }
      );
    }

    // Prevent self-messaging (optional)
    if (user.userId === parseInt(toId)) {
      return NextResponse.json(
        { success: false, message: "Cannot send message to yourself" },
        { status: 400 }
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        fromId: user.userId,
        toId: parseInt(toId),
        text: type === "TEXT" ? text : null,
        type: type,
        imageUrl: type === "IMAGE" ? imageUrl : null,
      },
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
    });

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);

    // Handle Prisma specific errors
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Database constraint error" },
        { status: 400 }
      );
    }

    if (error.code === "P2003") {
      return NextResponse.json(
        { success: false, message: "Invalid user reference" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to send message" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});
