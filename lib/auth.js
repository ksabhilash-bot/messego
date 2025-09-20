// lib/auth.js
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { NextResponse } from "next/server";

/**
 * Verify JWT token from cookies
 * @param {Request} request - Next.js request object
 * @returns {Object} - { success: boolean, user?: object, error?: string }
 */
export function verifyToken(request) {
  try {
    // Parse cookies from request headers
    const cookies = cookie.parse(request.headers.get("cookie") || "");
    const token = cookies.messego;

    if (!token) {
      return {
        success: false,
        error: "No authentication token found",
      };
    }

    // Verify JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined");
      return {
        success: false,
        error: "Server configuration error",
      };
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return {
      success: true,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      },
    };
  } catch (error) {
    console.error("Token verification error:", error);

    // Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      return {
        success: false,
        error: "Token has expired",
      };
    }

    if (error.name === "JsonWebTokenError") {
      return {
        success: false,
        error: "Invalid token",
      };
    }

    return {
      success: false,
      error: "Token verification failed",
    };
  }
}

/**
 * Authentication middleware for API routes
 * Use this in your API routes that require authentication
 */
export function withAuth(handler) {
  return async function (request, context) {
    // Verify token
    const authResult = verifyToken(request);

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: authResult.error || "Authentication failed",
        },
        { status: 401 }
      );
    }

    // Add user to request context
    request.user = authResult.user;

    // Call the original handler
    return handler(request, context);
  };
}

/**
 * Extract user from request (after authentication)
 * @param {Request} request
 * @returns {Object} user object
 */
export function getUser(request) {
  return request.user;
}
