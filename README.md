# DevPrint

DevPrint turns a GitHub profile into a clear developer snapshot. It summarizes impact, stack focus, and activity in one place, then produces a recruiter-ready brief.

## Why I Built This
I was recruited through GitHub. That moment stuck with me. DevPrint is my answer to a simple question: can a profile tell a clean story without forcing anyone to scan dozens of repos?

## Who This Is For
- Recruiters who need a fast, reliable first pass
- Hiring managers who want a quick read before a deeper review
- Developers who want a shareable snapshot

## Core Features
- Profile overview with clean metadata and contact links
- Impact breakdown with a transparent scoring summary
- Language mix visualization with animated bars
- Developer type classification
- Recruiter brief with a graceful fallback if the summary service is off
- Pronoun aware copy when listed in a bio
- Shareable report link (snapshot based)

## How It Works
- Pulls public GitHub profile and repo data
- Extracts language usage from recent repos
- Computes impact from stars, forks, followers, and activity
- Generates a short recruiter brief via a serverless summary endpoint (or a local fallback)