import React from 'react'
import { Link } from 'react-router-dom'

import { ATFQLogoText } from '@/assets/icons/ATFQLogoText'
import { Mail } from '@/assets/icons/Mail'
import { Github } from '@/assets/icons/Github'
import { Linkedin } from '@/assets/icons/Linkedin'
import { Instagram } from '@/assets/icons/Instagram'

function SocialLink({ to, Icon }: { to: string, Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>> }) {
  return (
    <Link to={to} className="group transition-transform hover:-translate-y-0.5 duration-200">
      <Icon className="w-6 h-6 text-sub group-hover:text-main transition-colors" />
    </Link>
  )
}

export function Footer() {
  return (
    <footer className="w-full border-main/10 bg-bg mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-end justify-between p-8 md:px-8 gap-8">

        {/* LEFT: LOGO & COPYRIGHT */}
        <div className="flex flex-col gap-4 items-center md:items-start text-center md:text-left">
          <Link to="/">
            <ATFQLogoText className="w-28 h-auto text-main opacity-80" />
          </Link>
          <p className="text-[9px] font-mono uppercase text-sub">
            © 2026 ATFQ. All rights reserved.
          </p>
        </div>

        {/* CENTER: LEGAL LINKS */}
        <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-sub">
          <Link to="/terms" className="hover:text-main transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-main transition-colors">Privacy</Link>
        </div>

        {/* RIGHT: SOCIALS */}
        <div className="flex items-center gap-6">
          <SocialLink to="/" Icon={Mail} />
          <SocialLink to="/" Icon={Github} />
          <SocialLink to="/" Icon={Linkedin} />
          <SocialLink to="/" Icon={Instagram} />
        </div>
      </div>
    </footer>
  )
}
