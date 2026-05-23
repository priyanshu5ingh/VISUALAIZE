import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Branding */}
          <div>
            <h2 className="text-2xl font-bold text-white">
              VisualAIze Pro
            </h2>

            <p className="text-gray-400 mt-3 text-sm leading-relaxed">
              AI-powered graph and diagram visualization platform
              with immersive interactive experiences.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">
              Quick Links
            </h3>

            <div className="flex flex-col gap-2 text-sm">

              <Link
                href="/"
                className="text-gray-400 hover:text-cyan-400 transition"
              >
                Home
              </Link>

              <Link
                href="/about"
                className="text-gray-400 hover:text-cyan-400 transition"
              >
                About
              </Link>

            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">
              Community
            </h3>

            <div className="flex flex-col gap-2 text-sm">

              <a
                href="https://github.com/priyanshu5ingh/VisualAIze"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-cyan-400 transition"
              >
                GitHub
              </a>

              <a
                href="mailto:support@visualaize.com"
                className="text-gray-400 hover:text-cyan-400 transition"
              >
                Contact Support
              </a>

            </div>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/10 mt-10 pt-6 text-center">

          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} VisualAIze Pro. All rights reserved.
          </p>

        </div>
      </div>
    </footer>
  );
}