<h1 align="left">
  <img src="Assets/DevPrint (Squircle).png" width="33" style="vertical-align: middle; margin-right: 10px;">
  DevPrint
</h1>

DevPrint analyzes a GitHub profile and generates a clean developer report. It highlights impact, stack focus, activity, and contact information in one place, then produces an AI-powered recruiter overview. This project was built as my submission for <i>Remote Hustle's</i> Developer Challenge (RHDC).

---

## Why I Built This

I was recruited for this program (RHDC) through GitHub, and that moment stuck with me.  

DevPrint began with a simple question: **can recruitment be streamlined through instant profile analysis?**  

DevPrint does exactly that and more. It not only analyzes repositories and activity, but also scans bios and READMEs for ways to get in touch, giving recruiters a complete snapshot in seconds.

---

## Who This Is For

- **Recruiters** who need a concise snapshot of a developer profile  
- **Hiring managers** who want a quick read before a deeper review  
- **Developers** who want a clean, shareable profile report  

---

## Core Features

- AI-powered recruiter summary  
- Profile overview with clean metadata and contact links (from READMEs and bios)  
- Impact score with clear breakdown of stars, forks, followers, and activity  
- Language mix visualization with animated bars  
- Developer archetype classification  
- Recruiter snapshot with automatic fallback if the summary service is unavailable  
- Shareable report links  

---

## How It Works

1. Pulls public GitHub profile and repository data  
2. Extracts language usage from recent repositories  
3. Computes an impact score from stars, forks, followers, and activity  
4. Generates an AI recruiter overview using a serverless summary endpoint, with local fallback if needed  

---

## Try It

Run an analysis on any public GitHub username to generate a full developer report - [DevPrint](https://devprint.vercel.app)

---

## Upcoming Features

- Add deeper activity insights (commit frequency, contribution graph)  
- Expand recruiter summaries with role-specific recommendations  
- Support private repositories via OAuth (optional)  
- Export reports in PDF or Markdown for easy sharing  
  
  **Community feedback welcome: open an issue, use DevPrint to find my contact info, or click the icons on my profile README** 

---

## License

MIT License – free to use, modify, and share.  
I 💖 open source.