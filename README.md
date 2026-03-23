<h1 align="left">
  <img src="Assets/DevPrint (Squircle).png" width="33" style="vertical-align: middle; margin-right: 10px;">
  DevPrint
</h1>

DevPrint analyzes a GitHub profile and generates a clean developer report. It summarizes impact, stack focus, activity, and contact information in one place, then produces a recruiter-ready brief.

## Why I Built This

I was recruited for this program through GitHub. That moment stuck with me.

DevPrint started with a simple question: **can a GitHub profile reveal a developer’s work at a glance, without scanning dozens of repos?**

## Who This Is For

- Recruiters who need a fast first pass on a developer profile  
- Hiring managers who want a quick read before a deeper review  
- Developers who want a clean, shareable profile report  

## Core Features

- Profile overview with clean metadata and contact links  
- Impact breakdown with a transparent scoring summary  
- Language mix visualization with animated bars  
- Developer type classification  
- Recruiter brief with a graceful fallback if the summary service is unavailable  
- Pronoun-aware copy when listed in a bio  
- Shareable report links (snapshot-based)

## How It Works

- Pulls public GitHub profile and repository data  
- Extracts language usage from recent repositories  
- Computes an impact score from stars, forks, followers, and activity  
- Generates a short recruiter brief via a serverless summary endpoint (with a local fallback)

## Try It

Run an analysis on any public GitHub username to generate a full developer report. Click this link to do so - [DevPrint](https://devprint.vercel.app)
