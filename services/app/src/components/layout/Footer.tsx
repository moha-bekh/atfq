import React from 'react'
import { Link } from 'react-router-dom'

import { ATFQLogoText } from '@/assets/icons/ATFQLogoText'
import { Mail } from '@/assets/icons/Mail'
import { Github } from '@/assets/icons/Github'
import { Linkedin } from '@/assets/icons/Linkedin'
import { Instagram } from '@/assets/icons/Instagram'
import { CONTACT_MAILTO } from '@/config/contact'

function SocialLink({ to, Icon }: { to: string, Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>> }) {
  const isExternal = to.startsWith('http') || to.startsWith('mailto:')
  const className = "group flex h-10 w-10 items-center justify-center rounded-lg text-main transition-all hover:-translate-y-0.5 hover:bg-main/5 hover:text-text"

  if (isExternal) {
    return (
      <a href={to} className={className} target={to.startsWith('http') ? '_blank' : undefined} rel={to.startsWith('http') ? 'noopener noreferrer' : undefined}>
        <Icon className="h-8 w-8 transition-colors" />
      </a>
    )
  }

  return (
    <Link to={to} className={className}>
      <Icon className="h-8 w-8 transition-colors" />
    </Link>
  )
}

export function Footer() {
  return (
    <footer className="w-full bg-bg mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-end justify-between px-6 py-6 sm:px-16 lg:px-24 gap-6">

        {/* LEFT: LOGO & COPYRIGHT */}
        <div className="flex flex-col gap-5 items-start text-left">
          <Link to="/">
            <ATFQLogoText className="w-[135px] h-auto text-main" />
          </Link>
          <p className="text-sm text-text/80">
            © 2026 ATFQ. All rights reserved.
          </p>
        </div>

        {/* CENTER: LEGAL LINKS */}
        <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-sub">
          <Link to="/terms" className="transition-colors hover:text-main">Terms</Link>
          <Link to="/privacy" className="transition-colors hover:text-main">Privacy</Link>
        </div>

        {/* RIGHT: SOCIALS */}
        <div className="flex items-center gap-6">
          <SocialLink to={CONTACT_MAILTO} Icon={Mail} />
          <SocialLink to="https://github.com" Icon={Github} />
          <SocialLink to="https://linkedin.com" Icon={Linkedin} />
          <SocialLink to="https://instagram.com" Icon={Instagram} />
        </div>
      </div>
    </footer>
  )
}
