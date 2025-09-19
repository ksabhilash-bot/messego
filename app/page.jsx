import Link from "next/link";
import { Squares } from "@/components/ui/squares-background";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden relative bg-[#060606]">
      {/* Squares Background */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <Squares
          direction="diagonal"
          speed={0.5}
          squareSize={40}
          borderColor="#4C1D95" // Purple border to match theme
          hoverFillColor="#5B21B6" // Purple hover effect
          className="opacity-70" // Increased opacity for better visibility
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        <main className="max-w-md w-full bg-black/20 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Messego</h1>
            <p className="text-purple-200 text-lg">
              Connect with friends and family through seamless, secure
              messaging.
            </p>
          </div>

          <div className="bg-white/5 p-6 rounded-xl mb-8">
            <p className="text-purple-100 text-center">
              Messego offers end-to-end encryption, group chats, media sharing,
              and much more - all wrapped in a beautiful, intuitive interface.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-colors border border-white/10 text-center"
            >
              Sign Up
            </Link>
          </div>
        </main>

        <footer className="mt-12 text-center">
          <p className="text-purple-300 text-sm">
            © {new Date().getFullYear()} Messego. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
