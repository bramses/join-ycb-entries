# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

This is a Next.js 15 application using the App Router architecture with:
- **Framework**: Next.js 15.5.4 with React 19.1.0
- **Styling**: Tailwind CSS v4 with PostCSS
- **TypeScript**: Full TypeScript support with strict mode
- **Font optimization**: Geist Sans and Geist Mono via `next/font/google`

### Architecture Overview

- **App Directory**: Uses Next.js App Router (`src/app/`)
  - `layout.tsx` - Root layout with font configuration and global styles
  - `page.tsx` - Home page component
  - `globals.css` - Global CSS with Tailwind imports and CSS custom properties
- **Path aliases**: `@/*` maps to `./src/*`
- **Build system**: Uses Turbopack for faster builds and development
- **Styling approach**: Tailwind CSS v4 with inline theme configuration using CSS custom properties for colors and fonts

### Key Configuration

- ESLint extends Next.js core web vitals and TypeScript rules
- PostCSS configured for Tailwind CSS v4
- TypeScript configured for Next.js with strict mode and path aliases
- Dark mode support via CSS custom properties and `prefers-color-scheme`