# Exported Template Repository

This folder contains a minimal, non-personal export of the site suitable for publishing to GitHub.

What was included
- `assets/`, `docs/`, `img/`, `includes/`, `Quiz/`
- `SiteUpdater3.py`, `navbarupdater.py`, `index.html`, `course-template.html`

Before pushing
- Review the files in this `export/` folder and remove any personal pages or data.
- Optionally edit `.gitignore` to add other files to exclude.

Quick push commands

```bash
cd export
git init
git add .
git commit -m "Initial export: public template"
# add remote and push
git remote add origin <your-git-remote-url>
git push -u origin main
```

If you'd like, I can initialize a repo and push for you — provide a GitHub repo URL and credentials/token with appropriate permissions.
