// app/api/auth/signup/route.js
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../../../generated/prisma";

// Initialize Prisma Client
const prisma = new PrismaClient();

// Validation functions (server-side validation)
const validateName = (name) => {
  if (!name || typeof name !== 'string') return "Name is required";
  const trimmedName = name.trim();
  if (trimmedName.length < 2) return "Name must be at least 2 characters";
  if (trimmedName.length > 50) return "Name must be less than 50 characters";
  if (!/^[a-zA-Z\s]+$/.test(trimmedName)) return "Name can only contain letters and spaces";
  return null;
};

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return "Email is required";
  const trimmedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) return "Please enter a valid email address";
  return null;
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 100) return "Password must be less than 100 characters";
  if (!/(?=.*[a-z])/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/(?=.*[A-Z])/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/(?=.*\d)/.test(password)) return "Password must contain at least one number";
  if (!/(?=.*[@$!%*?&])/.test(password)) return "Password must contain at least one special character";
  return null;
};

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { name, email, password } = body;

    // Validate input
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    const validationErrors = {};
    if (nameError) validationErrors.name = nameError;
    if (emailError) validationErrors.email = emailError;
    if (passwordError) validationErrors.password = passwordError;

    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation failed", 
          errors: validationErrors 
        },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedName = name.trim();
    const sanitizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Email already exists",
          errors: { email: "An account with this email already exists" }
        },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: sanitizedName,
        email: sanitizedEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      }
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: user
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Signup error:", error);

    // Handle specific Prisma errors
    if (error.code === 'P2002') { // Prisma unique constraint error
      return NextResponse.json(
        { 
          success: false, 
          message: "Email already exists",
          errors: { email: "An account with this email already exists" }
        },
        { status: 409 }
      );
    }

    // Handle database connection errors
    if (error.code === 'P1001') {
      return NextResponse.json(
        { 
          success: false, 
          message: "Database connection failed. Please try again later." 
        },
        { status: 503 }
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid JSON format" 
        },
        { status: 400 }
      );
    }

    // Generic server error
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error. Please try again later." 
      },
      { status: 500 }
    );
  } finally {
    // Disconnect Prisma Client
    await prisma.$disconnect();
  }
}

// Handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      message: "Method not allowed" 
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      success: false, 
      message: "Method not allowed" 
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      message: "Method not allowed" 
    },
    { status: 405 }
  );
}