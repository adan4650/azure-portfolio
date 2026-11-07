# Azure Portfolio

This project is to demonstrate my skills and my understanding of Azure. This portfolio is a collection of projects that showcase my range in Azure while I document my thought process and the steps I take through videos and written notes.

I want to show what I built, why I made certain decisions, and how I worked through problems along the way.

## The Portfolio Website

The website itself is my first project. It will give me a place to share my work while learning how to host, secure, and maintain a live website on Azure.

## Setup Completed

- Activated an Azure for Students subscription.
- Created the `azure-portfolio` resource group.
- Set up a monthly budget with spending alerts.
- Created this GitHub repository and cloned it into VS Code.
- Installed Git and configured my commit name and email.
- Built the first local version with React, TypeScript, Vite, Tailwind CSS, and GSAP.

## The Local Website

The site starts with a detailed locked vault in a black room, illuminated by a large overhead light hanging high above it. The lamp gently swings, moving its beam and the illumination across the vault. Clicking the vault starts the music and animation. Soft, translucent wisps of smoke seep through the opening, curl outward, and gradually dissipate as the heavy door opens slowly. A character in a blue puffer jacket gradually emerges from the dark interior into the light, taking two slow steps straight forward. The camera does most of the approach. The jacket is zipped over the entire face. Both hands match my skin tone: one pulls the zipper down while the other grips the edge of the zipper track and pulls it to the side as it opens. The camera gradually zooms in at the same time, and the portfolio appears through the actual hood opening. The zoom eases near the end so the page fills the screen smoothly. No face is revealed during the intro.

The homepage uses dark purple and yellow with a retro arcade feel. I wanted my gamer and tech side to come through, so it has a player-profile portrait, arcade-style buttons, and a current-mission section for my Azure work. My credentials, project progress, GitHub and LinkedIn links are still easy to find, with a separate Videos page. The video areas show a coming-soon state until I add my recordings.

Clicking the vault or pressing Enter on it starts the full intro. Skip intro goes straight to the portfolio before or during playback. Sound controls and replay are also available. The music excerpt is nine seconds, taken from 1:54–2:03 of the reference recording I supplied after removing the first five seconds of the original selection. The animation is timed to match, and the volume fade is controlled by the website.

## Run Locally

Use Node.js 22.12 or newer and pnpm 11.25.0. From the project folder:

```sh
pnpm install
pnpm dev
```

Open the local address printed in the terminal. The development server updates the page when files change.

To check the code and create the production build:

```sh
pnpm typecheck
pnpm build
```

The production files are created in `dist/`. To preview that build locally:

```sh
pnpm preview
```

## Update My Content

- `src/data/portfolio.ts` holds my name, social links, credentials, project milestones, and video collection.
- `public/assets/portrait.jpg` is the homepage portrait.
- `public/assets/vault-intro-audio.mp3` is the selected intro music excerpt.
- `src/components/VaultIntro.tsx` and `vault-intro.css` control the vault artwork, timing, and intro controls.

The homepage and Videos page use the same video collection. It supports uploaded video files, YouTube videos, and links to recordings.

## Next Steps

- Review and refine the local website and intro.
- Record and add my Azure project walkthroughs.
- Deploy it using Azure Static Web Apps.
- Connect GitHub to automate website updates.
- Register a custom domain and configure Azure DNS.
- Verify HTTPS and configure security headers.
- Set up availability monitoring.

The local build includes an Azure Static Web Apps routing configuration so direct links to pages such as `/videos` can work after deployment. Hosting, the domain, DNS, HTTPS verification, and deployment automation are still upcoming stages.

## Project Documentation

For each project, I plan to cover:

- What I’m building and what it’s meant to do.
- The Azure services I use and why I chose them.
- The steps I take to build and test it.
- Problems I run into and how I fix them.
- Costs, lessons learned, and what I would improve.

I’ll update this repository as I complete each stage and add more projects.
