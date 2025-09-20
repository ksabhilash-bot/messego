// app/api/messages/delete/route.js
import { NextResponse } from "next/server";
import { withAuth, getUser } from "@/lib/auth";
import { PrismaClient } from "../../../generated/prisma";
import  cloudinary  from "@/lib/cloudinary";

const prisma = new PrismaClient();

// Delete message (DELETE)
export const DELETE = withAuth(async function (request) {
  try {
    const user = getUser(request);
    const url = new URL(request.url);
    const messageId = url.searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { success: false, message: "Message ID is required" },
        { status: 400 }
      );
    }

    // Check if message exists and user has permission
    const message = await prisma.message.findUnique({
      where: {
        id: parseInt(messageId),
        deletedAt: null, // Only find non-deleted messages
      },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, message: "Message not found" },
        { status: 404 }
      );
    }

    // Check if user is the sender (only sender can delete)
    if (message.fromId !== user.userId) {
      return NextResponse.json(
        { success: false, message: "You can only delete your own messages" },
        { status: 403 }
      );
    }

    // Delete image from Cloudinary if it's an image message
    if (message.type === "IMAGE" && message.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(message.imagePublicId);
        console.log(`Deleted image from Cloudinary: ${message.imagePublicId}`);
      } catch (cloudinaryError) {
        console.error("Cloudinary deletion error:", cloudinaryError);
        // Don't fail the whole operation if Cloudinary deletion fails
        // The message will still be deleted from database
      }
    }

    // Soft delete - set deletedAt timestamp
    const deletedMessage = await prisma.message.update({
      where: { id: parseInt(messageId) },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully",
      data: { messageId: deletedMessage.id },
    });
  } catch (error) {
    console.error("Delete message error:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Message not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to delete message" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// Bulk delete messages for a user (DELETE with body)
export const POST = withAuth(async function (request) {
  try {
    const user = getUser(request);
    const body = await request.json();
    const { messageIds } = body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json(
        { success: false, message: "Message IDs array is required" },
        { status: 400 }
      );
    }

    // Verify all messages belong to the user and get image data
    const messages = await prisma.message.findMany({
      where: {
        id: { in: messageIds.map((id) => parseInt(id)) },
        fromId: user.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        type: true,
        imagePublicId: true,
      },
    });

    if (messages.length !== messageIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Some messages not found or not owned by you",
        },
        { status: 403 }
      );
    }

    // Delete images from Cloudinary for image messages
    const imageMessages = messages.filter(
      (msg) => msg.type === "IMAGE" && msg.imagePublicId
    );

    if (imageMessages.length > 0) {
      try {
        // Bulk delete images from Cloudinary
        const publicIds = imageMessages.map((msg) => msg.imagePublicId);
        const deleteResult = await cloudinary.api.delete_resources(publicIds);
        console.log("Cloudinary bulk delete result:", deleteResult);
      } catch (cloudinaryError) {
        console.error("Cloudinary bulk deletion error:", cloudinaryError);
        // Don't fail the whole operation if Cloudinary deletion fails
      }
    }

    // Bulk soft delete
    const deletedMessages = await prisma.message.updateMany({
      where: {
        id: { in: messageIds.map((id) => parseInt(id)) },
        fromId: user.userId,
      },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `${deletedMessages.count} messages deleted successfully`,
      data: {
        deletedCount: deletedMessages.count,
        imagesDeleted: imageMessages.length,
      },
    });
  } catch (error) {
    console.error("Bulk delete messages error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete messages" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});
