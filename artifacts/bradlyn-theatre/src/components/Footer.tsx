import { Link } from "wouter";
import { Phone, Mail, Github, Film } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 mt-12 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <p className="text-lg font-bold neon-text mb-2">🎭 Bradlyn's Theatre</p>
            <p className="text-gray-500 text-sm leading-relaxed">
              Stream movies and series, join watch rooms, and discover great content.
            </p>
          </div>

          <div>
            <p className="text-white font-medium text-sm mb-3 uppercase tracking-wider">Browse</p>
            <div className="space-y-2">
              <Link href="/"><p className="text-gray-400 hover:text-cyan-400 text-sm cursor-pointer transition-colors">Home</p></Link>
              <Link href="/browse"><p className="text-gray-400 hover:text-cyan-400 text-sm cursor-pointer transition-colors">Browse All</p></Link>
              <Link href="/search"><p className="text-gray-400 hover:text-cyan-400 text-sm cursor-pointer transition-colors">Search</p></Link>
              <Link href="/rooms"><p className="text-gray-400 hover:text-cyan-400 text-sm cursor-pointer transition-colors">Watch Rooms</p></Link>
            </div>
          </div>

          <div>
            <p className="text-white font-medium text-sm mb-3 uppercase tracking-wider">Contact</p>
            <div className="space-y-3">
              <a href="tel:+254714202681" className="flex items-center gap-2.5 text-gray-400 hover:text-cyan-400 transition-colors group">
                <span className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-500/50 transition-colors">
                  <Phone size={14} className="text-cyan-400" />
                </span>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm">+254 714 202 681</p>
                </div>
              </a>
              <a href="mailto:bradlyn021@gmail.com" className="flex items-center gap-2.5 text-gray-400 hover:text-cyan-400 transition-colors group">
                <span className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-500/50 transition-colors">
                  <Mail size={14} className="text-cyan-400" />
                </span>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm">bradlyn021@gmail.com</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} Bradlyn's Theatre. All rights reserved.</p>
          <p className="text-gray-600 text-xs">Built with ❤️ by Bradlyn</p>
        </div>
      </div>
    </footer>
  );
}
